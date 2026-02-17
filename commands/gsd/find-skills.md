---
name: gsd:find-skills
description: Search and install Agent Skills from claude-plugins.dev
argument-hint: <search query> [--for-phase N]
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

<objective>
Search the claude-plugins.dev skill registry, review results, scan for security, and install approved skills into the current project.

Routes to the find-skills workflow which handles:
- Direct search by query string
- Auto-discovery via `--for-phase N` (extracts tech stack from phase research)
- Result presentation and selection
- Security scanning before install
- Installation with confirmation gates
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/find-skills.md
</execution_context>

<process>
**Follow the find-skills workflow** from `@~/.claude/get-shit-done/workflows/find-skills.md`.

The workflow handles all logic including:
1. Argument parsing (search query or --for-phase N)
2. Tech stack extraction from RESEARCH.md/SUMMARY.md when using --for-phase
3. Skill search via gsd-tools.cjs skills API
4. Interactive result presentation and selection
5. Security scanning of selected skills
6. User confirmation and installation
</process>
