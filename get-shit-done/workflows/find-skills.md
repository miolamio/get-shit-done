<purpose>
Search the claude-plugins.dev skill registry by query or by phase tech stack, present results interactively, security-scan selected skills, and install with user approval. Skills are stored in `.planning/skills/` and tracked in `.planning/installed-skills.json`.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="parse_args">
**Parse arguments:**

Determine search mode from the command arguments:

1. **`--for-phase N`** — Auto-discover skills for a specific phase's tech stack
2. **Direct query** — Search by user-provided keywords (e.g., "react testing", "docker deployment")

```
if arguments contain "--for-phase":
  PHASE_NUM = value after --for-phase
  MODE = "phase"
else:
  QUERY = remaining arguments joined as string
  MODE = "direct"
fi
```

If no arguments provided, use AskUserQuestion:
- "How would you like to find skills?"
- Options: "Search by keyword", "Auto-discover for a phase"
- If keyword: ask for search query
- If phase: ask for phase number
</step>

<step name="extract_tech_stack" condition="MODE == phase">
**Extract tech stack from phase research (--for-phase mode only):**

First, get phase directory name:

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs phase-plan-index --phase PHASE_NUM
```

Then try to extract tech stack from phase research and summaries:

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs history-digest
```

Parse the digest output for technology references. Also read phase-specific files:

- `.planning/phases/{phase-dir}/{NN}-RESEARCH.md` — Look for tech stack, libraries, frameworks mentioned
- `.planning/phases/{phase-dir}/*-SUMMARY.md` — Look for technologies used in completed plans

Build a comma-separated tech stack string from extracted technologies.

If no tech stack can be determined:
```
Could not extract tech stack from phase PHASE_NUM research.

Falling back to keyword search.
```
Use AskUserQuestion to get a manual search query instead.

Set QUERY to the extracted tech stack string.
</step>

<step name="search_skills">
**Search skill registry:**

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs skills search "QUERY"
```

Parse JSON output:
- `results[]` — Array of matching skills
- `query` — The search query used
- `count` — Number of results
- `error` — Present if search failed

**If error or no results:**
```
No skills found for "QUERY".

Try a different search term, or browse https://claude-plugins.dev directly.
```
Exit workflow.

**If results found**, proceed to presentation.
</step>

<step name="present_results">
**Present search results to user:**

Format results as a numbered list:

```
## Skill Search Results

Found N skills matching "QUERY":

1. **skill-name** — Short description
   Author: author-name | Downloads: N | Risk: low/medium
   Tags: tag1, tag2, tag3

2. **another-skill** — Short description
   Author: author-name | Downloads: N | Risk: low/medium
   Tags: tag1, tag2, tag3

...
```

Use AskUserQuestion with multi-select:
- Question: "Which skills would you like to inspect? (Select to scan before installing)"
- Options: Each skill as a selectable option with name and description
- Include "None — cancel" option

**If user selects none:** Exit workflow.
</step>

<step name="scan_selected_skills">
**Security scan each selected skill:**

For each selected skill, first get detailed info:

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs skills info "SKILL_ID"
```

Parse the skill info to find its source path or repository URL.

If the skill provides a local path or can be cloned, run the security scanner:

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs skills scan "SKILL_PATH"
```

Present scan results for each skill:

```
## Security Scan: skill-name

Risk Level: LOW / MEDIUM / HIGH
Files Scanned: N

### Findings
- [severity] description of finding

### Tool Audit
Tools requested: Read, Write, Bash
Dangerous combinations: none / list

```

**If risk is HIGH:**
```
WARNING: This skill has HIGH risk patterns. Installation is blocked by security policy.

Findings:
- [high] description of dangerous pattern

Skipping skill-name.
```
Continue to next selected skill.

**If risk is LOW or MEDIUM**, proceed to confirmation.
</step>

<step name="confirm_and_install">
**Ask for install confirmation per skill:**

For each scanned skill that passed (risk LOW or MEDIUM):

Use AskUserQuestion:
- Question: "Install skill-name? (Risk: LOW/MEDIUM)"
- Options: "Yes, install", "No, skip"

**If user approves:**

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs skills install --path "SKILL_PATH"
```

Parse JSON output:
- `installed: true` — Success
- `installed: false` — Failed (show reason)
- `name` — Skill name
- `files_copied` — Number of files installed
- `risk` — Risk level

Report result:
```
Installed skill-name (N files, risk: LOW)
Files installed to: .planning/skills/skill-name/
```

**If user declines:** Skip and continue to next skill.
</step>

<step name="display_summary">
**Show final summary:**

```
## Skill Installation Summary

Searched: "QUERY"
Results found: N

Installed:
- skill-name (risk: low, N files)
- another-skill (risk: low, N files)

Skipped:
- blocked-skill (reason: high risk)
- declined-skill (reason: user declined)

Installed skills are available in .planning/skills/
Run /gsd:find-skills again to discover more, or use:
  gsd-tools skills list    — view installed skills
  gsd-tools skills uninstall <name> — remove a skill
```

**If any skills were installed and --for-phase was used:**
```
These skills are now available for phase PHASE_NUM execution.
Executors will automatically pick up skills from .planning/skills/.
```
</step>

</process>

<success_criteria>
- [ ] Arguments parsed correctly (direct query or --for-phase)
- [ ] Tech stack extracted from phase research when using --for-phase
- [ ] Skill search executed via gsd-tools.cjs skills search
- [ ] Results presented clearly with key metadata
- [ ] User can select skills interactively
- [ ] Security scan runs before any installation
- [ ] High-risk skills are blocked automatically
- [ ] User confirmation required before each install
- [ ] Installation tracked in .planning/installed-skills.json
- [ ] Summary displayed with next steps
</success_criteria>
