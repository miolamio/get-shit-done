/**
 * Playwright Config Tests
 *
 * Verifies that config-ensure-section and validate health --repair
 * both include the playwright configuration defaults.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const {
  runGsdTools,
  createTempProject,
  cleanup,
} = require('./helpers.cjs');

// ─── playwright config via config-ensure-section ─────────────────────────────

describe('playwright config', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject('minimal-project');
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('config-ensure-section adds playwright defaults', () => {
    // Delete existing config so config-ensure-section creates a fresh one
    const configPath = path.join(tmpDir, '.planning', 'config.json');
    fs.unlinkSync(configPath);

    const result = runGsdTools('config-ensure-section', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.ok(config.playwright !== undefined, 'playwright section should exist');
    assert.strictEqual(config.playwright.enabled, false);
    assert.strictEqual(config.playwright.ui_verification, true);
    assert.strictEqual(config.playwright.e2e_generation, true);
    assert.strictEqual(config.playwright.dev_server_command, 'npm run dev');
    assert.strictEqual(config.playwright.dev_server_port, 3000);
    assert.strictEqual(config.playwright.base_url, 'http://localhost:3000');
  });

  test('validate health --repair includes playwright defaults', () => {
    // Delete config.json so repair recreates it
    const configPath = path.join(tmpDir, '.planning', 'config.json');
    fs.unlinkSync(configPath);

    const result = runGsdTools('validate health --repair', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    // Repair should have created config
    const repairAction = (parsed.repairs_performed || []).find(
      r => r.action === 'createConfig' || r.action === 'resetConfig'
    );
    assert.ok(repairAction, 'should have performed createConfig repair');
    assert.strictEqual(repairAction.success, true, 'repair should succeed');

    // Verify the repaired config has playwright defaults
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.ok(config.playwright !== undefined, 'playwright section should exist after repair');
    assert.strictEqual(config.playwright.enabled, false);
    assert.strictEqual(config.playwright.ui_verification, true);
    assert.strictEqual(config.playwright.e2e_generation, true);
    assert.strictEqual(config.playwright.dev_server_command, 'npm run dev');
    assert.strictEqual(config.playwright.dev_server_port, 3000);
    assert.strictEqual(config.playwright.base_url, 'http://localhost:3000');
  });

  test('playwright defaults are an object with all expected keys', () => {
    const configPath = path.join(tmpDir, '.planning', 'config.json');
    fs.unlinkSync(configPath);

    runGsdTools('config-ensure-section', tmpDir);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const pw = config.playwright;
    const expectedKeys = [
      'enabled',
      'ui_verification',
      'e2e_generation',
      'dev_server_command',
      'dev_server_port',
      'base_url',
    ];
    assert.deepStrictEqual(
      Object.keys(pw).sort(),
      expectedKeys.sort(),
      'playwright section should have exactly the expected keys'
    );
  });
});
