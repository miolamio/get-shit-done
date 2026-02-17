# ADR Template

Template for generating Architecture Decision Records in `docs/decisions/`. Follows the standard ADR format: Context, Decision, Consequences.

---

## File Template

Each ADR is a separate file: `docs/decisions/NNNN-{{slug}}.md`

```markdown
# {{NUMBER}}. {{TITLE}}

**Date:** {{YYYY-MM-DD}}
**Status:** {{Accepted | Superseded by [ADR-NNNN](NNNN-slug.md) | Deprecated}}
**Phase:** {{Phase number and name where decision was made}}

## Context

{{CONTEXT — What is the issue that we're seeing that is motivating this decision or change? Describe the forces at play (technical, political, social, project). Extract from SUMMARY.md "Decisions Made" sections, PROJECT.md "Key Decisions", or STATE.md accumulated context.}}

## Decision

{{DECISION — What is the change that we're proposing and/or doing? State the decision clearly and concisely. Include the specific technology, pattern, or approach chosen.}}

## Consequences

### Positive

{{POSITIVE_CONSEQUENCES — What becomes easier or possible as a result of this change?}}

- {{Benefit 1}}
- {{Benefit 2}}

### Negative

{{NEGATIVE_CONSEQUENCES — What becomes more difficult or is lost as a result of this change?}}

- {{Tradeoff 1}}
- {{Tradeoff 2}}

### Neutral

{{NEUTRAL_CONSEQUENCES — Other noteworthy effects that are neither clearly positive nor negative.}}

- {{Effect 1}}

## Alternatives Considered

{{ALTERNATIVES — What other options were evaluated? Why were they rejected? Include at least one alternative.}}

### {{Alternative 1}}

{{Description of alternative and why it was not chosen.}}

### {{Alternative 2}}

{{Description of alternative and why it was not chosen.}}

## References

{{REFERENCES — Links to relevant resources, documentation, or discussions.}}

- {{Reference 1}}
- {{Reference 2}}
```

## Index Template

Create `docs/decisions/README.md` as an index:

```markdown
# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for {{PROJECT_NAME}}.

ADRs document significant architectural decisions made during development, providing context for why things are the way they are.

## Decisions

| # | Decision | Status | Date | Phase |
|---|----------|--------|------|-------|
| {{N}} | [{{Title}}]({{filename}}) | {{Status}} | {{Date}} | {{Phase}} |

## Process

New ADRs are generated from key decisions captured in GSD phase summaries. Each decision that affects architecture, technology choices, or significant design patterns gets its own ADR.

To regenerate: `/gsd:generate-docs --adr`
```

<guidelines>

**Source decisions from:**
1. SUMMARY.md "Decisions Made" sections — primary source of decisions with rationale
2. PROJECT.md "Key Decisions" table — curated list with outcomes
3. STATE.md "Accumulated Context > Decisions" — recent decisions
4. Git commit messages — significant architectural commits

**ADR numbering:**
- Start at 0001
- Increment sequentially
- Never reuse numbers
- If ADRs already exist, continue from the highest number

**What qualifies as an ADR:**
- Technology or framework choices (e.g., "Use jose instead of jsonwebtoken")
- Architectural patterns (e.g., "Wave-based parallel execution")
- Data model decisions (e.g., "Denormalize user profile for read performance")
- API design decisions (e.g., "REST over GraphQL for v1")
- Infrastructure choices (e.g., "Serverless over containers")

**What does NOT qualify:**
- Implementation details (e.g., "Variable naming conventions")
- Bug fixes (e.g., "Fix null pointer in auth")
- Routine refactoring (e.g., "Extract helper function")

**Status values:**
- **Accepted** — Decision is current and in effect
- **Superseded by [ADR-NNNN]** — Replaced by a newer decision
- **Deprecated** — No longer relevant but kept for history

**Style:**
- Write in third person ("The team decided..." or passive voice "It was decided...")
- Be specific about the forces that influenced the decision
- Always include at least one alternative that was considered
- Keep consequences honest — include real tradeoffs

</guidelines>
