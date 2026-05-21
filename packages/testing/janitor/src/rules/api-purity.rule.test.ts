import { describe } from 'vitest';

import { ApiPurityRule } from './api-purity.rule.js';
import { test, expect } from '../test/fixtures.js';

describe('ApiPurityRule', () => {
	const rule = new ApiPurityRule();

	test('allows API service usage', ({ project, createFile }) => {
		const file = createFile(
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

	test('detects request.get() calls', ({ project, createFile }) => {
		const file = createFile(
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

	test('detects request.post() calls', ({ project, createFile }) => {
		const file = createFile(
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

	test('detects fetch() calls', ({ project, createFile }) => {
		const file = createFile(
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

	test('detects multiple raw API calls', ({ project, createFile }) => {
		const file = createFile(
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

	test('detects raw API calls in composables', ({ project, createFile }) => {
		const file = createFile(
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

	test('reports correct line numbers', ({ project, createFile }) => {
		const file = createFile(
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
