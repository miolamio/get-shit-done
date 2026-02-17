/**
 * Shared test helpers for GSD test suite.
 *
 * CommonJS module — use: const helpers = require('./test/helpers.cjs')
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('node:assert');

// ─── Paths ────────────────────────────────────────────────────────────────────

const TEST_DIR = __dirname;
const TOOLS_PATH = path.resolve(TEST_DIR, '..', 'get-shit-done', 'bin', 'gsd-tools.cjs');
const INSTALL_PATH = path.resolve(TEST_DIR, '..', 'bin', 'install.js');
const FIXTURES_PATH = path.join(TEST_DIR, 'fixtures');

// ─── Command runners ─────────────────────────────────────────────────────────

/**
 * Run gsd-tools.cjs with the given arguments.
 * @param {string} args  - CLI arguments (e.g. "config-get model_profile")
 * @param {string} [cwd] - Working directory (defaults to process.cwd())
 * @returns {{ success: boolean, output: string, error?: string }}
 */
function runGsdTools(args, cwd = process.cwd()) {
  try {
    const result = execSync(`node "${TOOLS_PATH}" ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString().trim() || '',
      error: err.stderr?.toString().trim() || err.message,
    };
  }
}

/**
 * Run bin/install.js with the given arguments.
 * Sets GSD_TEST_MODE=1 in the environment to prevent destructive operations.
 * @param {string} args  - CLI arguments
 * @param {string} [cwd] - Working directory (defaults to process.cwd())
 * @returns {{ success: boolean, output: string, error?: string }}
 */
function runInstaller(args, cwd = process.cwd()) {
  try {
    const result = execSync(`node "${INSTALL_PATH}" ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, GSD_TEST_MODE: '1' },
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString().trim() || '',
      error: err.stderr?.toString().trim() || err.message,
    };
  }
}

// ─── Temp project helpers ─────────────────────────────────────────────────────

/**
 * Recursively copy a directory tree (pure Node.js, no shell).
 * @param {string} src  - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Create a temporary project directory from a fixture.
 *
 * Copies the named fixture into a temp directory, initialises a git repo,
 * stages all files, and creates an initial commit.
 *
 * @param {string} fixture - Name of the fixture directory under test/fixtures/
 * @returns {string} Absolute path to the temporary project directory
 */
function createTempProject(fixture) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-test-'));
  const fixtureDir = path.join(FIXTURES_PATH, fixture);

  if (!fs.existsSync(fixtureDir)) {
    throw new Error(`Fixture not found: ${fixtureDir}`);
  }

  copyDirSync(fixtureDir, tmpDir);

  // Initialise a git repo so commands that depend on git history work
  execSync('git init && git add -A && git commit -m "init" --allow-empty', {
    cwd: tmpDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'GSD Test',
      GIT_AUTHOR_EMAIL: 'test@gsd.dev',
      GIT_COMMITTER_NAME: 'GSD Test',
      GIT_COMMITTER_EMAIL: 'test@gsd.dev',
    },
  });

  return tmpDir;
}

/**
 * Remove a temporary project directory.
 * @param {string} tmpDir - Path returned by createTempProject()
 */
function cleanup(tmpDir) {
  if (tmpDir && tmpDir.startsWith(os.tmpdir())) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── Assertion helpers ────────────────────────────────────────────────────────

/**
 * Assert that a file exists at the given path.
 * @param {string} filePath - Absolute or relative path
 */
function assertFileExists(filePath) {
  assert.ok(
    fs.existsSync(filePath),
    `Expected file to exist: ${filePath}`
  );
}

/**
 * Assert that a file's contents match a string or regex pattern.
 * @param {string} filePath        - Path to the file
 * @param {string|RegExp} pattern  - Substring or regex to match against
 */
function assertFileContains(filePath, pattern) {
  assertFileExists(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  if (typeof pattern === 'string') {
    assert.ok(
      content.includes(pattern),
      `Expected file ${filePath} to contain "${pattern}"`
    );
  } else {
    assert.match(content, pattern, `Expected file ${filePath} to match ${pattern}`);
  }
}

/**
 * Assert that a markdown file's YAML frontmatter contains expected fields.
 *
 * Uses a lightweight regex-based parser — not a full YAML parser — which is
 * sufficient for checking top-level scalar and simple list fields.
 *
 * @param {string} filePath                  - Path to the .md file
 * @param {Record<string, unknown>} expected - Map of field name to expected value
 */
function assertFrontmatter(filePath, expected) {
  assertFileExists(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, `No YAML frontmatter found in ${filePath}`);
  const fmBlock = match[1];

  for (const [key, value] of Object.entries(expected)) {
    const linePattern = new RegExp(`^${key}:\\s*(.+)$`, 'm');
    const lineMatch = fmBlock.match(linePattern);
    assert.ok(lineMatch, `Frontmatter field "${key}" not found in ${filePath}`);
    if (value !== undefined) {
      const actual = lineMatch[1].replace(/^["']|["']$/g, '').trim();
      assert.strictEqual(
        actual,
        String(value),
        `Frontmatter field "${key}" expected "${value}" but got "${actual}" in ${filePath}`
      );
    }
  }
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

/**
 * Return an array of one-line commit messages matching a grep pattern.
 * @param {string} cwd  - Repository working directory
 * @param {string} grep - Pattern to pass to git log --grep
 * @returns {string[]}  - Matching commit subject lines
 */
function getGitCommits(cwd, grep) {
  try {
    const result = execSync(
      `git log --oneline --grep="${grep}"`,
      { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Paths
  TEST_DIR,
  TOOLS_PATH,
  INSTALL_PATH,
  FIXTURES_PATH,

  // Runners
  runGsdTools,
  runInstaller,

  // Temp project
  createTempProject,
  cleanup,
  copyDirSync,

  // Assertions
  assertFileExists,
  assertFileContains,
  assertFrontmatter,

  // Git
  getGitCommits,
};
