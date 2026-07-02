import { describe, it, expect } from 'vitest';

import {
	changedRuntimeDeps,
	changedRuntimeDepsFromManifests,
	stripDependencyFiles,
} from './changes.js';
import { dependentDirs } from './dep-graph.js';
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
