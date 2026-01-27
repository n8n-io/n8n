import { Project } from 'ts-morph';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ApiPurityRule } from './api-purity.rule.js';
import { setConfig, resetConfig, defineConfig } from '../config.js';

describe('ApiPurityRule', () => {
	let project: Project;
	let rule: ApiPurityRule;

	beforeEach(() => {
		project = new Project({ useInMemoryFileSystem: true });
		rule = new ApiPurityRule();

		setConfig(
			defineConfig({
				rootDir: '/',
				apiFixtureName: 'api',
				rawApiPatterns: [/\brequest\.(get|post|put|patch|delete|head)\s*\(/i, /\bfetch\s*\(/],
				patterns: {
					pages: ['pages/**/*.ts'],
					components: ['pages/components/**/*.ts'],
					flows: ['composables/**/*.ts'],
					tests: ['tests/**/*.spec.ts'],
					services: ['services/**/*.ts'],
					fixtures: ['fixtures/**/*.ts'],
					helpers: ['helpers/**/*.ts'],
					factories: ['factories/**/*.ts'],
					testData: [],
				},
			}),
		);
	});

	afterEach(() => {
		resetConfig();
	});

	it('allows API service usage', () => {
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

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(0);
	});

	it('detects request.get() calls', () => {
		const file = project.createSourceFile(
			'/tests/workflow.spec.ts',
			`
import { test } from '../fixtures/base';

test('gets workflow', async ({ request }) => {
	const response = await request.get('/api/workflows');
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('request.get');
	});

	it('detects request.post() calls', () => {
		const file = project.createSourceFile(
			'/tests/workflow.spec.ts',
			`
import { test } from '../fixtures/base';

test('creates workflow', async ({ request }) => {
	await request.post('/api/workflows', { data: { name: 'Test' } });
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].suggestion).toContain('api');
	});

	it('detects fetch() calls', () => {
		const file = project.createSourceFile(
			'/tests/workflow.spec.ts',
			`
import { test } from '../fixtures/base';

test('fetches data', async () => {
	const response = await fetch('https://api.example.com/data');
});
`,
		);

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('fetch');
	});

	it('detects multiple raw API calls', () => {
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

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(3);
	});

	it('detects raw API calls in composables', () => {
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

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
	});

	it('reports correct line numbers', () => {
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

		const violations = rule.analyze(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].line).toBe(6);
	});
});
