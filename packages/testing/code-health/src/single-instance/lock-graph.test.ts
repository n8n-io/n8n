import { describe, expect, it } from 'vitest';

import { copiesFromLockfile } from './lock-graph.js';

/** An npm lockfile with the given `packages` map. */
function lockfile(packages: Record<string, unknown>): string {
	return JSON.stringify({ name: 'scratch', lockfileVersion: 3, packages });
}

describe('copiesFromLockfile', () => {
	it('records one copy per install path', () => {
		const found = copiesFromLockfile(
			lockfile({
				'': { name: 'scratch' },
				'node_modules/a': { version: '1.0.0' },
				'node_modules/a/node_modules/zod': { version: '3.0.0' },
				'node_modules/zod': { version: '4.0.0' },
			}),
		);
		expect(found.get('a')).toEqual([{ realPath: 'node_modules/a', version: '1.0.0' }]);
		expect(found.get('zod')).toEqual([
			{ realPath: 'node_modules/a/node_modules/zod', version: '3.0.0' },
			{ realPath: 'node_modules/zod', version: '4.0.0' },
		]);
	});

	it('keys a scoped package on its full name', () => {
		const found = copiesFromLockfile(
			lockfile({ 'node_modules/@langchain/core': { version: '1.0.0' } }),
		);
		expect([...found.keys()]).toEqual(['@langchain/core']);
	});

	// `"zod-v3": "npm:zod@^3"` installs a real second copy of zod, which the directory name hides.
	it('attributes an aliased install to the manifest name', () => {
		const found = copiesFromLockfile(
			lockfile({
				'node_modules/zod': { version: '4.0.0' },
				'node_modules/zod-v3': { name: 'zod', version: '3.0.0' },
			}),
		);
		expect(found.get('zod')).toHaveLength(2);
		expect(found.has('zod-v3')).toBe(false);
	});

	it('ignores the root project and symlinked entries', () => {
		const found = copiesFromLockfile(
			lockfile({
				'': { name: 'scratch' },
				'packages/local': { version: '1.0.0' },
				'node_modules/local': { resolved: 'packages/local', link: true },
			}),
		);
		expect(found.size).toBe(0);
	});

	// A lockfile lists every platform's build of an optional native dep; an install unpacks one.
	it('drops entries this platform would not install', () => {
		const found = copiesFromLockfile(
			lockfile({
				'node_modules/native': { version: '1.0.0', os: [process.platform] },
				'node_modules/a/node_modules/native': { version: '2.0.0', os: ['someotheros'] },
				'node_modules/wrong-arch': { version: '1.0.0', cpu: ['someotherarch'] },
				'node_modules/forbidden': { version: '1.0.0', os: [`!${process.platform}`] },
			}),
		);
		expect(found.get('native')).toEqual([{ realPath: 'node_modules/native', version: '1.0.0' }]);
		expect(found.has('wrong-arch')).toBe(false);
		expect(found.has('forbidden')).toBe(false);
	});

	// Throwing is the contract for "the check did not run" — returning an empty map would report a
	// clean closure for a tree that was never resolved.
	it('throws on a lockfile it cannot read', () => {
		expect(() => copiesFromLockfile('not json')).toThrow(/Could not parse/);
		expect(() => copiesFromLockfile(lockfile({}))).toThrow(/Unusable npm lockfile/);
		expect(() => copiesFromLockfile(JSON.stringify({ lockfileVersion: 1 }))).toThrow(/version 1/);
	});
});
