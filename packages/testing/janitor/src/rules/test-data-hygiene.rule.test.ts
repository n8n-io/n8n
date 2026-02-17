import { Project, type SourceFile } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { TestDataHygieneRule } from './test-data-hygiene.rule.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

/** Test interface to access private members of TestDataHygieneRule */
interface TestableTestDataHygieneRule {
	badNamePatterns: RegExp[];
	buildReferenceIndex(files: SourceFile[]): {
		fileNames: Set<string>;
		folderNames: Set<string>;
	};
	isOrphaned(
		relativePath: string,
		fileName: string,
		dirName: string,
		references: { fileNames: Set<string>; folderNames: Set<string> },
	): boolean;
}

describe('TestDataHygieneRule', () => {
	let project: Project;
	let rule: TestDataHygieneRule;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });
		rule = new TestDataHygieneRule();

		setConfig(
			defineConfig({
				rootDir: '/',
				patterns: {
					pages: ['pages/**/*.ts'],
					components: ['pages/components/**/*.ts'],
					flows: ['composables/**/*.ts'],
					tests: ['tests/**/*.spec.ts'],
					services: ['services/**/*.ts'],
					fixtures: ['fixtures/**/*.ts'],
					helpers: ['helpers/**/*.ts'],
					factories: ['factories/**/*.ts'],
					testData: ['workflows/**/*', 'expectations/**/*'],
				},
			}),
		);
	});

	afterEach(() => {
		resetConfig();
	});

	it('detects generic workflow names', () => {
		// Access private property for testing the patterns
		const badNames = [
			'Test_workflow_1.json',
			'test.json',
			'data.json',
			'workflow_2.json',
			'cat-1801.json',
		];

		const patterns = (rule as unknown as TestableTestDataHygieneRule).badNamePatterns;

		for (const name of badNames) {
			const matches = patterns.some((p) => p.test(name));
			expect(matches).toBe(true);
		}
	});

	it('allows descriptive workflow names', () => {
		const goodNames = [
			'webhook-with-wait.json',
			'ai-agent-tool-call.json',
			'merge-node-multiple-inputs.json',
			'simple-http-request.json',
			'subworkflow-child-workflow.json',
		];

		const patterns = (rule as unknown as TestableTestDataHygieneRule).badNamePatterns;

		for (const name of goodNames) {
			const matches = patterns.some((p) => p.test(name));
			expect(matches).toBe(false);
		}
	});

	it('detects ticket-only names', () => {
		const ticketNames = ['cat-1801.json', 'CAT-123.json', 'ado-456.json', 'SUG-38.json'];

		const patterns = (rule as unknown as TestableTestDataHygieneRule).badNamePatterns;

		for (const name of ticketNames) {
			const matches = patterns.some((p) => p.test(name));
			expect(matches).toBe(true);
		}
	});

	it('finds workflow file references', () => {
		const file = project.createSourceFile(
			'/tests/workflow.spec.ts',
			`
import { test } from '../fixtures/base';

test('imports workflow', async ({ n8n }) => {
	await n8n.workflows.import('my-workflow.json');
});
`,
		);

		const refs = (rule as unknown as TestableTestDataHygieneRule).buildReferenceIndex([file]);

		expect(refs.fileNames.has('my-workflow.json')).toBe(true);
	});

	it('finds loadExpectations folder references', () => {
		const file = project.createSourceFile(
			'/tests/proxy.spec.ts',
			`
import { test } from '../fixtures/base';

test('loads expectations', async ({ proxyServer }) => {
	await proxyServer.loadExpectations('langchain');
});
`,
		);

		const refs = (rule as unknown as TestableTestDataHygieneRule).buildReferenceIndex([file]);

		expect(refs.folderNames.has('langchain')).toBe(true);
	});

	it('detects orphaned expectation folders', () => {
		const refs = { fileNames: new Set<string>(), folderNames: new Set(['langchain']) };

		// langchain folder is referenced
		const langchainOrphaned = (rule as unknown as TestableTestDataHygieneRule).isOrphaned(
			'expectations/langchain/test.json',
			'test.json',
			'expectations/langchain',
			refs,
		);
		expect(langchainOrphaned).toBe(false);

		// unused-folder is not referenced
		const unusedOrphaned = (rule as unknown as TestableTestDataHygieneRule).isOrphaned(
			'expectations/unused-folder/test.json',
			'test.json',
			'expectations/unused-folder',
			refs,
		);
		expect(unusedOrphaned).toBe(true);
	});

	it('detects orphaned workflow files', () => {
		const refs = { fileNames: new Set(['used-workflow.json']), folderNames: new Set<string>() };

		const usedOrphaned = (rule as unknown as TestableTestDataHygieneRule).isOrphaned(
			'workflows/used-workflow.json',
			'used-workflow.json',
			'workflows',
			refs,
		);
		expect(usedOrphaned).toBe(false);

		const unusedOrphaned = (rule as unknown as TestableTestDataHygieneRule).isOrphaned(
			'workflows/unused-workflow.json',
			'unused-workflow.json',
			'workflows',
			refs,
		);
		expect(unusedOrphaned).toBe(true);
	});
});
