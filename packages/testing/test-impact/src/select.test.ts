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

	// THE COLLAPSE: empty map → every changed file is unmapped → resolveImpact
	// returns broad. If a refactor ever makes resolveImpact({}, …) return scoped/
	// empty, every other test still passes — this one fails. That is the point.
	it('empty map {} → broad (the fail-open collapse)', () => {
		const mapPath = path.join(tempDir, 'empty.json');
		fs.writeFileSync(mapPath, '{}');
		const result = selectTests({
			changedFiles: ['packages/cli/src/x.ts'],
			mapFile: mapPath,
			allSpecsFile: writeAllSpecs(ALL_SPECS.join('\n')),
		});
		expect(result.mode).toBe('broad');
		// File was loaded successfully — no failOpen reason. The broad comes from
		// resolveImpact's DEFAULT-BROAD rule (changed file absent from the map).
		expect(result.failOpen).toBeUndefined();
		expect(result.unmapped).toEqual(['packages/cli/src/x.ts']);
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
