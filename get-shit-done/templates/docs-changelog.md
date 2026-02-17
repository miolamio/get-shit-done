# Changelog Template

Template for generating CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format. Entries derived from git history and GSD SUMMARY.md files.

---

## File Template

```markdown
# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

{{ADDED — New features. Extract from SUMMARY.md accomplishments and git commits with `feat:` prefix.}}

- {{Feature description}} ([Phase {{N}}]({{link to summary if applicable}}))

### Changed

{{CHANGED — Changes in existing functionality. Extract from SUMMARY.md and git commits with `refactor:` or `feat:` prefix that modify existing behavior.}}

- {{Change description}}

### Deprecated

{{DEPRECATED — Soon-to-be removed features. Extract from ROADMAP.md or decisions noting deprecation.}}

- {{Deprecation description}}

### Removed

{{REMOVED — Removed features. Extract from git commits with removed files or SUMMARY.md noting removals.}}

- {{Removal description}}

### Fixed

{{FIXED — Bug fixes. Extract from git commits with `fix:` prefix and SUMMARY.md "Issues Encountered" sections.}}

- {{Fix description}}

### Security

{{SECURITY — Security fixes or improvements. Extract from SUMMARY.md deviations (Rule 2 - Missing Critical) and security-related commits.}}

- {{Security improvement description}}

## [{{VERSION}}] - {{YYYY-MM-DD}}

{{Repeat the same sections for each released version. Extract version info from git tags, MILESTONES.md, or milestone archives.}}

### Added

- {{Feature from this release}}

### Fixed

- {{Bug fix from this release}}

[Unreleased]: {{REPO_URL}}/compare/v{{LATEST_VERSION}}...HEAD
[{{VERSION}}]: {{REPO_URL}}/compare/v{{PREV_VERSION}}...v{{VERSION}}
```

<guidelines>

**Source entries from (in priority order):**

1. **SUMMARY.md accomplishments** — Primary source. Each accomplishment maps to an "Added" or "Changed" entry.
2. **Git log with conventional commits** — `feat:` entries for Added, `fix:` entries for Fixed, `refactor:` for Changed.
3. **SUMMARY.md "Issues Encountered"** — Map to Fixed entries.
4. **SUMMARY.md "Deviations from Plan"** — Security-related deviations map to Security entries.
5. **MILESTONES.md** — Version boundaries and release dates.
6. **Git tags** — Version numbers and dates.

**Version organization:**
- Group entries by git tags or milestone versions
- Use `[Unreleased]` for changes since last tag
- Most recent version first
- Include comparison links at the bottom if repo URL available

**Entry format:**
- Start each entry with a verb (Add, Change, Fix, Remove, Deprecate)
- Include phase reference if from GSD: `(Phase 3)`
- Keep entries user-focused, not implementation-focused
- One entry per logical change (not per commit)

**Deduplication:**
- Multiple commits for the same feature = one changelog entry
- TDD commits (test, implementation, refactor) = one entry for the feature
- Merge related fixes into single entries where logical

**Section inclusion:**
- Only include sections that have entries
- Omit empty sections (no "### Deprecated" if nothing deprecated)
- Always include Added and Fixed if they have entries

**What to exclude:**
- Internal refactoring that doesn't affect users
- Documentation-only changes (unless user-facing docs)
- CI/CD pipeline changes
- Test-only changes (unless adding a test framework)
- GSD planning artifact changes (.planning/ files)

</guidelines>
