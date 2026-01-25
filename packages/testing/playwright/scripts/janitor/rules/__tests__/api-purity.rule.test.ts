import { Project } from 'ts-morph';
import assert from 'node:assert';
import { ApiPurityRule } from '../api-purity.rule';

function createProject() {
	return new Project({ useInMemoryFileSystem: true });
}

function test(name: string, fn: () => void) {
	try {
		fn();
		console.log(`✅ ${name}`);
	} catch (error) {
		console.log(`❌ ${name}`);
		console.error(error);
		process.exitCode = 1;
	}
}

// Test 1: Clean test using API services
test('allows API service usage', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/tests/workflow.spec.ts',
		`
import { test } from '../fixtures/base';

test('creates workflow', async ({ n8n, api }) => {
	await api.workflows.create({ name: 'Test' });
	await api.credentials.list();
});
`,
	);

	const rule = new ApiPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 0, 'Should allow API service usage');
});

// Test 2: Detect request.get()
test('detects request.get() calls', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/tests/workflow.spec.ts',
		`
import { test } from '../fixtures/base';

test('gets workflow', async ({ request }) => {
	const response = await request.get('/api/workflows');
});
`,
	);

	const rule = new ApiPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect request.get()');
	assert.ok(violations[0].message.includes('request.get'), 'Should mention the raw API call');
});

// Test 3: Detect request.post()
test('detects request.post() calls', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/tests/workflow.spec.ts',
		`
import { test } from '../fixtures/base';

test('creates workflow', async ({ request }) => {
	await request.post('/api/workflows', { data: { name: 'Test' } });
});
`,
	);

	const rule = new ApiPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect request.post()');
	assert.ok(violations[0].suggestion?.includes('api'), 'Should suggest using API service');
});

// Test 4: Detect fetch() calls
test('detects fetch() calls', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/tests/workflow.spec.ts',
		`
import { test } from '../fixtures/base';

test('fetches data', async () => {
	const response = await fetch('https://api.example.com/data');
});
`,
	);

	const rule = new ApiPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect fetch()');
	assert.ok(violations[0].message.includes('fetch'), 'Should mention fetch');
});

// Test 5: Detect multiple violations in same file
test('detects multiple raw API calls', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/tests/workflow.spec.ts',
		`
import { test } from '../fixtures/base';

test('multiple API calls', async ({ request }) => {
	await request.get('/api/workflows');
	await request.post('/api/workflows', { data: {} });
	await request.delete('/api/workflows/1');
});
`,
	);

	const rule = new ApiPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 3, 'Should detect all three raw API calls');
});

// Test 6: Detect in composables
test('detects raw API calls in composables', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/composables/WorkflowComposer.ts',
		`
export class WorkflowComposer {
	async createAndRun(request: any) {
		await request.post('/api/workflows', { data: {} });
	}
}
`,
	);

	const rule = new ApiPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect raw API in composable');
});

// Test 7: Correct line numbers
test('reports correct line numbers', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/tests/workflow.spec.ts',
		`import { test } from '../fixtures/base';

test('test', async ({ request }) => {
	// line 4
	// line 5
	await request.get('/api/test'); // line 6
});
`,
	);

	const rule = new ApiPurityRule();
	const violations = rule.analyze(project, [file]);

	assert.strictEqual(violations.length, 1, 'Should detect one violation');
	assert.strictEqual(violations[0].line, 6, 'Should report correct line number');
});

console.log('\nAPI Purity Rule Tests Complete\n');
