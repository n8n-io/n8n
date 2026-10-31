import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	addMissingRootRanges,
	collectRootRanges,
	createBackendResolveStats,
	forceSpecTn,
	resolveBackendEntries,
	resolveBackendUrl,
	specBackendRawPaths,
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

describe('specBackendRawPaths', () => {
	it("adds the boot raw of each container the spec ran in to the spec's own raws", () => {
		const dir = mkdtempSync(join(tmpdir(), 'spec-'));
		try {
			for (const f of ['raw-a.json', '.spec', '.boot-c1.json', '.boot-c2.json']) {
				writeFileSync(join(dir, f), '');
			}
			const paths = specBackendRawPaths(dir, ['raw-a.json'], '/boot', '.boot-');
			expect(new Set(paths)).toEqual(
				new Set([join(dir, 'raw-a.json'), '/boot/c1.json', '/boot/c2.json']),
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe('addMissingRootRanges', () => {
	const fn = (functionName: string, startOffset: number, endOffset: number, count: number) => ({
		functionName,
		isBlockCoverage: true,
		ranges: [{ startOffset, endOffset, count }],
	});

	it('adds a zero-count root to a window that omits the code that did not run', () => {
		const dir = mkdtempSync(join(tmpdir(), 'cov-'));
		try {
			// The window in which the script loaded has its root range.
			writeFileSync(
				join(dir, 'window-1.json'),
				JSON.stringify({ result: [{ url: 'file:///a.js', functions: [fn('', 0, 180, 1)] }] }),
			);
			const roots = collectRootRanges([join(dir, 'window-1.json')]);
			const later = [
				{ url: 'file:///a.js', functions: [fn('run', 13, 57, 2)] },
				{ url: 'file:///b.js', functions: [fn('', 0, 90, 1)] },
				{ url: 'file:///unknown.js', functions: [fn('x', 5, 9, 1)] },
			];

			const [a, b, unknown] = addMissingRootRanges(later, roots);

			expect(a.functions).toEqual([fn('', 0, 180, 0), fn('run', 13, 57, 2)]);
			expect(b).toBe(later[1]);
			expect(unknown).toBe(later[2]);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
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
