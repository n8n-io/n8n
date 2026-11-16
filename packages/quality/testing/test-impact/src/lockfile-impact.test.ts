import { describe, expect, it } from 'vitest';

import { lockfileImpact } from './lockfile-impact.js';

const UNIT = {
	ownSections: ['dependencies', 'devDependencies', 'optionalDependencies'],
	linkedSections: ['dependencies', 'optionalDependencies'],
};

const header = { lockfileVersion: '9.0', settings: { autoInstallPeers: true } };
const pnpmDoc = {
	importers: { '.': { packageManagerDependencies: { pnpm: { version: '12.4.2' } } } },
};

/** A lockfile: `app` uses `x` (which uses `y`) and `lib` at runtime, `lib` uses
 *  `z` at runtime and `vitest` in dev, `other` uses `z`. */
function lockfile(
	overrides: { y?: string; yIntegrity?: string; libDev?: string; otherSpecifier?: string } = {},
) {
	const y = overrides.y ?? '1.0.0';
	return [
		pnpmDoc,
		{
			...header,
			importers: {
				'packages/app': {
					dependencies: {
						x: { specifier: '^1.0.0', version: '1.0.0' },
						lib: { specifier: 'workspace:*', version: 'link:../lib' },
					},
				},
				'packages/lib': {
					dependencies: { z: { specifier: '^1.0.0', version: '1.0.0' } },
					devDependencies: { vitest: { specifier: '^4', version: overrides.libDev ?? '4.0.0' } },
				},
				'packages/other': {
					dependencies: {
						z: { specifier: overrides.otherSpecifier ?? '^1.0.0', version: '1.0.0' },
					},
				},
			},
			packages: {
				'x@1.0.0': { resolution: { integrity: 'x' } },
				[`y@${y}`]: { resolution: { integrity: overrides.yIntegrity ?? `y${y}` } },
				'z@1.0.0': { resolution: { integrity: 'z' } },
				'vitest@4.0.0': { resolution: { integrity: 'v4.0.0' } },
				'vitest@4.1.0': { resolution: { integrity: 'v4.1.0' } },
			},
			snapshots: {
				'x@1.0.0': { dependencies: { y } },
				[`y@${y}`]: {},
				'z@1.0.0': {},
				'vitest@4.0.0': {},
				'vitest@4.1.0': {},
			},
		},
	];
}

describe('lockfileImpact', () => {
	it('reports the packages that reach a transitive change', () => {
		expect(lockfileImpact(lockfile(), lockfile({ y: '1.1.0' }), UNIT)).toEqual(['packages/app']);
	});

	it('reports a changed integrity on the same version', () => {
		expect(lockfileImpact(lockfile(), lockfile({ yIntegrity: 'other' }), UNIT)).toEqual([
			'packages/app',
		]);
	});

	it('does not pass a devDependency change on to a package that links it', () => {
		expect(lockfileImpact(lockfile(), lockfile({ libDev: '4.1.0' }), UNIT)).toEqual([
			'packages/lib',
		]);
	});

	it('reports nothing when only a specifier changed', () => {
		expect(lockfileImpact(lockfile(), lockfile({ otherSpecifier: '^1.0.1' }), UNIT)).toEqual([]);
	});

	it('returns null when pnpm itself or the lockfile settings changed', () => {
		const pnpmBump = lockfile();
		pnpmBump[0] = {
			importers: { '.': { packageManagerDependencies: { pnpm: { version: '12.5.0' } } } },
		};
		expect(lockfileImpact(lockfile(), pnpmBump, UNIT)).toBeNull();

		const settings = lockfile();
		settings[1] = { ...settings[1], settings: { autoInstallPeers: false } };
		expect(lockfileImpact(lockfile(), settings, UNIT)).toBeNull();
	});
});
