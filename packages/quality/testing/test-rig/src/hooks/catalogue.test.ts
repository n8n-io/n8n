import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HOOKED_METHODS, olderThan } from './catalogue';
import { FILES } from './spec';
import { PLAYWRIGHT_DIR, SPEC_DIR } from '../cli/manifest';
import { LEADER_HOOKS } from '../multi-main';

const specDir = join(PLAYWRIGHT_DIR, SPEC_DIR);
const methodRef = /file: FILES\.(\w+),\s*target: '([^']*)',\s*method: '(\w+)'/g;
const refOf = (ref: { file: string; target: string; method: string }) =>
	`${ref.file} ${ref.target}.${ref.method}`;
const listed = new Set(HOOKED_METHODS.map(refOf));

describe('HOOKED_METHODS', () => {
	it('lists every method a spec hooks', () => {
		const used = new Set<string>();
		for (const spec of readdirSync(specDir).filter((name) => name.endsWith('.spec.ts'))) {
			for (const [, key, target, method] of readFileSync(join(specDir, spec), 'utf8').matchAll(
				methodRef,
			)) {
				used.add(`${FILES[key as keyof typeof FILES]} ${target}.${method}`);
			}
		}
		expect([...used].filter((ref) => !listed.has(ref))).toEqual([]);
		expect(used.size).toBeGreaterThan(0);
	});

	it('lists every method the leader hooks use', () => {
		expect(LEADER_HOOKS.map(refOf).filter((ref) => !listed.has(ref))).toEqual([]);
	});
});

describe('olderThan', () => {
	it('compares release tags by number, not as text', () => {
		expect(olderThan('2.9.0', '2.39.0')).toBe(true);
	});
});
