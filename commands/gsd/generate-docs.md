---
name: gsd:generate-docs
description: Generate product documentation from code and GSD artifacts
argument-hint: "[--readme | --api | --changelog | --adr | --diagrams | all if no flags]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
---

<objective>
Generate product documentation from codebase analysis and GSD planning artifacts.

Purpose: Produce professional documentation (README, API docs, changelog, ADRs, diagrams) by combining code inspection with accumulated planning context (SUMMARY.md files, decisions, requirements).

Output: Generated documentation files committed to the repository.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/generate-docs.md
</execution_context>

<context>
**Flags:** $ARGUMENTS (optional)
- `--readme` — Generate/update README.md
- `--api` — Generate API endpoint documentation
- `--changelog` — Generate CHANGELOG.md from history
- `--adr` — Generate Architecture Decision Records
- `--diagrams` — Generate architecture diagrams (Mermaid)
- No flags — Generate all documentation types

**Project files:**
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/` — SUMMARY.md files from completed phases
</context>

<process>
1. Parse flags from $ARGUMENTS to determine documentation scope
2. Load project context (PROJECT.md, STATE.md, history digest)
3. Spawn gsd-doc-generator agent with scope and collected context
4. Review generated documentation
5. Commit generated docs

Follow the generate-docs workflow at @~/.claude/get-shit-done/workflows/generate-docs.md.
</process>

<success_criteria>
- [ ] Requested documentation types generated
- [ ] Templates followed for each doc type
- [ ] Content derived from actual code and GSD artifacts (not fabricated)
- [ ] Generated docs committed with `docs: generate documentation`
- [ ] User informed of what was generated and where
</success_criteria>
