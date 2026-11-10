import { manifestSchema, runnersImage, scenarioSchema } from './manifest';

const valid = {
	spec: 'a.spec.ts',
	before: 'n8nio/n8n:2.38.7',
	after: 'n8nio/n8n:2.39.0',
};

describe('manifest', () => {
	it('accepts a scenario with an issue and harness env', () => {
		expect(
			scenarioSchema.safeParse({ ...valid, issue: 'CAT-1', env: { FAULT_HARNESS_GRACE: '5' } })
				.success,
		).toBe(true);
	});

	it.each([
		['an issue id that is not a ticket', { ...valid, issue: 'cat-1' }],
		['a spec that is not a spec file', { ...valid, spec: 'a.ts' }],
		['an image that is not an n8n image', { ...valid, before: 'n8nio/runners:2.38.7' }],
		['an env name outside FAULT_HARNESS_', { ...valid, env: { NODE_ENV: 'test' } }],
		['an unknown field', { ...valid, extra: true }],
		['a missing image', { spec: valid.spec, before: valid.before }],
	])('rejects %s', (_label, scenario) => {
		expect(scenarioSchema.safeParse(scenario).success).toBe(false);
	});

	it('rejects a scenario name that is not kebab case', () => {
		expect(manifestSchema.safeParse({ Bad_Name: valid }).success).toBe(false);
	});
});

describe('runnersImage', () => {
	it('swaps the n8n image for the runners image with the same tag', () => {
		expect(runnersImage('ghcr.io/n8n-io/n8n:2.39.0')).toBe('ghcr.io/n8n-io/runners:2.39.0');
	});
});
