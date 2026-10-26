import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HOOKED_METHODS, olderThan } from './catalogue';
import { FILES } from './spec';
import { PLAYWRIGHT_DIR, SPEC_DIR } from '../cli/manifest';

const specDir = join(PLAYWRIGHT_DIR, SPEC_DIR);
const methodRef = /file: FILES\.(\w+),\s*target: '([^']*)',\s*method: '(\w+)'/g;

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
		const listed = new Set(HOOKED_METHODS.map((ref) => `${ref.file} ${ref.target}.${ref.method}`));
		expect([...used].filter((ref) => !listed.has(ref))).toEqual([]);
		expect(used.size).toBeGreaterThan(0);
	});
});

describe('olderThan', () => {
	it('compares release tags by number, not as text', () => {
		expect(olderThan('2.9.0', '2.39.0')).toBe(true);
	});
});
