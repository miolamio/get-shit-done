/**
 * GSD Tools — Gap Coverage Tests
 *
 * Tests for gsd-tools.cjs commands that aren't covered in the main test file:
 * validate consistency, validate health, config-ensure-section, scaffold,
 * and error paths (state load on non-project, phase complete on bad phase,
 * history-digest with corrupt SUMMARY).
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const {
  runGsdTools,
  createTempProject,
  cleanup,
  assertFileExists,
  assertFileContains,
} = require('./helpers.cjs');

// ─── validate consistency ─────────────────────────────────────────────────────

describe('validate consistency', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject('rich-project');
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('passes on consistent rich-project fixture', () => {
    const result = runGsdTools('validate consistency', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.passed, true, 'consistency check should pass');
    assert.strictEqual(parsed.errors.length, 0, 'no errors expected');
  });

  test('warns when ROADMAP references phase not on disk', () => {
    // Add a phantom Phase 3 to ROADMAP.md that has no directory
    const roadmapPath = path.join(tmpDir, '.planning', 'ROADMAP.md');
    let roadmap = fs.readFileSync(roadmapPath, 'utf-8');
    roadmap += '\n### Phase 3: Phantom Phase\n**Goal**: Does not exist on disk\n';
    fs.writeFileSync(roadmapPath, roadmap, 'utf-8');

    const result = runGsdTools('validate consistency', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.warnings.length > 0, 'should have warnings');
    const mismatchWarning = parsed.warnings.find(w =>
      w.includes('Phase 3') && w.includes('ROADMAP') && w.includes('no directory')
    );
    assert.ok(mismatchWarning, `Expected warning about phase 3 mismatch, got: ${JSON.stringify(parsed.warnings)}`);
  });

  test('warns when disk phase not in ROADMAP', () => {
    // Create a phase directory with no matching ROADMAP entry
    const extraPhaseDir = path.join(tmpDir, '.planning', 'phases', '03-extra');
    fs.mkdirSync(extraPhaseDir, { recursive: true });

    const result = runGsdTools('validate consistency', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.warnings.length > 0, 'should have warnings');
    const diskWarning = parsed.warnings.find(w =>
      w.includes('03') && w.includes('disk') && w.includes('not in ROADMAP')
    );
    assert.ok(diskWarning, `Expected warning about phase 03 on disk but not in ROADMAP, got: ${JSON.stringify(parsed.warnings)}`);
  });

  test('detects gap in phase numbering', () => {
    // Remove phase 02, create phase 03 to produce a gap (01 -> 03)
    fs.rmSync(path.join(tmpDir, '.planning', 'phases', '02-auth'), { recursive: true, force: true });
    fs.mkdirSync(path.join(tmpDir, '.planning', 'phases', '03-dashboard'), { recursive: true });

    // Also update ROADMAP to include phase 3 heading
    const roadmapPath = path.join(tmpDir, '.planning', 'ROADMAP.md');
    let roadmap = fs.readFileSync(roadmapPath, 'utf-8');
    roadmap += '\n### Phase 3: Dashboard\n**Goal**: Build dashboard\n';
    fs.writeFileSync(roadmapPath, roadmap, 'utf-8');

    const result = runGsdTools('validate consistency', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    const gapWarning = parsed.warnings.find(w => w.includes('Gap'));
    assert.ok(gapWarning, `Expected gap warning, got: ${JSON.stringify(parsed.warnings)}`);
  });

  test('fails when ROADMAP.md is missing', () => {
    fs.unlinkSync(path.join(tmpDir, '.planning', 'ROADMAP.md'));

    const result = runGsdTools('validate consistency', tmpDir);
    assert.ok(result.success, `Command unexpectedly crashed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.passed, false, 'should fail without ROADMAP');
    assert.ok(
      parsed.errors.some(e => e.includes('ROADMAP.md not found')),
      'should report missing ROADMAP.md'
    );
  });
});

// ─── validate health ──────────────────────────────────────────────────────────

describe('validate health', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject('minimal-project');
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('runs health check on minimal project', () => {
    const result = runGsdTools('validate health', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    // Minimal project has .planning dir, config, ROADMAP, STATE — but no PROJECT.md
    assert.ok(
      ['healthy', 'degraded', 'broken'].includes(parsed.status),
      `status should be a valid value, got: ${parsed.status}`
    );
    assert.ok(Array.isArray(parsed.errors), 'errors should be array');
    assert.ok(Array.isArray(parsed.warnings), 'warnings should be array');
  });

  test('reports broken status when .planning/ is missing', () => {
    // Remove .planning entirely
    fs.rmSync(path.join(tmpDir, '.planning'), { recursive: true, force: true });

    const result = runGsdTools('validate health', tmpDir);
    assert.ok(result.success, `Command crashed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.status, 'broken', 'should report broken');
    assert.ok(
      parsed.errors.some(e => e.message && e.message.includes('.planning')),
      'should report .planning/ not found'
    );
  });

  test('--repair recreates STATE.md when deleted', () => {
    // Delete STATE.md
    const statePath = path.join(tmpDir, '.planning', 'STATE.md');
    assert.ok(fs.existsSync(statePath), 'STATE.md should exist before deletion');
    fs.unlinkSync(statePath);
    assert.ok(!fs.existsSync(statePath), 'STATE.md should be deleted');

    const result = runGsdTools('validate health --repair', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    // Should have performed repair
    assert.ok(parsed.repairs_performed, 'repairs_performed should be present');
    assert.ok(parsed.repairs_performed.length > 0, 'should have repair actions');

    const stateRepair = parsed.repairs_performed.find(r => r.action === 'regenerateState');
    assert.ok(stateRepair, 'should have regenerateState repair');
    assert.strictEqual(stateRepair.success, true, 'repair should succeed');

    // Verify the file was recreated
    assertFileExists(statePath);
    assertFileContains(statePath, 'Session State');
  });

  test('--repair recreates config.json when deleted', () => {
    const configPath = path.join(tmpDir, '.planning', 'config.json');
    fs.unlinkSync(configPath);

    const result = runGsdTools('validate health --repair', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.repairs_performed, 'repairs_performed should be present');

    const configRepair = parsed.repairs_performed.find(r =>
      r.action === 'createConfig' || r.action === 'resetConfig'
    );
    assert.ok(configRepair, 'should have config repair action');
    assert.strictEqual(configRepair.success, true, 'config repair should succeed');

    // Verify config was recreated with valid JSON
    assertFileExists(configPath);
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.strictEqual(content.model_profile, 'balanced', 'default model_profile should be balanced');
  });

  test('without --repair does NOT create missing files', () => {
    const statePath = path.join(tmpDir, '.planning', 'STATE.md');
    fs.unlinkSync(statePath);

    const result = runGsdTools('validate health', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    // Should NOT have repairs_performed (or it should be undefined)
    assert.ok(
      !parsed.repairs_performed || parsed.repairs_performed.length === 0,
      'no repairs should be performed without --repair'
    );
    // STATE.md should still be missing
    assert.ok(!fs.existsSync(statePath), 'STATE.md should remain missing');
  });
});

// ─── config-ensure-section ────────────────────────────────────────────────────

describe('config-ensure-section', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject('minimal-project');
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('reports already_exists when config.json is present', () => {
    const result = runGsdTools('config-ensure-section', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.created, false, 'should not create');
    assert.strictEqual(parsed.reason, 'already_exists', 'should report already_exists');
  });

  test('creates config.json when missing', () => {
    const configPath = path.join(tmpDir, '.planning', 'config.json');
    fs.unlinkSync(configPath);

    const result = runGsdTools('config-ensure-section', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.created, true, 'should create config');
    assert.strictEqual(parsed.path, '.planning/config.json', 'should report path');

    // Verify created config has expected defaults
    assertFileExists(configPath);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.strictEqual(config.model_profile, 'balanced');
    assert.strictEqual(config.commit_docs, true);
    assert.strictEqual(typeof config.workflow, 'object', 'workflow section should exist');
    assert.strictEqual(config.workflow.research, true);
  });

  test('creates .planning/ directory if missing', () => {
    fs.rmSync(path.join(tmpDir, '.planning'), { recursive: true, force: true });

    const result = runGsdTools('config-ensure-section', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.created, true, 'should create config and directory');

    assertFileExists(path.join(tmpDir, '.planning', 'config.json'));
  });
});

// ─── scaffold context ─────────────────────────────────────────────────────────

describe('scaffold context', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject('rich-project');
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('creates CONTEXT.md template in phase directory', () => {
    const result = runGsdTools('scaffold context --phase 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.created, true, 'should create context file');

    // Verify the file was created in the correct directory
    const contextPath = path.join(tmpDir, '.planning', 'phases', '01-foundation', '01-CONTEXT.md');
    assertFileExists(contextPath);
    assertFileContains(contextPath, 'Context');
    assertFileContains(contextPath, 'Decisions');
    assertFileContains(contextPath, 'Discretion Areas');
  });

  test('reports already_exists when context file exists', () => {
    // Create the context file first
    runGsdTools('scaffold context --phase 1', tmpDir);

    // Try again
    const result = runGsdTools('scaffold context --phase 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.created, false, 'should not create duplicate');
    assert.strictEqual(parsed.reason, 'already_exists', 'should report already_exists');
  });

  test('fails for non-existent phase', () => {
    const result = runGsdTools('scaffold context --phase 99', tmpDir);
    assert.strictEqual(result.success, false, 'should fail for non-existent phase');
    assert.ok(
      result.error.includes('not found') || result.output.includes('not found'),
      'should report phase not found'
    );
  });

  test('scaffold verification reports already_exists when file present', () => {
    // rich-project fixture already has 01-VERIFICATION.md
    const result = runGsdTools('scaffold verification --phase 1', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.created, false, 'should not create duplicate');
    assert.strictEqual(parsed.reason, 'already_exists', 'should report already_exists');
  });

  test('scaffold verification on phase without existing file', () => {
    const result = runGsdTools('scaffold verification --phase 2', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.created, true, 'should create verification file');

    const verifyPath = path.join(tmpDir, '.planning', 'phases', '02-auth', '02-VERIFICATION.md');
    assertFileExists(verifyPath);
    assertFileContains(verifyPath, 'Verification');
    assertFileContains(verifyPath, 'Goal-Backward');
  });
});

// ─── Error paths ──────────────────────────────────────────────────────────────

describe('error paths', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject('minimal-project');
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('state load on non-project directory (no .planning/)', () => {
    // Create a bare directory with no .planning
    const bareDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gsd-bare-'));

    try {
      // state (without subcommand) calls cmdStateLoad
      const result = runGsdTools('state', bareDir);
      // loadConfig returns defaults when config file is missing (no crash)
      // cmdStateLoad reads STATE.md which won't exist, so stateRaw is empty
      // It should still succeed — it just returns empty/default state
      assert.ok(result.success, `Command should handle missing .planning gracefully: ${result.error}`);

      const parsed = JSON.parse(result.output);
      assert.strictEqual(parsed.state_exists, false, 'state_exists should be false');
      assert.strictEqual(parsed.roadmap_exists, false, 'roadmap_exists should be false');
      assert.strictEqual(parsed.config_exists, false, 'config_exists should be false');
    } finally {
      fs.rmSync(bareDir, { recursive: true, force: true });
    }
  });

  test('phase complete on non-existent phase', () => {
    const result = runGsdTools('phase complete 99', tmpDir);
    assert.strictEqual(result.success, false, 'should fail for non-existent phase');
    assert.ok(
      result.error.includes('not found') || result.error.includes('Phase 99'),
      `should report phase not found, got: ${result.error}`
    );
  });

  test('phase complete without phase number', () => {
    const result = runGsdTools('phase complete', tmpDir);
    assert.strictEqual(result.success, false, 'should fail without phase number');
    assert.ok(
      result.error.includes('required') || result.error.includes('phase number'),
      `should report phase number required, got: ${result.error}`
    );
  });

  test('history-digest with corrupt SUMMARY.md', () => {
    // Write a corrupt SUMMARY.md (invalid YAML frontmatter)
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    const summaryPath = path.join(phaseDir, '01-01-SUMMARY.md');

    fs.writeFileSync(summaryPath, `---
phase: "01"
name: "Foundation"
this_is: [invalid: yaml: {broken
  unterminated: [list
---

# Corrupt Summary

This has invalid frontmatter that should not crash the digest.
`, 'utf-8');

    const result = runGsdTools('history-digest', tmpDir);
    // history-digest wraps individual summary parsing in try/catch
    // so it should succeed even with a corrupt summary
    assert.ok(result.success, `Command should handle corrupt SUMMARY gracefully: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.phases !== undefined, 'should return phases object');
    assert.ok(Array.isArray(parsed.decisions), 'should return decisions array');
    assert.ok(Array.isArray(parsed.tech_stack), 'should return tech_stack array');
  });

  test('history-digest with completely empty SUMMARY.md', () => {
    const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
    const summaryPath = path.join(phaseDir, '01-01-SUMMARY.md');

    fs.writeFileSync(summaryPath, '', 'utf-8');

    const result = runGsdTools('history-digest', tmpDir);
    assert.ok(result.success, `Command should handle empty SUMMARY gracefully: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.phases !== undefined, 'should return phases object');
  });

  test('unknown command returns error', () => {
    const result = runGsdTools('nonexistent-command', tmpDir);
    assert.strictEqual(result.success, false, 'should fail for unknown command');
    assert.ok(
      result.error.includes('Unknown command'),
      `should report unknown command, got: ${result.error}`
    );
  });

  test('validate with unknown subcommand returns error', () => {
    const result = runGsdTools('validate nonexistent', tmpDir);
    assert.strictEqual(result.success, false, 'should fail for unknown validate subcommand');
    assert.ok(
      result.error.includes('Unknown validate subcommand'),
      `should report unknown subcommand, got: ${result.error}`
    );
  });
});

// ─── validate health on rich-project ──────────────────────────────────────────

describe('validate health on rich-project', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject('rich-project');
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('detects missing PROJECT.md as error', () => {
    // rich-project has PROJECT.md — verify health is not broken initially
    const initial = runGsdTools('validate health', tmpDir);
    assert.ok(initial.success, `Command failed: ${initial.error}`);

    // Now delete PROJECT.md
    fs.unlinkSync(path.join(tmpDir, '.planning', 'PROJECT.md'));

    const result = runGsdTools('validate health', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.ok(
      parsed.errors.some(e => e.message && e.message.includes('PROJECT.md')),
      `should report missing PROJECT.md, got: ${JSON.stringify(parsed.errors)}`
    );
  });

  test('reports orphaned plans (PLAN without SUMMARY)', () => {
    const result = runGsdTools('validate health', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    // rich-project has 02-01-PLAN.md without a matching SUMMARY
    const orphanInfo = parsed.info.find(i =>
      i.message && i.message.includes('02-01-PLAN') && i.message.includes('no SUMMARY')
    );
    assert.ok(orphanInfo, `should report orphaned plan in phase 02, got info: ${JSON.stringify(parsed.info)}`);
  });

  test('detects invalid JSON in config.json', () => {
    const configPath = path.join(tmpDir, '.planning', 'config.json');
    fs.writeFileSync(configPath, '{ invalid json here }}}', 'utf-8');

    const result = runGsdTools('validate health', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.ok(
      parsed.errors.some(e => e.message && e.message.includes('JSON parse error')),
      `should report JSON parse error, got: ${JSON.stringify(parsed.errors)}`
    );
  });

  test('--repair fixes corrupt config.json', () => {
    const configPath = path.join(tmpDir, '.planning', 'config.json');
    fs.writeFileSync(configPath, '{ broken json', 'utf-8');

    const result = runGsdTools('validate health --repair', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.ok(parsed.repairs_performed, 'should have repairs');

    const configRepair = parsed.repairs_performed.find(r => r.action === 'resetConfig');
    assert.ok(configRepair, 'should have resetConfig repair');
    assert.strictEqual(configRepair.success, true, 'repair should succeed');

    // Verify repaired config is valid
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.strictEqual(config.model_profile, 'balanced');
  });
});
