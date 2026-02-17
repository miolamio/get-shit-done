<purpose>
Generate product documentation from code and GSD artifacts. Supports targeted generation via flags (--readme, --api, --changelog, --adr, --diagrams) or generates all types when no flags provided.

Combines codebase analysis with accumulated planning context (SUMMARY.md files, decisions, requirements) to produce accurate, substantive documentation.

Output: Documentation files committed to the repository.
</purpose>

<templates>
@~/.claude/get-shit-done/templates/docs-readme.md
@~/.claude/get-shit-done/templates/docs-api-endpoint.md
@~/.claude/get-shit-done/templates/docs-changelog.md
@~/.claude/get-shit-done/templates/docs-adr.md
</templates>

<process>

<step name="parse_args" priority="first">
Parse $ARGUMENTS to determine documentation scope.

**Supported flags:**
- `--readme` — Generate/update README.md
- `--api` — Generate API endpoint documentation in docs/api/
- `--changelog` — Generate CHANGELOG.md from git history and summaries
- `--adr` — Generate Architecture Decision Records in docs/decisions/
- `--diagrams` — Generate Mermaid architecture diagrams in docs/
- No flags — Generate all of the above

```bash
SCOPE="all"
if echo "$ARGUMENTS" | grep -q "\-\-readme"; then SCOPE="readme"; fi
if echo "$ARGUMENTS" | grep -q "\-\-api"; then SCOPE="api"; fi
if echo "$ARGUMENTS" | grep -q "\-\-changelog"; then SCOPE="changelog"; fi
if echo "$ARGUMENTS" | grep -q "\-\-adr"; then SCOPE="adr"; fi
if echo "$ARGUMENTS" | grep -q "\-\-diagrams"; then SCOPE="diagrams"; fi
```

Continue to load_context.
</step>

<step name="load_context">
**Load project context and history:**

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs init generate-docs 2>/dev/null || echo '{}')
```

**Collect planning artifacts:**

1. Read `.planning/PROJECT.md` — project description, core value, constraints
2. Read `.planning/STATE.md` — current position, decisions
3. Read `.planning/ROADMAP.md` — phase structure and milestone info

**Collect history digest:**

```bash
HISTORY=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs history-digest 2>/dev/null || echo 'No history available')
```

This aggregates all SUMMARY.md files into a structured digest of:
- Accomplishments per phase
- Key decisions made
- Files created/modified
- Patterns established
- Requirements completed

**Collect codebase context:**

```bash
ls .planning/codebase/*.md 2>/dev/null
```

If codebase map exists, read relevant documents (STACK.md, ARCHITECTURE.md, STRUCTURE.md).

Continue to spawn_generator.
</step>

<step name="spawn_generator">
**Spawn gsd-doc-generator agent with scope and context:**

```
Task(
  prompt="""
<doc_generation_context>

**Scope:** {SCOPE}
**Templates:** Load from ~/.claude/get-shit-done/templates/docs-*.md

**Project Context:**
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/ROADMAP.md

**History Digest:**
{HISTORY}

**Codebase Map (if exists):**
@.planning/codebase/STACK.md
@.planning/codebase/ARCHITECTURE.md
@.planning/codebase/STRUCTURE.md

</doc_generation_context>

<instructions>

Generate documentation based on scope. Use templates for structure.
Derive ALL content from actual code and GSD artifacts — never fabricate.

**For each scope:**

- **readme**: Generate/update README.md at project root. Follow docs-readme.md template.
  Read package.json, actual source files, and test files to populate accurately.

- **api**: Generate docs/api/ with one file per endpoint group.
  Follow docs-api-endpoint.md template. Scan actual route files for endpoints.

- **changelog**: Generate CHANGELOG.md at project root.
  Follow docs-changelog.md template. Use git log and SUMMARY.md files for entries.

- **adr**: Generate docs/decisions/ with one ADR per key decision.
  Follow docs-adr.md template. Extract decisions from SUMMARY.md and PROJECT.md.

- **diagrams**: Generate docs/architecture.md with Mermaid diagrams.
  Create system overview, data flow, and component diagrams from actual code structure.

- **all**: Generate all of the above.

**Output:** Write files directly. Return confirmation with file paths and line counts.

</instructions>
""",
  subagent_type="gsd-doc-generator",
  description="Generate {SCOPE} documentation"
)
```

Continue to review_output.
</step>

<step name="review_output">
**Review generated documentation:**

Verify generated files exist and are substantive:

```bash
# Check what was generated
find docs/ -name "*.md" -type f 2>/dev/null | head -20
ls -la README.md CHANGELOG.md 2>/dev/null
wc -l README.md CHANGELOG.md docs/**/*.md 2>/dev/null
```

**Verification checklist:**
- Files exist and are non-empty (>10 lines each)
- Content references actual project elements (not placeholders)
- Links and paths are valid
- No secrets or sensitive data exposed

If any files are missing or empty, note the issue.

Continue to commit_docs.
</step>

<step name="commit_docs">
**Commit generated documentation:**

```bash
# Collect all generated doc files
DOC_FILES=""
if [ -f README.md ]; then DOC_FILES="$DOC_FILES README.md"; fi
if [ -f CHANGELOG.md ]; then DOC_FILES="$DOC_FILES CHANGELOG.md"; fi
if [ -d docs/ ]; then DOC_FILES="$DOC_FILES docs/"; fi

node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "docs: generate documentation" --files $DOC_FILES
```

Continue to present_summary.
</step>

<step name="present_summary">
**Present completion summary:**

```
Documentation generated successfully.

**Generated files:**
[List each file with line count]

**Scope:** {SCOPE}
**Source:** Code analysis + {N} SUMMARY.md files + PROJECT.md

---

## Next Steps

- Review generated docs: `cat README.md`, `cat CHANGELOG.md`
- Edit any file to refine content
- Re-generate specific type: `/gsd:generate-docs --readme`
- Continue development: `/gsd:plan-phase` or `/gsd:execute-phase`

---
```

End workflow.
</step>

</process>

<success_criteria>
- Project context loaded (PROJECT.md, STATE.md, history digest)
- Documentation scope determined from flags
- gsd-doc-generator agent spawned with appropriate context
- Generated files verified as non-empty and substantive
- Documentation committed with descriptive message
- User presented with summary and next steps
</success_criteria>
