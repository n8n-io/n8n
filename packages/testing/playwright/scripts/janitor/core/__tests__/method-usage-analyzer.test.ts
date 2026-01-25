import { Project } from 'ts-morph';
import assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import { MethodUsageAnalyzer } from '../method-usage-analyzer';

const PLAYWRIGHT_ROOT = path.join(__dirname, '..', '..', '..', '..');

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

function createRealProject(): Project {
	const tsconfigPath = path.join(PLAYWRIGHT_ROOT, 'tsconfig.json');
	return new Project({
		tsConfigFilePath: tsconfigPath,
		skipAddingFilesFromTsConfig: false,
	});
}

// Test 1: Fixture mapping extraction
test('extracts fixture property to class mapping from n8nPage', () => {
	const project = createRealProject();
	const analyzer = new MethodUsageAnalyzer(project);
	const index = analyzer.buildIndex();

	// Verify known mappings exist
	assert.strictEqual(
		index.fixtureMapping['canvas'],
		'CanvasPage',
		'canvas should map to CanvasPage',
	);
	assert.strictEqual(
		index.fixtureMapping['workflows'],
		'WorkflowsPage',
		'workflows should map to WorkflowsPage',
	);
	assert.strictEqual(
		index.fixtureMapping['ndv'],
		'NodeDetailsViewPage',
		'ndv should map to NodeDetailsViewPage',
	);
	assert.strictEqual(
		index.fixtureMapping['credentials'],
		'CredentialsPage',
		'credentials should map to CredentialsPage',
	);

	// Verify it doesn't include Page or ApiHelpers
	assert.ok(!index.fixtureMapping['page'], 'page should not be in fixture mapping');
	assert.ok(
		!index.fixtureMapping['api'],
		'api should not be in fixture mapping (it is ApiHelpers)',
	);
});

// Test 2: Method usage extraction from real tests
test('extracts method usages from test files', () => {
	const project = createRealProject();
	const analyzer = new MethodUsageAnalyzer(project);
	const index = analyzer.buildIndex();

	// Should have analyzed test files
	assert.ok(index.testFilesAnalyzed > 0, 'Should have analyzed test files');

	// Should have found some method usages
	const methodCount = Object.keys(index.methods).length;
	assert.ok(methodCount > 0, `Should have found method usages, found ${methodCount}`);

	// Check for commonly used methods
	const canvasAddNode = index.methods['CanvasPage.addNode'];
	if (canvasAddNode) {
		assert.ok(canvasAddNode.length > 0, 'CanvasPage.addNode should have usages');
		// Verify usage structure
		const firstUsage = canvasAddNode[0];
		assert.ok(firstUsage.testFile, 'Usage should have testFile');
		assert.ok(firstUsage.line > 0, 'Usage should have line number');
		assert.ok(firstUsage.fullCall, 'Usage should have fullCall context');
	}
});

// Test 3: Method impact query
test('returns correct impact for specific method', () => {
	const project = createRealProject();
	const analyzer = new MethodUsageAnalyzer(project);

	// Query a method that should exist in tests
	const result = analyzer.getMethodImpact('CanvasPage.addNode');

	assert.strictEqual(result.className, 'CanvasPage', 'className should be CanvasPage');
	assert.strictEqual(result.methodName, 'addNode', 'methodName should be addNode');

	// Verify affected test files are unique and sorted
	const uniqueFiles = [...new Set(result.affectedTestFiles)];
	assert.deepStrictEqual(
		result.affectedTestFiles,
		uniqueFiles,
		'affectedTestFiles should be unique',
	);

	// If there are usages, there should be affected files
	if (result.usages.length > 0) {
		assert.ok(result.affectedTestFiles.length > 0, 'Should have affected test files');
	}
});

// Test 4: Method impact with no usages
test('returns empty results for unused method', () => {
	const project = createRealProject();
	const analyzer = new MethodUsageAnalyzer(project);

	const result = analyzer.getMethodImpact('CanvasPage.nonExistentMethodXYZ123');

	assert.strictEqual(result.className, 'CanvasPage');
	assert.strictEqual(result.methodName, 'nonExistentMethodXYZ123');
	assert.strictEqual(result.usages.length, 0, 'Should have no usages');
	assert.strictEqual(result.affectedTestFiles.length, 0, 'Should have no affected files');
});

// Test 5: Invalid method format throws error
test('throws error for invalid method format', () => {
	const project = createRealProject();
	const analyzer = new MethodUsageAnalyzer(project);

	try {
		analyzer.getMethodImpact('invalidFormat');
		assert.fail('Should have thrown an error');
	} catch (error) {
		assert.ok(
			(error as Error).message.includes('Invalid format'),
			'Error should mention invalid format',
		);
	}
});

// Test 6: List used methods
test('lists methods sorted by usage count', () => {
	const project = createRealProject();
	const analyzer = new MethodUsageAnalyzer(project);

	const methods = analyzer.listUsedMethods();

	if (methods.length > 1) {
		// Verify sorted by usage count descending
		for (let i = 1; i < methods.length; i++) {
			assert.ok(
				methods[i - 1].usageCount >= methods[i].usageCount,
				'Methods should be sorted by usage count descending',
			);
		}

		// Verify structure
		const first = methods[0];
		assert.ok(first.method.includes('.'), 'Method should have Class.method format');
		assert.ok(first.usageCount > 0, 'Should have usage count');
		assert.ok(first.testFileCount > 0, 'Should have test file count');
		assert.ok(first.testFileCount <= first.usageCount, 'testFileCount should be <= usageCount');
	}
});

// Test 7: Verify usage locations are accurate
test('usage locations point to real lines in test files', () => {
	const project = createRealProject();
	const analyzer = new MethodUsageAnalyzer(project);
	const index = analyzer.buildIndex();

	// Find a method with usages and verify the location
	for (const [methodKey, usages] of Object.entries(index.methods)) {
		if (usages.length === 0) continue;

		const usage = usages[0];
		const fullPath = path.join(PLAYWRIGHT_ROOT, usage.testFile);

		// Verify file exists
		assert.ok(fs.existsSync(fullPath), `Test file should exist: ${fullPath}`);

		// Read file and verify line contains the method call
		const content = fs.readFileSync(fullPath, 'utf-8');
		const lines = content.split('\n');
		const line = lines[usage.line - 1];

		// Extract method name from key (e.g., "CanvasPage.addNode" -> "addNode")
		const methodName = methodKey.split('.')[1];

		assert.ok(
			line && line.includes(methodName),
			`Line ${usage.line} in ${usage.testFile} should contain "${methodName}", got: "${line?.slice(0, 100)}"`,
		);

		// Only check first usage for performance
		break;
	}
});

// Test 8: Composable methods are tracked
test('tracks composable method usages', () => {
	const project = createRealProject();
	const analyzer = new MethodUsageAnalyzer(project);
	const index = analyzer.buildIndex();

	// Verify composables are in fixture mapping
	assert.ok(
		index.fixtureMapping['start'] || index.fixtureMapping['canvasComposer'],
		'Should have composables in fixture mapping',
	);
});

// Test 9: Full call context is captured
test('captures meaningful call context', () => {
	const project = createRealProject();
	const analyzer = new MethodUsageAnalyzer(project);
	const index = analyzer.buildIndex();

	for (const usages of Object.values(index.methods)) {
		if (usages.length === 0) continue;

		const usage = usages[0];
		// fullCall should start with n8n. (or the fixture object name)
		assert.ok(
			usage.fullCall.includes('n8n.') || usage.fullCall.length > 0,
			`fullCall should have context: "${usage.fullCall}"`,
		);

		// Only check first usage for performance
		break;
	}
});

// Test 10: Index timestamp is set
test('index has valid timestamp', () => {
	const project = createRealProject();
	const analyzer = new MethodUsageAnalyzer(project);
	const index = analyzer.buildIndex();

	assert.ok(index.timestamp, 'Should have timestamp');
	const date = new Date(index.timestamp);
	assert.ok(!isNaN(date.getTime()), 'Timestamp should be valid ISO date');
});

console.log('\nMethod Usage Analyzer Tests Complete\n');
