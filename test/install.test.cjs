/**
 * E2E tests for bin/install.js — Claude Code runtime installation.
 *
 * Runs the real installer with --claude --global --config-dir <tmpdir>
 * to verify files are correctly copied, frontmatter is valid, and
 * manifest is generated.
 *
 * Uses node:test + node:assert (no external framework).
 */

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  INSTALL_PATH,
  runInstaller,
  assertFileExists,
  assertFileContains,
  assertFrontmatter,
} = require('./helpers.cjs');

// ─── Shared state ─────────────────────────────────────────────────────────────

let tmpDir;

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('install.js — Claude runtime (global)', () => {
  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-install-test-'));

    // Run installer once; all tests inspect the resulting directory tree.
    const result = runInstaller(`--claude --global --config-dir "${tmpDir}"`);

    // If the installer itself failed, surface the error before any individual
    // test has a chance to run — this prevents 6 cryptic "file not found" failures.
    assert.ok(
      result.success,
      `Installer exited with error.\nstdout: ${result.output}\nstderr: ${result.error || '(none)'}`,
    );
  });

  after(() => {
    if (tmpDir && tmpDir.startsWith(os.tmpdir())) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ── 1. Commands installed ──────────────────────────────────────────────────

  test('commands/gsd/ directory exists and contains .md files', () => {
    const gsdCmdDir = path.join(tmpDir, 'commands', 'gsd');
    assert.ok(fs.existsSync(gsdCmdDir), `Expected directory: ${gsdCmdDir}`);

    const mdFiles = fs.readdirSync(gsdCmdDir).filter(f => f.endsWith('.md'));
    assert.ok(
      mdFiles.length > 0,
      `Expected .md files in commands/gsd/, found ${mdFiles.length}`,
    );
    // Sanity: at minimum the help command must exist
    assert.ok(
      mdFiles.includes('help.md'),
      `Expected help.md in commands/gsd/, found: ${mdFiles.join(', ')}`,
    );
  });

  // ── 2. Agents installed ────────────────────────────────────────────────────

  test('agents/ directory exists and contains gsd-*.md files', () => {
    const agentsDir = path.join(tmpDir, 'agents');
    assert.ok(fs.existsSync(agentsDir), `Expected directory: ${agentsDir}`);

    const gsdAgents = fs.readdirSync(agentsDir).filter(
      f => f.startsWith('gsd-') && f.endsWith('.md'),
    );
    assert.ok(
      gsdAgents.length > 0,
      `Expected gsd-*.md files in agents/, found ${gsdAgents.length}`,
    );
    // Verify a known agent is present
    assert.ok(
      gsdAgents.includes('gsd-executor.md'),
      `Expected gsd-executor.md in agents/, found: ${gsdAgents.join(', ')}`,
    );
  });

  // ── 3. get-shit-done skill installed ───────────────────────────────────────

  test('get-shit-done/ directory exists with sub-directories', () => {
    const gsdDir = path.join(tmpDir, 'get-shit-done');
    assert.ok(fs.existsSync(gsdDir), `Expected directory: ${gsdDir}`);

    // Must contain key sub-directories: workflows, templates, references, bin
    const entries = fs.readdirSync(gsdDir);
    for (const sub of ['workflows', 'templates', 'references', 'bin']) {
      assert.ok(
        entries.includes(sub),
        `Expected sub-directory ${sub} in get-shit-done/, found: ${entries.join(', ')}`,
      );
    }
  });

  // ── 4. Frontmatter valid ───────────────────────────────────────────────────

  test('installed command file has valid YAML frontmatter with name field', () => {
    const helpCmd = path.join(tmpDir, 'commands', 'gsd', 'help.md');
    assertFileExists(helpCmd);

    const content = fs.readFileSync(helpCmd, 'utf-8');
    assert.ok(
      content.startsWith('---'),
      `Expected help.md to start with YAML frontmatter delimiter "---"`,
    );

    // The frontmatter must contain a name: field
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(fmMatch, 'No YAML frontmatter block found');
    assert.ok(
      /^name:\s*.+/m.test(fmMatch[1]),
      `Frontmatter missing "name:" field in help.md`,
    );
  });

  // ── 5. Manifest generated ─────────────────────────────────────────────────

  test('gsd-file-manifest.json is generated in config dir', () => {
    const manifestPath = path.join(tmpDir, 'gsd-file-manifest.json');
    assertFileExists(manifestPath);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.ok(manifest.version, 'Manifest missing "version" field');
    assert.ok(manifest.timestamp, 'Manifest missing "timestamp" field');
    assert.ok(manifest.files, 'Manifest missing "files" object');

    // Must contain at least one file entry
    const fileCount = Object.keys(manifest.files).length;
    assert.ok(
      fileCount > 0,
      `Expected manifest.files to have entries, found ${fileCount}`,
    );
  });

  // ── 6. gsd-tools.cjs installed ────────────────────────────────────────────

  test('gsd-tools.cjs is installed in get-shit-done/bin/', () => {
    const toolsPath = path.join(tmpDir, 'get-shit-done', 'bin', 'gsd-tools.cjs');
    assertFileExists(toolsPath);

    // Quick sanity: file should be non-trivial (the real CLI is ~1500 LOC)
    const stat = fs.statSync(toolsPath);
    assert.ok(
      stat.size > 1000,
      `gsd-tools.cjs seems too small (${stat.size} bytes), expected > 1000`,
    );
  });

  // ── 7. settings.json created with hooks ───────────────────────────────────

  test('settings.json is created with hook configuration', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    assertFileExists(settingsPath);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

    // Should have SessionStart hook for update checking
    assert.ok(settings.hooks, 'settings.json missing "hooks" object');
    assert.ok(
      Array.isArray(settings.hooks.SessionStart),
      'settings.json missing hooks.SessionStart array',
    );

    // Should have statusLine configured
    assert.ok(settings.statusLine, 'settings.json missing "statusLine" object');
    assert.ok(
      settings.statusLine.command && settings.statusLine.command.includes('gsd-statusline'),
      `Expected statusLine command to reference gsd-statusline, got: ${settings.statusLine.command}`,
    );
  });

  // ── 8. VERSION file written ────────────────────────────────────────────────

  test('VERSION file contains the package version', () => {
    const versionPath = path.join(tmpDir, 'get-shit-done', 'VERSION');
    assertFileExists(versionPath);

    const version = fs.readFileSync(versionPath, 'utf-8').trim();
    const pkg = require('../package.json');
    assert.strictEqual(
      version,
      pkg.version,
      `VERSION file says "${version}", package.json says "${pkg.version}"`,
    );
  });

  // ── 9. Hooks installed ─────────────────────────────────────────────────────

  test('hooks directory contains bundled hook scripts', () => {
    const hooksDir = path.join(tmpDir, 'hooks');
    assert.ok(fs.existsSync(hooksDir), `Expected directory: ${hooksDir}`);

    const hookFiles = fs.readdirSync(hooksDir);
    assert.ok(
      hookFiles.includes('gsd-check-update.js'),
      `Expected gsd-check-update.js in hooks/, found: ${hookFiles.join(', ')}`,
    );
    assert.ok(
      hookFiles.includes('gsd-statusline.js'),
      `Expected gsd-statusline.js in hooks/, found: ${hookFiles.join(', ')}`,
    );
  });

  // ── 10. Path replacement in installed files ────────────────────────────────

  test('installed files have ~/.claude/ paths replaced with config dir', () => {
    // Read a known workflow that originally references ~/.claude/
    const workflowDir = path.join(tmpDir, 'get-shit-done', 'workflows');
    if (!fs.existsSync(workflowDir)) return;

    const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.md'));
    if (files.length === 0) return;

    // Check first workflow — it should have the tmpDir path, not ~/.claude/
    const content = fs.readFileSync(path.join(workflowDir, files[0]), 'utf-8');

    // The original source uses ~/.claude/ — after install with --config-dir,
    // these should be replaced with the actual tmpDir path
    const hasOriginalPath = content.includes('~/.claude/');
    const hasTmpDirPath = content.includes(tmpDir);

    // If the file originally had ~/.claude/ references, they must be replaced.
    // Some files may not contain path references at all, which is fine.
    if (hasOriginalPath) {
      assert.fail(
        `Workflow ${files[0]} still contains "~/.claude/" — path replacement failed`,
      );
    }
  });
});
