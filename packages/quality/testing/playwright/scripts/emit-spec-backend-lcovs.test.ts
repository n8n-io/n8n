import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	createBackendResolveStats,
	forceSpecTn,
	resolveBackendEntries,
	resolveBackendUrl,
} from './backend-coverage-resolver';
import { backendBySpecDir, BACKEND_BY_SPEC_DIR, coverageOptions } from '../coverage-options';

const pkgMap = new Map([
	['n8n-core', 'packages/core'],
	['@n8n/db', 'packages/@n8n/db'],
]);

describe('resolveBackendUrl', () => {
	it('maps a node_modules/<pkg>/dist url to the repo dist path', () => {
		const r = resolveBackendUrl(
			'file:///usr/local/lib/node_modules/n8n-core/dist/nodes/If/If.node.js',
			pkgMap,
		);
		expect(r).not.toBeNull();
		expect(r!.repoDistFile.replace(/\\/g, '/')).toMatch(
			/packages\/core\/dist\/nodes\/If\/If\.node\.js$/,
		);
		// No IMAGE_DIST_ROOT in unit tests → bytes read from the repo dist file.
		expect(r!.bytesFile).toBe(r!.repoDistFile);
	});

	it('handles @scoped packages', () => {
		const r = resolveBackendUrl('file:///app/node_modules/@n8n/db/dist/entities/user.js', pkgMap);
		expect(r!.repoDistFile.replace(/\\/g, '/')).toMatch(
			/packages\/@n8n\/db\/dist\/entities\/user\.js$/,
		);
	});

	it('returns null for non-node_modules urls (e.g. frontend assets)', () => {
		expect(resolveBackendUrl('http://host/assets/index-abc.js', pkgMap)).toBeNull();
	});

	it('returns null for a dist url whose package is not in the map', () => {
		expect(
			resolveBackendUrl('file:///app/node_modules/some-untracked-dep/dist/x.js', pkgMap),
		).toBeNull();
	});
});

describe('resolveBackendEntries', () => {
	it('drops non-resolvable entries and classifies them in stats', () => {
		const stats = createBackendResolveStats();
		const entries = resolveBackendEntries(
			{
				result: [
					{ url: 'http://host/assets/index.js' }, // not node_modules → noMatch
					{ url: 'file:///app/node_modules/untracked/dist/x.js' }, // dist but unmapped → noPkg
				],
			},
			pkgMap,
			stats,
		);
		expect(entries).toEqual([]);
		expect(stats.entries).toBe(2);
		expect(stats.noMatch).toBe(1);
		expect(stats.noPkg).toBe(1);
		expect(stats.ok).toBe(0);
	});

	it('tolerates an empty / missing result array', () => {
		const stats = createBackendResolveStats();
		expect(resolveBackendEntries({}, pkgMap, stats)).toEqual([]);
		expect(stats.entries).toBe(0);
	});
});

describe('forceSpecTn', () => {
	const spec = 'tests/e2e/nodes/if-node.spec.ts';

	it('rewrites every TN record to the spec id', () => {
		const lcov =
			'TN:foo\nSF:packages/core/src/x.ts\nDA:1,1\nend_of_record\nTN:bar\nSF:y\nend_of_record\n';
		const out = forceSpecTn(lcov, spec);
		const tns = out.split('\n').filter((l) => l.startsWith('TN:'));
		expect(tns).toEqual([`TN:${spec}`, `TN:${spec}`]);
	});

	it('prepends a TN when the lcov has none', () => {
		const lcov = 'SF:packages/core/src/x.ts\nDA:1,1\nend_of_record\n';
		const out = forceSpecTn(lcov, spec);
		expect(out.startsWith(`TN:${spec}\n`)).toBe(true);
	});
});

describe('backend per-spec dir placement', () => {
	const isUnder = (child: string, parent: string) => {
		const c = resolve(child);
		const p = resolve(parent);
		return c === p || c.startsWith(`${p}/`);
	};

	it('BACKEND_BY_SPEC_DIR is a sibling of (not under) the report outputDir', () => {
		expect(isUnder(BACKEND_BY_SPEC_DIR, coverageOptions.outputDir ?? './coverage')).toBe(false);
		for (const out of ['./coverage', '/a/b/coverage', 'cov/']) {
			expect(isUnder(backendBySpecDir(out), out)).toBe(false);
		}
	});

	it('does not collide with the frontend by-spec dir', () => {
		expect(backendBySpecDir('./coverage')).not.toBe(
			(coverageOptions.outputDir ?? './coverage').replace(/\/+$/, '') + '-by-spec',
		);
	});
});
