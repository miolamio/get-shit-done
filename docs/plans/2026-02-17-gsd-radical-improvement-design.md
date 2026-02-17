# GSD Radical Improvement — Design Document

**Date:** 2026-02-17
**Approach:** Modular Evolution (incremental, backward-compatible)
**Scope:** 5 modules — test infrastructure, phase decomposition, documentation generation, skill auto-discovery, Playwright integration

---

## Context

GSD solves context rot through modular context loading, wave-based parallel execution, and structured XML task definitions. This design addresses 5 gaps identified through parallel research (5 agents):

1. **No E2E tests** — 83 unit tests cover only `gsd-tools.cjs`. Zero tests for `install.js` (1816 LOC), 30 commands, 15 workflows. ~3000+ lines of untested orchestration.
2. **Opaque task execution** — Tasks are single prompts without sub-steps. No tracing, no step-level commits, no resume from mid-task.
3. **No product documentation** — GSD generates process docs (roadmap, summaries) but not product docs (README, API, CHANGELOG, ADR).
4. **No skill ecosystem** — Monolithic npm package with no way to discover or install community extensions.
5. **No UI verification** — Web apps built by GSD have no automated visual/accessibility checks.

## Decisions

- **Playwright for GSD itself:** NOT useful (outputs are files/git, not web pages). Use `node:test`.
- **Playwright for built software:** YES — both CLI verification and Test Agents generation.
- **Documentation scope:** Full set — README, API docs, CHANGELOG, ADR, Mermaid diagrams.
- **Skill source:** claude-plugins.dev registry integration (not custom registry).
- **E2E test scope:** Incremental — infrastructure first, tests added with each change. Start with ~30.
- **Phase granularity:** Both — XML `<step>` elements inside tasks AND planner generates more smaller tasks.

---

## Module 1: Test Infrastructure (Foundation)

**Priority:** First — enables testing for all subsequent modules.

### 1.1 Mock Framework for Task() Agents

**File:** `test/mocks/task-mock.cjs`

Intercepts `Task()` calls in workflows, records parameters (subagent_type, model, prompt), returns fixtures instead of real LLM calls. Enables testing orchestration without API costs.

### 1.2 Fixture Library

```
test/fixtures/
  minimal-project/     # .planning/ with minimal set (config, STATE, ROADMAP)
  rich-project/        # Full project (5 phases, SUMMARY, VERIFICATION)
  summaries/           # Realistic SUMMARY.md with frontmatter
  plans/               # PLAN.md with varied structure (waves, checkpoints, TDD)
  verification/        # VERIFICATION.md (pass/fail variants)
```

### 1.3 Test Helpers

**File:** `test/helpers.cjs`

- `createTempProject(fixture)` — copies fixture to tmpdir with git init
- `runGsdCommand(cmd, args, cwd)` — wrapper for command execution
- `assertFileContains(path, pattern)` — content assertion
- `assertFrontmatter(path, fields)` — YAML field validation
- `getGitCommits(cwd, grep)` — git log helper
- `mockReadline(answers)` — mock interactive prompts

### 1.4 CI Pipeline

**File:** `.github/workflows/test.yml`

- Runs `npm test` on push/PR
- Node 16, 18, 20 matrix
- No real LLM calls (mock-only tests)

### 1.5 Initial Tests (~30)

- `install.js`: runtime detection (3), file copying (6), frontmatter conversion (6), patch persistence (3), uninstall (4)
- `gsd-tools.cjs` gaps: `commit` (3), `config-*` (3), error paths (2)

### Files Changed

- New: `test/mocks/task-mock.cjs`, `test/helpers.cjs`, `test/fixtures/**`, `.github/workflows/test.yml`, `test/install.test.cjs`, `test/gsd-tools-extra.test.cjs`
- Changed: `package.json` (test script update)

---

## Module 2: Phase Decomposition (Steps + Smaller Tasks)

**Priority:** Second — makes execution transparent and testable.

### 2.1 XML `<step>` Elements Inside Tasks (Backward-Compatible)

New optional format. Existing `<task>` without `<steps>` works as before.

```xml
<task type="auto" tdd="true">
  <name>JWT token validation</name>
  <files>src/lib/jwt.ts, tests/jwt.test.ts</files>
  <steps>
    <step name="red" verify="npm test -- jwt.test.ts fails">
      Write failing tests: validateToken(invalid) throws,
      validateToken(expired) throws, validateToken(valid) returns payload
    </step>
    <step name="green" verify="npm test -- jwt.test.ts passes">
      Implement validateToken() using jose, verify signature, check expiry
    </step>
    <step name="refactor" verify="npm test passes">
      Extract error constants, add types
    </step>
  </steps>
  <verify>npm test passes, tokens validate correctly</verify>
  <done>JWT validation works for valid, invalid, and expired tokens</done>
</task>
```

**What this enables:**
- Step-level commits: `test(01-01): add failing JWT tests`, `feat(01-01): implement JWT validation`
- SUMMARY.md includes step trace — visible what took time
- On failure at step 2 — resume from step 2, not task start

### 2.2 Planner Generates 4-6 Smaller Tasks

Changes to `agents/gsd-planner.md`:
- New rule: each task should take 5-15 minutes (currently 15-45)
- Limit: max 5 files per task (currently unlimited)
- Each task covers 1 concern, not 3-4

### 2.3 Execution Tracing in gsd-tools.cjs

New CLI commands:

```bash
# Validate step structure in plan
gsd-tools.cjs verify plan-steps <plan-file>

# Step-level progress tracking
gsd-tools.cjs state step-complete <phase> <plan> <task> <step>

# Execution trace (written by executor)
gsd-tools.cjs trace append --phase 01 --plan 01 --task 1 --step green \
  --duration 45s --commit abc123 --status pass
```

Traces saved to `.planning/phases/{phase}/traces/{plan}-trace.json`:

```json
{
  "plan": "01-01",
  "tasks": [{
    "name": "JWT validation",
    "steps": [
      {"name": "red", "duration": "12s", "commit": "abc123", "status": "pass"},
      {"name": "green", "duration": "45s", "commit": "def456", "status": "pass"},
      {"name": "refactor", "duration": "18s", "commit": "ghi789", "status": "pass"}
    ],
    "total_duration": "75s",
    "deviations": []
  }]
}
```

### Files Changed

- Changed: `agents/gsd-planner.md` (decomposition rules, task size limits), `agents/gsd-executor.md` (step-level execution loop, step commits, trace writing), `get-shit-done/bin/gsd-tools.cjs` (verify/trace/step-complete commands), `get-shit-done/templates/plan.md` (`<steps>` format docs), `get-shit-done/templates/summary.md` (step trace section)

### Backward Compatibility

Executor checks for `<steps>` presence. If absent — works as before (task-level commits). If present — step-level. Planner generates steps by default for `tdd="true"` tasks.

---

## Module 3: Documentation Auto-Generation

**Priority:** Third — leverages phase decomposition tracing for richer docs.

### 3.1 Agent: `gsd-doc-generator`

**File:** `agents/gsd-doc-generator.md`

Specialized agent that receives:
- Codebase access (via Glob/Grep/Read)
- Phase SUMMARY.md files (key-decisions, tech-stack, deviations)
- PROJECT.md + REQUIREMENTS.md (project context)

Generates 5 document types:

**README.md** — from PROJECT.md + tech-stack from SUMMARY + codebase structure:
- Project description (from PROJECT.md vision)
- Quick start (from USER-SETUP.md + .env.example inference)
- Architecture overview (from codebase analysis)
- API summary (from discovered routes/endpoints)
- Tech stack (aggregated from SUMMARY frontmatter `tech-stack`)

**API Documentation** — code scanning:
- REST: finds route handlers → generates OpenAPI-compatible markdown (endpoints, methods, params, status codes)
- TypeScript: exported interfaces/types → reference docs
- Format: markdown in `docs/api/`, no external tooling (zero deps)

**CHANGELOG.md** — from phase SUMMARY.md:
- Grouped by milestone → phase → subsystem
- Each SUMMARY contains `key-decisions`, `deviations`, task commits
- Format: Keep a Changelog (Added/Changed/Fixed/Removed)

**ADR (Architecture Decision Records)** — from key-decisions:
- Aggregates `key-decisions` from all SUMMARY.md files
- Each decision → `docs/adr/NNNN-decision-title.md`
- Format: Context → Decision → Consequences
- Source traces to phase/plan where decision was made

**Mermaid Diagrams** — from code structure:
- Data flow: scans imports → builds dependency graph
- Architecture layers: groups by directories (routes → services → models)
- Saved to `docs/diagrams/` as `.md` with Mermaid blocks

### 3.2 Command: `/gsd:generate-docs`

**File:** `commands/gsd/generate-docs.md`

```bash
/gsd:generate-docs              # Generate all
/gsd:generate-docs --readme     # README only
/gsd:generate-docs --api        # API docs only
/gsd:generate-docs --changelog  # CHANGELOG only
/gsd:generate-docs --adr        # ADR only
/gsd:generate-docs --diagrams   # Diagrams only
```

Orchestration:
1. Load PROJECT.md, collect all SUMMARY.md files
2. Spawn `gsd-doc-generator` with requested scope
3. Agent scans codebase, generates documents
4. Commit: `docs: generate documentation for v{milestone}`

### 3.3 Auto-Run at complete-milestone

Changes to `commands/gsd/complete-milestone.md` and workflow:

After phase archival, before git tag — invoke `/gsd:generate-docs`. User sees:

```
Phase archival complete.
Generating documentation...
  ✓ README.md updated
  ✓ docs/api/ generated (12 endpoints)
  ✓ CHANGELOG.md updated (v1.0.0 section)
  ✓ docs/adr/ generated (7 decisions)
  ✓ docs/diagrams/ generated (3 diagrams)
Creating tag v1.0.0...
```

### 3.4 Templates

New files in `get-shit-done/templates/`:
- `docs-readme.md` — README structure
- `docs-adr.md` — ADR format
- `docs-changelog.md` — CHANGELOG format
- `docs-api-endpoint.md` — endpoint description format

### Files Changed

- New: `agents/gsd-doc-generator.md`, `commands/gsd/generate-docs.md`, `get-shit-done/workflows/generate-docs.md`, 4 templates in `get-shit-done/templates/`
- Changed: `commands/gsd/complete-milestone.md`, `get-shit-done/workflows/complete-milestone.md`

---

## Module 4: Skill Auto-Discovery with Security Verification

**Priority:** Fourth — enhances GSD's extensibility.

### 4.1 Command: `/gsd:find-skills`

**File:** `commands/gsd/find-skills.md`

Two modes:

**Manual search:**
```bash
/gsd:find-skills "playwright testing"     # Search by query
/gsd:find-skills --for-phase 3            # Search by phase tech-stack
```

**Automatic (embedded in existing workflows):**
- At `new-project` after stack analysis → "Found skills for Next.js, Prisma, Tailwind. Install?"
- At `plan-phase` after research → "Skills available for this phase: playwright-skill, prisma-migrations. Install?"
- At `map-codebase` after stack detection → skill suggestions

### 4.2 claude-plugins.dev Integration

New module in `get-shit-done/bin/gsd-tools.cjs` (~400 LOC):

```bash
# Search skills by query
gsd-tools.cjs skills search "playwright e2e testing"
# → Request to https://claude-plugins.dev/api/skills?q=...

# Search by tech-stack (extracted from SUMMARY/RESEARCH frontmatter)
gsd-tools.cjs skills search-by-stack --phase 3

# Skill info
gsd-tools.cjs skills info @owner/repo/skill-name
```

### 4.3 Security Scanner

```bash
gsd-tools.cjs skills scan <path-to-skill-directory>
```

**4 verification levels:**

**Level 1: Tool Audit** — Parses SKILL.md frontmatter, extracts tools. Warns about dangerous combinations:
```
⚠ Skill requests: Bash, Write, WebFetch
  Bash + WebFetch = can exfiltrate data
  Decision: [Install] [Deny] [Install Read/Write only]
```

**Level 2: Content Scan** — Regex search for suspicious patterns in SKILL.md and scripts:
- `curl`, `wget`, `nc` — network calls
- `eval`, `exec`, `Function(` — dynamic execution
- `process.env`, `.env`, `credentials` — secret access
- `rm -rf`, `chmod`, `chown` — destructive operations
- Base64 strings >100 chars — obfuscation

**Level 3: Scope Verification** — Checks skill does only what it describes:
- Description says "testing" → Bash commands should be `npm test`, `playwright`, not `curl`
- Compares declared tools vs actually used patterns

**Level 4: Reputation Check** — Data from claude-plugins.dev:
- Stars, downloads, last update
- Author: verified? other skills?
- Flag if: <10 stars, last commit >6 months, author with no other projects

**Output:**
```
Security scan: playwright-skill (@lackeyjb)
  ✓ Tools: Bash, Read, Write — standard for testing skill
  ✓ Content: No suspicious patterns found
  ✓ Scope: Bash commands match testing purpose
  ✓ Reputation: 245 stars, updated 2 weeks ago
  Risk: LOW — Safe to install
```

### 4.4 Installation

```bash
gsd-tools.cjs skills install @owner/repo/skill-name [--global|--local]
```

Process:
1. Resolve via claude-plugins.dev API → get GitHub URL
2. Clone/download to temp directory
3. **Security scan** (mandatory, cannot be skipped)
4. If risk HIGH → refuse (can `--force-unsafe` with triple warning)
5. Copy to `~/.claude/skills/` (global) or `.claude/skills/` (local)
6. Write to `.planning/installed-skills.json` (manifest with hashes)

### 4.5 Workflow Integration

**`new-project.md`** — after stack determination:
```
Step N: Skill Discovery
  tech_stack = extract from research/questionnaire
  skills = gsd-tools.cjs skills search-by-stack
  if skills found: present to user with security scan results
```

**`plan-phase.md`** — after research, before planning:
```
Step N: Check Available Skills
  phase_tech = extract from RESEARCH.md
  skills = gsd-tools.cjs skills search "{phase_tech}"
  if relevant and not installed: suggest installation
```

### Files Changed

- New: `commands/gsd/find-skills.md`, `get-shit-done/workflows/find-skills.md`
- Changed: `get-shit-done/bin/gsd-tools.cjs` (skills module ~400 LOC), `get-shit-done/workflows/new-project.md` (skill discovery step), `get-shit-done/workflows/plan-phase.md` (skill suggestion step)

### Security Principle

Security scan is NOT optional — it is a mandatory gate. `--force-unsafe` exists but logs and shows triple warning. Never install automatically without user confirmation.

---

## Module 5: Playwright Integration

**Priority:** Fifth — depends on phase decomposition (steps) and test infrastructure.

### 5.1 Playwright CLI in verify-work

New step in `gsd-verifier.md` — after artifact checks, before UAT:

```
Step N: UI Verification (if web project)
  if project has dev server (detected from package.json scripts):
    1. Start dev server
    2. playwright-cli snapshot http://localhost:{port}
       → Snapshot saved to .planning/snapshots/{phase}-snapshot.yaml
    3. playwright-cli screenshot http://localhost:{port}
       → Screenshot saved to .planning/snapshots/{phase}-screenshot.png
    4. For each route in router config:
       playwright-cli snapshot http://localhost:{port}{route}
    5. Analyze snapshots for issues:
       - Broken layouts (empty containers, overlapping)
       - Missing content (headings, nav items)
       - Error states ("Error", "500", "undefined")
    6. Kill dev server
```

**Triggers when:** `config.json` contains `"playwright.ui_verification": true` OR auto-detected by presence of `next.config.*`, `vite.config.*`, `index.html`.

**Output in VERIFICATION.md:**
```markdown
## UI Verification
- Routes checked: /, /login, /dashboard
- Screenshots: .planning/snapshots/01-screenshot-*.png
- Issues found:
  - /dashboard: Empty container #main-content
  - /login: Form present, submit button ✓
- Verdict: 1 issue, needs investigation
```

### 5.2 Playwright Test Agents in plan-phase

For phases with UI requirements (detected by keywords: "page", "form", "dashboard", "UI", "frontend"):

Planner generates E2E test task as part of plan:

```xml
<task type="auto" tdd="true">
  <name>Generate E2E tests for login flow</name>
  <files>tests/e2e/login.spec.ts</files>
  <steps>
    <step name="plan" verify="test plan file exists">
      Use Playwright Planner to explore app and generate test plan
    </step>
    <step name="generate" verify="npx playwright test compiles">
      Use Playwright Generator to convert plan into TypeScript tests
    </step>
    <step name="validate" verify="npx playwright test passes">
      Run tests, use Playwright Healer if selectors break
    </step>
  </steps>
  <verify>npx playwright test passes for login flow</verify>
  <done>E2E tests cover happy path + error cases</done>
</task>
```

### 5.3 Configuration

In `.planning/config.json`:

```json
{
  "playwright": {
    "enabled": false,
    "ui_verification": true,
    "e2e_generation": true,
    "dev_server_command": "npm run dev",
    "dev_server_port": 3000,
    "base_url": "http://localhost:3000"
  }
}
```

`enabled: false` by default. Activated:
- Automatically at `/gsd:new-project` if stack contains Next.js/Vite/React/Vue/etc
- Manually via `/gsd:settings`
- Requires `@playwright/test` installed in project (GSD does not install it)

### 5.4 What We Do NOT Do

- Do NOT use Playwright to test GSD itself (node:test is sufficient)
- Do NOT install Playwright as a GSD dependency (zero deps principle)
- Do NOT run Playwright if project is not a web application
- Do NOT replace UAT — Playwright complements manual verification

### Files Changed

- Changed: `agents/gsd-verifier.md` (UI verification step), `agents/gsd-planner.md` (E2E test task generation for UI phases), `get-shit-done/bin/gsd-tools.cjs` (playwright config), `get-shit-done/workflows/verify-work.md` (playwright CLI step), `get-shit-done/references/planning-config.md` (playwright config docs)

---

## Implementation Order

```
Module 1: Test Infrastructure ──┐
                                ├── Module 2: Phase Decomposition
                                │        │
                                │        ├── Module 3: Documentation
                                │        │
                                ├── Module 4: Skill Discovery
                                │
                                └── Module 5: Playwright (depends on 1 + 2)
```

Modules 3 and 4 can proceed in parallel after Module 2. Module 5 depends on both 1 (test infra) and 2 (steps format).

## Design Principles

1. **Zero runtime dependencies** — all new modules follow GSD's pure Node.js philosophy
2. **Backward compatibility** — old plans/tasks work without modification
3. **Incremental adoption** — each module is independently useful
4. **Security by default** — skill scanner is mandatory, not optional
5. **Test from day one** — Module 1 exists so everything after it ships with tests
