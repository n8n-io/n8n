import { describe, it, expect } from 'vitest';

import type { ChangedFile, ImpactMap, ResolveResult } from '../impact-map.js';
import { resolveImpact } from '../impact-map.js';
import { CoverageMapStrategy } from './coverage-map-strategy.js';
import { selectImpactedTests } from './pipeline.js';
import type { SelectionStrategy } from './strategy.js';

const MAP: ImpactMap = {
	'packages/cli/src/a.ts': { '1': ['tests/e2e/a.spec.ts'] },
	'packages/cli/src/b.ts': { '1': ['tests/e2e/b.spec.ts', 'tests/e2e/a.spec.ts'] },
};
const ALL = ['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts', 'tests/e2e/c.spec.ts'];

const stub = (name: string, result: ResolveResult): SelectionStrategy => ({
	name,
	resolve: () => result,
});

describe('CoverageMapStrategy', () => {
	it('is a thin wrapper — resolve() equals resolveImpact()', () => {
		const changed: ChangedFile[] = [{ file: 'packages/cli/src/b.ts' }];
		const opts = { allSpecs: ALL, siblingFallback: true };
		const selector = new CoverageMapStrategy(MAP, opts);
		expect(selector.resolve(changed)).toEqual(resolveImpact(changed, MAP, opts));
	});

	it('exposes a stable name', () => {
		expect(new CoverageMapStrategy(MAP).name).toBe('coverage-map');
	});
});

describe('selectImpactedTests (pipeline)', () => {
	it('unions scoped spec sets across selectors, sorted', () => {
		const a = stub('a', { specs: ['tests/e2e/b.spec.ts'], unmapped: [], mode: 'scoped' });
		const b = stub('b', { specs: ['tests/e2e/a.spec.ts'], unmapped: [], mode: 'scoped' });
		const result = selectImpactedTests([{ file: 'x' }], [a, b]);
		expect(result.mode).toBe('scoped');
		expect(result.specs).toEqual(['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts']);
	});

	it('broad wins — any broad selector makes the whole result broad', () => {
		const scoped = stub('scoped', { specs: ['tests/e2e/a.spec.ts'], unmapped: [], mode: 'scoped' });
		const broad = stub('broad', { specs: ALL, unmapped: ['pnpm-lock.yaml'], mode: 'broad' });
		const result = selectImpactedTests([{ file: 'x' }], [scoped, broad]);
		expect(result.mode).toBe('broad');
	});

	it('merges unmapped + viaSibling from scoped selectors', () => {
		const a = stub('a', { specs: ['s1'], unmapped: ['u1'], mode: 'scoped', viaSibling: ['v1'] });
		const b = stub('b', { specs: ['s2'], unmapped: ['u2'], mode: 'scoped' });
		const result = selectImpactedTests([{ file: 'x' }], [a, b]);
		expect(result.specs).toEqual(['s1', 's2']);
		expect(result.unmapped.sort()).toEqual(['u1', 'u2']);
		expect(result.viaSibling).toEqual(['v1']);
	});

	it('composes with CoverageMapStrategy as the only strategy', () => {
		const changed: ChangedFile[] = [{ file: 'packages/cli/src/a.ts' }];
		const result = selectImpactedTests(changed, [new CoverageMapStrategy(MAP, { allSpecs: ALL })]);
		expect(result.mode).toBe('scoped');
		expect(result.specs).toEqual(['tests/e2e/a.spec.ts']);
	});
});
