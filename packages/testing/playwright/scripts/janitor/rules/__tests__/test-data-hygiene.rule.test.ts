import { Project } from 'ts-morph';
import assert from 'node:assert';
import { TestDataHygieneRule } from '../test-data-hygiene.rule';

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

// Test 1: Detects poorly named workflow files
test('detects generic workflow names', () => {
	const rule = new TestDataHygieneRule();

	// Test the bad name patterns directly
	const badNames = [
		'Test_workflow_1.json',
		'test.json',
		'data.json',
		'workflow_2.json',
		'cat-1801.json',
	];

	for (const name of badNames) {
		const matches = rule['badNamePatterns'].some((p: RegExp) => p.test(name));
		assert.ok(matches, `Should flag "${name}" as poorly named`);
	}
});

// Test 2: Allows descriptive workflow names
test('allows descriptive workflow names', () => {
	const rule = new TestDataHygieneRule();

	const goodNames = [
		'webhook-with-wait.json',
		'ai-agent-tool-call.json',
		'merge-node-multiple-inputs.json',
		'simple-http-request.json',
		'subworkflow-child-workflow.json',
	];

	for (const name of goodNames) {
		const matches = rule['badNamePatterns'].some((p: RegExp) => p.test(name));
		assert.ok(!matches, `Should allow "${name}" as well-named`);
	}
});

// Test 3: Detects ticket-only names
test('detects ticket-only names', () => {
	const rule = new TestDataHygieneRule();

	const ticketNames = ['cat-1801.json', 'CAT-123.json', 'ado-456.json', 'SUG-38.json'];

	for (const name of ticketNames) {
		const matches = rule['badNamePatterns'].some((p: RegExp) => p.test(name));
		assert.ok(matches, `Should flag "${name}" as ticket-only name`);
	}
});

// Test 4: Reference detection finds workflow imports
test('finds workflow file references', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/tests/workflow.spec.ts',
		`
import { test } from '../fixtures/base';

test('imports workflow', async ({ n8n }) => {
	await n8n.workflows.import('my-workflow.json');
});
`,
	);

	const rule = new TestDataHygieneRule();
	const refs = rule['buildReferenceIndex']([file]);

	assert.ok(refs.fileNames.has('my-workflow.json'), 'Should find workflow import');
});

// Test 5: Reference detection finds loadExpectations calls
test('finds loadExpectations folder references', () => {
	const project = createProject();
	const file = project.createSourceFile(
		'/tests/proxy.spec.ts',
		`
import { test } from '../fixtures/base';

test('loads expectations', async ({ proxyServer }) => {
	await proxyServer.loadExpectations('langchain');
});
`,
	);

	const rule = new TestDataHygieneRule();
	const refs = rule['buildReferenceIndex']([file]);

	assert.ok(refs.folderNames.has('langchain'), 'Should find expectations folder');
});

// Test 6: Orphan detection for folder-based paths
test('detects orphaned expectation folders', () => {
	const rule = new TestDataHygieneRule();

	const refs = { fileNames: new Set<string>(), folderNames: new Set(['langchain']) };

	// langchain folder is referenced
	const langchainOrphaned = rule['isOrphaned'](
		'expectations/langchain/test.json',
		'test.json',
		'expectations/langchain',
		refs,
	);
	assert.strictEqual(langchainOrphaned, false, 'langchain should not be orphaned');

	// unused-folder is not referenced
	const unusedOrphaned = rule['isOrphaned'](
		'expectations/unused-folder/test.json',
		'test.json',
		'expectations/unused-folder',
		refs,
	);
	assert.strictEqual(unusedOrphaned, true, 'unused-folder should be orphaned');
});

// Test 7: Orphan detection for file-based paths
test('detects orphaned workflow files', () => {
	const rule = new TestDataHygieneRule();

	const refs = { fileNames: new Set(['used-workflow.json']), folderNames: new Set<string>() };

	const usedOrphaned = rule['isOrphaned'](
		'workflows/used-workflow.json',
		'used-workflow.json',
		'workflows',
		refs,
	);
	assert.strictEqual(usedOrphaned, false, 'used workflow should not be orphaned');

	const unusedOrphaned = rule['isOrphaned'](
		'workflows/unused-workflow.json',
		'unused-workflow.json',
		'workflows',
		refs,
	);
	assert.strictEqual(unusedOrphaned, true, 'unused workflow should be orphaned');
});

console.log('\nTest Data Hygiene Rule Tests Complete\n');
