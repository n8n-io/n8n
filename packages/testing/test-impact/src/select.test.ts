import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type ImpactMap, type InternedImpactMap, encodeImpactMap } from './impact-map.js';
import { selectTests } from './select.js';

// The handler's fail-open contract is its safety guarantee: every failure mode
// of the map source must degrade to mode 'broad', never to an empty spec set
// (which would silently skip real tests). These cases pin that contract so a
// future refactor of resolveImpact / loadMap can't quietly invert it.

describe('selectTests — fail-open contract', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'select-')));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	const ALL_SPECS = ['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts'];

	const writeAllSpecs = (content: string): string => {
		const p = path.join(tempDir, 'all-specs.txt');
		fs.writeFileSync(p, content);
		return p;
	};

	it('no --map provided → broad with failOpen reason', () => {
		const result = selectTests({
			changedFiles: ['packages/cli/src/x.ts'],
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
		});
		expect(result.mode).toBe('broad');
		expect(result.failOpen).toBe('no --map provided');
		expect(result.specs).toEqual([...ALL_SPECS].sort());
	});

	it("map path that doesn't exist → broad with failOpen reason", () => {
		const missing = path.join(tempDir, 'never-existed.json');
		const result = selectTests({
			changedFiles: ['packages/cli/src/x.ts'],
			mapFile: missing,
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
		});
		expect(result.mode).toBe('broad');
		expect(result.failOpen).toBe(`map not found: ${missing}`);
		expect(result.specs).toEqual([...ALL_SPECS].sort());
	});

	it('corrupt / non-JSON map → broad with failOpen reason', () => {
		const mapPath = path.join(tempDir, 'corrupt.json');
		fs.writeFileSync(mapPath, '{not valid json,,,');
		const result = selectTests({
			changedFiles: ['packages/cli/src/x.ts'],
			mapFile: mapPath,
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
		});
		expect(result.mode).toBe('broad');
		expect(result.failOpen).toMatch(/^unreadable map:/);
		expect(result.specs).toEqual([...ALL_SPECS].sort());
	});

	// THE COLLAPSE: an empty map carries no coverage data — a build/data failure.
	// It must fail open to broad, NOT declare every change uncovered and skip E2E.
	// If a refactor ever makes an empty map resolve scoped/empty, this fails. The point.
	it('empty map {} → broad via fail-open (no coverage data)', () => {
		const mapPath = path.join(tempDir, 'empty.json');
		fs.writeFileSync(mapPath, '{}');
		const result = selectTests({
			changedFiles: ['packages/cli/src/x.ts'],
			mapFile: mapPath,
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
		});
		expect(result.mode).toBe('broad');
		// An empty map is now an explicit fail-open (infra/data failure), not a
		// silent broad from per-file unmapped — so it carries a reason.
		expect(result.failOpen).toBe('empty map (no coverage data)');
		expect(result.specs).toEqual([...ALL_SPECS].sort());
	});

	it('interned {specs, files} map → decoded correctly, resolves scoped', () => {
		const map: ImpactMap = {
			'packages/cli/src/x.ts': { '10': ['tests/e2e/a.spec.ts'] },
		};
		const interned: InternedImpactMap = encodeImpactMap(map);
		const mapPath = path.join(tempDir, 'interned.json');
		fs.writeFileSync(mapPath, JSON.stringify(interned));

		const result = selectTests({
			changedFiles: ['packages/cli/src/x.ts'],
			mapFile: mapPath,
		});
		expect(result.mode).toBe('scoped');
		expect(result.failOpen).toBeUndefined();
		expect(result.specs).toEqual(['tests/e2e/a.spec.ts']);
	});

	// verify-or-declare: a HEALTHY map with no entry for the change is a coverage
	// gap, not an infra failure → declare it uncovered (surfaced, not run), never
	// broad. Distinct from the empty-map / no-map fail-open cases above.
	it('healthy map + unmapped source file → scoped + uncovered, not broad', () => {
		const map: ImpactMap = { 'packages/cli/src/x.ts': { '10': ['tests/e2e/a.spec.ts'] } };
		const mapPath = path.join(tempDir, 'map.json');
		fs.writeFileSync(mapPath, JSON.stringify(map));
		const result = selectTests({
			changedFiles: ['packages/nodes-base/nodes/Markdown/Markdown.node.ts'],
			mapFile: mapPath,
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
		});
		expect(result.mode).toBe('scoped');
		expect(result.specs).toEqual([]);
		expect(result.uncovered).toEqual(['packages/nodes-base/nodes/Markdown/Markdown.node.ts']);
		expect(result.failOpen).toBeUndefined();
	});

	// A dependency change we cannot attribute (lockfile bump, no manifest diff to
	// classify, no importers walk) must stay broad — NOT be declared uncovered and
	// skipped. A dep can reach anything; only source files are declared uncovered.
	it('unattributable dependency change (lockfile only) → broad, not uncovered', () => {
		const map: ImpactMap = { 'packages/cli/src/x.ts': { '10': ['tests/e2e/a.spec.ts'] } };
		const mapPath = path.join(tempDir, 'map-dep.json');
		fs.writeFileSync(mapPath, JSON.stringify(map));
		const result = selectTests({
			changedFiles: ['pnpm-lock.yaml'],
			mapFile: mapPath,
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
		});
		expect(result.mode).toBe('broad');
		expect(result.specs).toEqual([...ALL_SPECS].sort());
	});

	it('runtime-defining change (Dockerfile) → broad, never declared uncovered', () => {
		const map: ImpactMap = { 'packages/cli/src/x.ts': { '10': ['tests/e2e/a.spec.ts'] } };
		const mapPath = path.join(tempDir, 'map-docker.json');
		fs.writeFileSync(mapPath, JSON.stringify(map));
		const result = selectTests({
			changedFiles: ['docker/images/n8n/Dockerfile'],
			mapFile: mapPath,
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
		});
		expect(result.mode).toBe('broad');
		expect(result.specs).toEqual([...ALL_SPECS].sort());
	});

	it('package.json change with NO dependency change (version) → uncovered, not broad', () => {
		const map: ImpactMap = { 'packages/cli/src/x.ts': { '10': ['tests/e2e/a.spec.ts'] } };
		const mapPath = path.join(tempDir, 'map-ver.json');
		fs.writeFileSync(mapPath, JSON.stringify(map));
		const result = selectTests({
			changedFiles: ['packages/cli/package.json'],
			mapFile: mapPath,
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
			manifests: {
				'packages/cli/package.json': {
					before: JSON.stringify({ version: '1.0.0', dependencies: { axios: '1' } }),
					after: JSON.stringify({ version: '1.0.1', dependencies: { axios: '1' } }),
				},
			},
		});
		expect(result.mode).toBe('scoped');
		expect(result.specs).toEqual([]);
		expect(result.uncovered).toEqual(['packages/cli/package.json']);
	});

	// No manifest metadata (e.g. local dev with no base ref) → can't classify the
	// package.json change → conservative broad, never silently declared uncovered.
	it('package.json change with no manifest metadata → broad (cannot classify)', () => {
		const map: ImpactMap = { 'packages/cli/src/x.ts': { '10': ['tests/e2e/a.spec.ts'] } };
		const mapPath = path.join(tempDir, 'map-nomanifest.json');
		fs.writeFileSync(mapPath, JSON.stringify(map));
		const result = selectTests({
			changedFiles: ['packages/cli/package.json'],
			mapFile: mapPath,
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
		});
		expect(result.mode).toBe('broad');
		expect(result.specs).toEqual([...ALL_SPECS].sort());
	});

	it('runtime-dep manifest change with no importers data → broad (cannot scope)', () => {
		const map: ImpactMap = { 'packages/cli/src/x.ts': { '10': ['tests/e2e/a.spec.ts'] } };
		const mapPath = path.join(tempDir, 'map-rt.json');
		fs.writeFileSync(mapPath, JSON.stringify(map));
		const result = selectTests({
			changedFiles: ['packages/cli/package.json'],
			mapFile: mapPath,
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
			manifests: {
				'packages/cli/package.json': {
					before: JSON.stringify({ dependencies: { axios: '1.0.0' } }),
					after: JSON.stringify({ dependencies: { axios: '2.0.0' } }),
				},
			},
		});
		expect(result.mode).toBe('broad');
	});

	describe('--all-specs parsing', () => {
		const triggerBroad = (allSpecsFile: string) =>
			selectTests({
				changedFiles: ['packages/never/covered.ts'],
				allSpecsFile,
			});

		it('parses a newline-separated list', () => {
			const file = writeAllSpecs('tests/e2e/a.spec.ts\ntests/e2e/b.spec.ts\n');
			expect(triggerBroad(file).specs).toEqual(['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts']);
		});

		it('parses a comma-separated list', () => {
			const file = writeAllSpecs('tests/e2e/a.spec.ts,tests/e2e/b.spec.ts');
			expect(triggerBroad(file).specs).toEqual(['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts']);
		});

		it('parses mixed newline + comma + trims empties', () => {
			const file = writeAllSpecs('tests/e2e/a.spec.ts,\n,tests/e2e/b.spec.ts,\n\n');
			expect(triggerBroad(file).specs).toEqual(['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts']);
		});
	});
});
