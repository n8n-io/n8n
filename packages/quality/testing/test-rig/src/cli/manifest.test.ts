import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadManifest, manifestSchema, runnersImage } from './manifest';

const scenario = {
	issue: 'CAT-1',
	spec: 'demo.spec.ts',
	before: 'n8nio/n8n:2.0.0',
	after: 'n8nio/n8n:2.0.1',
};

describe('manifest', () => {
	it('loads the repository manifest and finds every spec', () => {
		expect(Object.keys(loadManifest()).length).toBeGreaterThan(0);
	});

	it('accepts a scenario with no after image and a runner env', () => {
		expect(
			manifestSchema.parse({
				demo: { ...scenario, after: null, env: { TEST_RIG_RUNNERS: 'external' } },
			}),
		).toBeDefined();
	});

	it.each([
		['an image the runners image cannot be derived from', { before: 'redis:7' }],
		['an env key outside TEST_RIG_', { env: { NODE_OPTIONS: 'x' } }],
		['an unknown field', { colour: 'red' }],
		['a spec that is not a spec file', { spec: 'demo.ts' }],
	])('rejects %s', (_, change) => {
		expect(manifestSchema.safeParse({ demo: { ...scenario, ...change } }).success).toBe(false);
	});

	it('fails when a spec file is missing', () => {
		const dir = mkdtempSync(join(tmpdir(), 'test-rig-manifest-'));
		const path = join(dir, 'scenarios.json');
		writeFileSync(path, JSON.stringify({ demo: scenario }));
		expect(() => loadManifest(path, dir)).toThrow('demo: spec demo.spec.ts not found');
		rmSync(dir, { recursive: true, force: true });
	});

	it('derives the runners image', () => {
		expect(runnersImage('n8nio/n8n:2.42.2')).toBe('n8nio/runners:2.42.2');
	});
});
