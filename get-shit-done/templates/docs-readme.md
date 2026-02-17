# README Template

Template for generating a project README.md from code and GSD artifacts.

---

## File Template

```markdown
# {{PROJECT_NAME}}

{{ONE_LINE_DESCRIPTION}}

## Overview

{{EXPANDED_DESCRIPTION — 2-3 sentences explaining what the project does, who it's for, and why it exists. Derive from PROJECT.md "What This Is" and Core Value.}}

## Features

{{FEATURE_LIST — Bullet list of key features. Extract from completed requirements in REQUIREMENTS.md and accomplishments in SUMMARY.md files.}}

- **{{Feature 1}}** — {{Brief description}}
- **{{Feature 2}}** — {{Brief description}}
- **{{Feature 3}}** — {{Brief description}}

## Getting Started

### Prerequisites

{{PREREQUISITES — List runtime requirements, system dependencies. Extract from package.json engines, STACK.md, or actual project config.}}

- {{Runtime}} >= {{version}}
- {{Dependency}} (optional)

### Installation

```bash
{{INSTALL_COMMANDS — Actual install commands from the project. Check package.json scripts, Makefile, or similar.}}
```

### Quick Start

```bash
{{QUICKSTART_COMMANDS — Minimal commands to get running. Check for dev/start scripts.}}
```

## Usage

{{USAGE_SECTION — Common usage examples. Derive from API routes, CLI commands, or main entry points in the codebase.}}

### {{Usage Example 1}}

```{{language}}
{{CODE_EXAMPLE — Real code from the project or realistic usage based on actual API.}}
```

## Development

### Project Structure

```
{{DIRECTORY_TREE — Actual directory structure. Use STRUCTURE.md if available, or scan filesystem.}}
```

### Running Tests

```bash
{{TEST_COMMANDS — From package.json test script or test framework config.}}
```

### Building

```bash
{{BUILD_COMMANDS — From package.json build script or build config.}}
```

## Architecture

{{ARCHITECTURE_OVERVIEW — Brief description of system design. Extract from ARCHITECTURE.md or infer from code structure. Include a Mermaid diagram if appropriate.}}

## Configuration

{{CONFIG_SECTION — Environment variables, config files, and their purposes. Scan for .env.example, config files, or environment variable references.}}

| Variable | Description | Default |
|----------|-------------|---------|
| {{VAR_NAME}} | {{Description}} | {{default}} |

## API Reference

{{API_SECTION — Brief API overview with link to full docs. Only include if API endpoints exist.}}

See [API Documentation](docs/api/) for full endpoint reference.

## Contributing

{{CONTRIBUTING — Standard contributing guidelines. Keep brief unless CONTRIBUTING.md exists.}}

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

{{LICENSE — From LICENSE file or package.json license field.}}

---
*Generated from project source and GSD planning artifacts.*
```

<guidelines>

**Content must be derived from actual sources:**
- Project name and description from PROJECT.md or package.json
- Features from REQUIREMENTS.md (completed requirements) and SUMMARY.md accomplishments
- Install/build/test commands from package.json scripts
- Directory structure from actual filesystem
- Configuration from .env.example, config files, or env var references in code
- License from LICENSE file or package.json

**Never fabricate:**
- Do not invent features that don't exist in the codebase
- Do not create fake usage examples
- Do not list dependencies that aren't in package.json
- Do not describe architecture that doesn't match the code

**Section inclusion:**
- Only include sections relevant to the project
- Omit API Reference if no API endpoints exist
- Omit Configuration if no config system exists
- Keep Getting Started as minimal as possible

**Style:**
- Use imperative mood for headings
- Keep descriptions concise and scannable
- Prefer code examples over prose
- Link to detailed docs rather than duplicating content

</guidelines>
