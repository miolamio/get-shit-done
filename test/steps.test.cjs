/**
 * GSD Tools — Step Verification and Trace Append Tests
 *
 * Tests for:
 * - verify plan-steps: validates <step> elements inside XML <task> blocks
 * - trace append: creates/appends execution trace entries to JSON trace files
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
} = require('./helpers.cjs');

// ─── Helper: write a plan file into a temp project ───────────────────────────

function writePlan(tmpDir, phase, planFile, content) {
  const dir = path.join(tmpDir, '.planning', 'phases', phase);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, planFile);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// ─── verify plan-steps ───────────────────────────────────────────────────────

describe('verify plan-steps', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject('rich-project');
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('returns success with valid steps', () => {
    const planContent = `---
phase: 03-steps
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/index.ts]
autonomous: true
must_haves:
  truths:
    - "Tests pass"
---

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Setup project</name>
  <files>src/index.ts</files>
  <action>Create the index file</action>
  <steps>
    <step name="create-file" verify="file exists">Create src/index.ts with basic exports</step>
    <step name="add-types" verify="tsc passes">Add TypeScript type definitions</step>
  </steps>
  <verify>File exists and compiles</verify>
  <done>Index file created</done>
</task>

</tasks>
`;
    const planPath = writePlan(tmpDir, '03-steps', '03-01-PLAN.md', planContent);
    const relPath = path.relative(tmpDir, planPath);

    const result = runGsdTools(`verify plan-steps ${relPath}`, tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.valid, true);
    assert.strictEqual(parsed.tasks.length, 1);
    assert.strictEqual(parsed.tasks[0].name, 'Task 1: Setup project');
    assert.strictEqual(parsed.tasks[0].steps.length, 2);
    assert.strictEqual(parsed.tasks[0].steps[0].name, 'create-file');
    assert.strictEqual(parsed.tasks[0].steps[0].verify, 'file exists');
    assert.ok(parsed.tasks[0].steps[0].content.includes('Create src/index.ts'));
    assert.strictEqual(parsed.tasks[0].steps[1].name, 'add-types');
  });

  test('returns valid with 0 steps when tasks have no steps', () => {
    // Use existing plan file which has no <steps> elements
    const result = runGsdTools(
      'verify plan-steps .planning/phases/01-foundation/01-01-PLAN.md',
      tmpDir
    );
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.valid, true);
    assert.ok(parsed.tasks.length > 0, 'should find tasks');
    // All tasks should have 0 steps
    for (const task of parsed.tasks) {
      assert.strictEqual(task.steps.length, 0, `Task "${task.name}" should have 0 steps`);
    }
  });

  test('reports error for malformed step missing name attribute', () => {
    const planContent = `---
phase: 03-steps
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/index.ts]
autonomous: true
must_haves:
  truths:
    - "Tests pass"
---

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Bad steps</name>
  <files>src/index.ts</files>
  <action>Create the index file</action>
  <steps>
    <step verify="check">Missing name attribute</step>
    <step name="good-step" verify="ok">This one is fine</step>
  </steps>
  <verify>File exists</verify>
  <done>Done</done>
</task>

</tasks>
`;
    const planPath = writePlan(tmpDir, '03-steps', '03-01-PLAN.md', planContent);
    const relPath = path.relative(tmpDir, planPath);

    const result = runGsdTools(`verify plan-steps ${relPath}`, tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.valid, false);
    assert.ok(parsed.errors.length > 0, 'should have errors');
    assert.ok(
      parsed.errors.some(e => e.includes('missing') && e.includes('name')),
      `Expected error about missing name, got: ${JSON.stringify(parsed.errors)}`
    );
  });

  test('returns error JSON when plan file does not exist', () => {
    const result = runGsdTools('verify plan-steps nonexistent.md', tmpDir);
    assert.ok(result.success, `Command should return JSON error, not crash: ${result.error}`);
    const parsed = JSON.parse(result.output);
    assert.ok(parsed.error, 'should have error field');
    assert.ok(parsed.error.includes('not found') || parsed.error === 'File not found');
  });
});

// ─── trace append ────────────────────────────────────────────────────────────

describe('trace append', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject('rich-project');
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('creates trace file and entry', () => {
    const result = runGsdTools(
      'trace append --phase 01-foundation --plan 01 --task "Task 1" --step "create-file" --duration 1500 --commit abc1234 --status passed',
      tmpDir
    );
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.appended, true);
    assert.strictEqual(parsed.entry_count, 1);
    assert.ok(parsed.path.includes('01-trace.json'));

    // Verify the trace file exists and contains the entry
    const tracePath = path.join(tmpDir, parsed.path);
    assertFileExists(tracePath);

    const traceData = JSON.parse(fs.readFileSync(tracePath, 'utf-8'));
    assert.strictEqual(traceData.length, 1);
    assert.strictEqual(traceData[0].task, 'Task 1');
    assert.strictEqual(traceData[0].step, 'create-file');
    assert.strictEqual(traceData[0].duration, 1500);
    assert.strictEqual(traceData[0].commit, 'abc1234');
    assert.strictEqual(traceData[0].status, 'passed');
    assert.ok(traceData[0].timestamp, 'should have timestamp');
  });

  test('appends to existing trace file', () => {
    // First entry
    runGsdTools(
      'trace append --phase 01-foundation --plan 01 --task "Task 1" --step "step-a" --duration 1000 --commit aaa1111 --status passed',
      tmpDir
    );

    // Second entry
    const result = runGsdTools(
      'trace append --phase 01-foundation --plan 01 --task "Task 2" --step "step-b" --duration 2000 --commit bbb2222 --status passed',
      tmpDir
    );
    assert.ok(result.success, `Command failed: ${result.error}`);

    const parsed = JSON.parse(result.output);
    assert.strictEqual(parsed.appended, true);
    assert.strictEqual(parsed.entry_count, 2);

    // Verify both entries exist
    const tracePath = path.join(tmpDir, parsed.path);
    const traceData = JSON.parse(fs.readFileSync(tracePath, 'utf-8'));
    assert.strictEqual(traceData.length, 2);
    assert.strictEqual(traceData[0].task, 'Task 1');
    assert.strictEqual(traceData[1].task, 'Task 2');
  });

  test('fails without required --phase arg', () => {
    const result = runGsdTools(
      'trace append --plan 01 --task "Task 1" --status passed',
      tmpDir
    );
    assert.strictEqual(result.success, false);
    assert.ok(
      result.error.includes('--phase'),
      `Expected error about --phase, got: ${result.error}`
    );
  });

  test('fails without required --plan arg', () => {
    const result = runGsdTools(
      'trace append --phase 01-foundation --task "Task 1" --status passed',
      tmpDir
    );
    assert.strictEqual(result.success, false);
    assert.ok(
      result.error.includes('--plan'),
      `Expected error about --plan, got: ${result.error}`
    );
  });

  test('fails without required --task arg', () => {
    const result = runGsdTools(
      'trace append --phase 01-foundation --plan 01 --status passed',
      tmpDir
    );
    assert.strictEqual(result.success, false);
    assert.ok(
      result.error.includes('--task'),
      `Expected error about --task, got: ${result.error}`
    );
  });

  test('fails without required --status arg', () => {
    const result = runGsdTools(
      'trace append --phase 01-foundation --plan 01 --task "Task 1"',
      tmpDir
    );
    assert.strictEqual(result.success, false);
    assert.ok(
      result.error.includes('--status'),
      `Expected error about --status, got: ${result.error}`
    );
  });
});
