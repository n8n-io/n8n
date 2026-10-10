import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HOOKED_METHODS, observeHookedMethods, olderThan } from './catalogue';
import { FILES } from './spec';
import { CHAOS_HOOKS } from '../chaos/run';
import { LEADER_HOOKS } from '../multi-main';
import { PLAYWRIGHT_DIR, SPEC_DIR } from '../cli/manifest';

const specDir = join(PLAYWRIGHT_DIR, SPEC_DIR);
const methodRef = /file: FILES\.(\w+),\s*target: '([^']*)',\s*method: '(\w+)'/g;

describe('HOOKED_METHODS', () => {
	it('lists every method a scenario spec or the rig hooks', () => {
		const used = new Set<string>();
		for (const spec of readdirSync(specDir).filter((name) => name.endsWith('.spec.ts'))) {
			for (const [, key, target, method] of readFileSync(join(specDir, spec), 'utf8').matchAll(
				methodRef,
			)) {
				used.add(`${FILES[key as keyof typeof FILES]} ${target}.${method}`);
			}
		}
		for (const ref of [...LEADER_HOOKS, ...CHAOS_HOOKS])
			used.add(`${ref.file} ${ref.target}.${ref.method}`);
		const listed = new Set(HOOKED_METHODS.map((ref) => `${ref.file} ${ref.target}.${ref.method}`));
		expect([...used].filter((ref) => !listed.has(ref))).toEqual([]);
		expect(used.size).toBeGreaterThan(0);
	});
});

describe('olderThan', () => {
	it.each([
		['2.38.7', '2.39.0', true],
		['2.39.0', '2.39.0', false],
		['2.40.1', '2.39.9', false],
		['10.0.0', '9.9.9', false],
		['repro-fix', '2.39.0', false],
	])('%s older than %s: %s', (tag, version, older) => {
		expect(olderThan(tag, version)).toBe(older);
	});

	it('leaves out methods an older release does not have', () => {
		expect(observeHookedMethods('2.38.0').length).toBe(HOOKED_METHODS.length - 1);
		expect(observeHookedMethods('2.42.2').length).toBe(HOOKED_METHODS.length);
	});
});
