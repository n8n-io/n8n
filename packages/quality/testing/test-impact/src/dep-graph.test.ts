import { describe, it, expect } from 'vitest';

import {
	changedRuntimeDeps,
	changedRuntimeDepsFromManifests,
	stripDependencyFiles,
} from './changes.js';
import {
	dependentDirs,
	runtimeClosure,
	snapshotKeyToName,
	type LockfileImporters,
	type LockfileSnapshots,
} from './dep-graph.js';
import type { ImpactMap } from './impact-map.js';
import { DependencyGraphStrategy } from './select/dep-graph-strategy.js';

const pkg = (deps = {}, devDeps = {}, peer = {}) =>
	JSON.stringify({ dependencies: deps, devDependencies: devDeps, peerDependencies: peer });

describe('changedRuntimeDeps', () => {
	it('returns the runtime dep whose version moved', () => {
		expect(changedRuntimeDeps(pkg({ axios: '1.0.0' }), pkg({ axios: '1.1.0' }))).toEqual(['axios']);
	});
	it('includes added and removed runtime deps', () => {
		expect(changedRuntimeDeps(pkg({ a: '1' }), pkg({ b: '1' })).sort()).toEqual(['a', 'b']);
	});
	it('counts peer dependency changes as runtime', () => {
		expect(changedRuntimeDeps(pkg({}, {}, { react: '18' }), pkg({}, {}, { react: '19' }))).toEqual([
			'react',
		]);
	});
	it('excludes devDependency changes', () => {
		expect(changedRuntimeDeps(pkg({}, { vitest: '1' }), pkg({}, { vitest: '2' }))).toEqual([]);
	});
});

describe('changedRuntimeDepsFromManifests', () => {
	it('unions runtime deps across manifests, de-duplicated', () => {
		const manifests = {
			'a/package.json': { before: pkg({ axios: '1' }), after: pkg({ axios: '2' }) },
			'b/package.json': {
				before: pkg({ axios: '1', ms: '1' }),
				after: pkg({ axios: '1', ms: '2' }),
			},
		};
		expect(changedRuntimeDepsFromManifests(manifests).sort()).toEqual(['axios', 'ms']);
	});
});

describe('stripDependencyFiles', () => {
	it('removes the lockfile and every package.json, keeps source', () => {
		expect(
			stripDependencyFiles([
				'pnpm-lock.yaml',
				'packages/cli/package.json',
				'packages/cli/src/a.ts',
			]),
		).toEqual(['packages/cli/src/a.ts']);
	});
});

describe('dependentDirs', () => {
	const importers = {
		'packages/cli': ['axios', 'express'],
		'packages/@n8n/nodes-langchain': ['@aws-sdk/client-bedrock-runtime'],
		'packages/core': ['axios'],
	};
	it('returns every workspace dir declaring any of the deps, sorted', () => {
		expect(dependentDirs(['axios'], importers)).toEqual(['packages/cli', 'packages/core']);
	});
	it('returns [] for a dep no workspace package declares (transitive)', () => {
		expect(dependentDirs(['left-pad'], importers)).toEqual([]);
	});
});

describe('DependencyGraphStrategy', () => {
	// leaf is covered by one spec; cli by another.
	const map: ImpactMap = {
		'packages/@n8n/nodes-langchain/src/index.ts': { '0': ['tests/e2e/langchain.spec.ts'] },
		'packages/cli/src/server.ts': { '0': ['tests/e2e/server.spec.ts'] },
	};
	const importers = {
		'packages/@n8n/nodes-langchain': ['@aws-sdk/client-bedrock-runtime'],
		'packages/cli': ['axios'],
	};

	it('scopes a leaf-only dep to that package’s specs', () => {
		const r = new DependencyGraphStrategy(map, importers, [
			'@aws-sdk/client-bedrock-runtime',
		]).resolve();
		expect(r.mode).toBe('scoped');
		expect(r.specs).toEqual(['tests/e2e/langchain.spec.ts']);
	});

	it('fails open to broad when no workspace package declares the dep', () => {
		const r = new DependencyGraphStrategy(map, importers, ['left-pad'], {
			allSpecs: ['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts'],
		}).resolve();
		expect(r.mode).toBe('broad');
		expect(r.specs).toEqual(['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts']);
	});

	// A mix of an attributable dep and an unattributable one must go broad: scoping
	// to just the attributable dep would silently drop the dep we can't attribute.
	it('fails open to broad when any changed dep is unattributable', () => {
		const r = new DependencyGraphStrategy(map, importers, ['axios', 'left-pad'], {
			allSpecs: ['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts'],
		}).resolve();
		expect(r.mode).toBe('broad');
		expect(r.specs).toEqual(['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts']);
		expect(r.unmapped).toEqual(['left-pad']);
	});

	it('contributes nothing when there are no changed deps', () => {
		const r = new DependencyGraphStrategy(map, importers, []).resolve();
		expect(r).toEqual({ specs: [], unmapped: [], mode: 'scoped' });
	});
});

describe('snapshotKeyToName', () => {
	it.each([
		['ajv@8.18.0', 'ajv'],
		['@scope/pkg@1.0.0', '@scope/pkg'],
		// peer suffix carries `@`s — must not confuse the version separator
		['@vitest/coverage-v8@4.1.9(vitest@4.1.9)', '@vitest/coverage-v8'],
		['vite@5.0.0(sass@1.98.0)(terser@5.0.0)', 'vite'],
		['plain-name', 'plain-name'],
	])('%s → %s', (key, expected) => {
		expect(snapshotKeyToName(key)).toBe(expected);
	});
});

describe('runtimeClosure', () => {
	// cli links core (runtime) → ajv → fast-uri; test-utils declares vitest but
	// is only reachable via devDependencies, so it must stay out.
	const importers: LockfileImporters = {
		'packages/cli': {
			dependencies: {
				'n8n-core': { specifier: 'workspace:*', version: 'link:../core' },
				axios: { specifier: '^1.0.0', version: '1.0.0' },
			},
			devDependencies: {
				'test-utils': { specifier: 'workspace:*', version: 'link:../test-utils' },
			},
		},
		'packages/core': {
			dependencies: { ajv: { specifier: '^8.0.0', version: '8.18.0' } },
		},
		'packages/test-utils': {
			dependencies: { vitest: { specifier: '^4.0.0', version: '4.1.9' } },
		},
	};
	const snapshots: LockfileSnapshots = {
		'ajv@8.18.0': { dependencies: { 'fast-uri': '3.1.3' } },
		'fast-uri@3.1.3': {},
		'axios@1.0.0': {},
		'vitest@4.1.9': { dependencies: { '@vitest/browser': '4.1.9' } },
		'@vitest/browser@4.1.9': {},
	};
	const opts = {
		deployRoots: ['packages/cli'],
		runtimeSections: ['dependencies', 'optionalDependencies'],
	};

	it('follows workspace link: edges from the deploy roots', () => {
		const closure = runtimeClosure(importers, snapshots, opts);
		expect(closure.has('ajv')).toBe(true);
		expect(closure.has('axios')).toBe(true);
	});
	it('reaches a dep only present via a transitive snapshot edge (the fast-uri shape)', () => {
		expect(runtimeClosure(importers, snapshots, opts).has('fast-uri')).toBe(true);
	});
	it('excludes deps of a workspace package reachable only via devDependencies (the vitest shape)', () => {
		const closure = runtimeClosure(importers, snapshots, opts);
		expect(closure.has('vitest')).toBe(false);
		expect(closure.has('@vitest/browser')).toBe(false);
	});
	it('with empty snapshots the closure is just the declared external roots', () => {
		expect([...runtimeClosure(importers, {}, opts)].sort()).toEqual(['ajv', 'axios']);
	});
	it('roots the real package behind an npm: alias in an importer (the zod-from-json-schema shape)', () => {
		const aliased: LockfileImporters = {
			'packages/cli': {
				dependencies: {
					'zod-v3': {
						specifier: 'npm:zod-from-json-schema@^0.0.5',
						version: 'zod-from-json-schema@0.0.5',
					},
				},
			},
		};
		const snaps: LockfileSnapshots = {
			'zod-from-json-schema@0.0.5': { dependencies: { zod: '3.25.76' } },
		};
		const closure = runtimeClosure(aliased, snaps, opts);
		expect(closure.has('zod-from-json-schema')).toBe(true);
		expect(closure.has('zod')).toBe(true);
	});
	it('follows an aliased dep inside a snapshot (the string-width-cjs shape)', () => {
		const snaps: LockfileSnapshots = {
			'ajv@8.18.0': { dependencies: { 'string-width-cjs': 'string-width@4.2.3' } },
			'string-width@4.2.3': { dependencies: { 'emoji-regex': '8.0.0' } },
		};
		const closure = runtimeClosure(importers, snaps, opts);
		expect(closure.has('string-width')).toBe(true);
		expect(closure.has('emoji-regex')).toBe(true);
	});
	it('unknown deploy root → empty closure, no throw', () => {
		expect(
			runtimeClosure(importers, snapshots, { ...opts, deployRoots: ['packages/nope'] }).size,
		).toBe(0);
	});
});
