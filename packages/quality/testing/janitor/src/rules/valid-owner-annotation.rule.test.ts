import { describe } from 'vitest';

import { ValidOwnerAnnotationRule } from './valid-owner-annotation.rule.js';
import { test, expect } from '../test/fixtures.js';

describe('ValidOwnerAnnotationRule', () => {
	const rule = new ValidOwnerAnnotationRule();

	test('flags an owner annotation that is not canonical', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			"test.describe('Feature', { annotation: [{ type: 'owner', description: 'Instance AI' }] }, () => {});",
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unknown owner "Instance AI"');
		expect(violations[0].suggestion).toContain('instanceAI');
	});

	test('accepts a canonical owner annotation', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			"test.describe('Feature', { annotation: [{ type: 'owner', description: 'instanceAI' }] }, () => {});",
		);

		expect(rule.analyzeProject(project, [file])).toHaveLength(0);
	});

	test('flags a spec with no owner annotation', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			"test('does a thing', async ({ n8n }) => {});",
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('no owner annotation');
		expect(violations[0].line).toBe(1);
	});

	test('validates the owner property of a helper config (runMemoryBaseline)', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/tests/performance/memory.spec.ts',
			"runMemoryBaseline({ name: 'instance-ai', owner: 'Instance AI' });",
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('Unknown owner "Instance AI"');
	});

	test('accepts a canonical owner passed via a helper config', ({ project, createFile }) => {
		const file = createFile(
			'/tests/performance/memory.spec.ts',
			"runMemoryBaseline({ name: 'instance-ai', owner: 'instanceAI' });",
		);

		expect(rule.analyzeProject(project, [file])).toHaveLength(0);
	});

	test('flags a dynamic owner value (variable, not a literal)', ({ project, createFile }) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			`
const team = resolveTeam();
test.describe('Feature', { annotation: [{ type: 'owner', description: team }] }, () => {});
`,
		);

		// A non-literal owner can't be validated, so it must not silently pass.
		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('string literal');
	});

	test('does not flag an unrelated owner property outside an owner-bearing call', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			`
test.describe('Feature', { annotation: [{ type: 'owner', description: 'Catalysts' }] }, () => {
	test('creates a resource', async ({ api }) => {
		await api.create({ workflow: 'x', owner: 'alice@n8n.io' });
	});
});
`,
		);

		// The owner annotation is canonical; the resource's owner field must not be flagged.
		expect(rule.analyzeProject(project, [file])).toHaveLength(0);
	});

	test('does not flag the question annotation that sits beside the owner', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/tests/infrastructure/bench.spec.ts',
			`
test.describe(
	'Benchmark',
	{ annotation: [
		{ type: 'owner', description: 'Catalysts' },
		{ type: 'question', description: 'webhook-single-instance' },
	] },
	() => {},
);
`,
		);

		expect(rule.analyzeProject(project, [file])).toHaveLength(0);
	});

	test('respects a janitor-disable-next-line directive for an unknown owner', ({
		project,
		createFile,
	}) => {
		const file = createFile(
			'/tests/e2e/example.spec.ts',
			`
test.describe('Feature', { annotation: [
	// janitor-disable-next-line valid-owner-annotation -- vendor smoke, no team
	{ type: 'owner', description: 'SomethingElse' },
] }, () => {});
`,
		);

		expect(rule.analyzeProject(project, [file])).toHaveLength(0);
	});
});
