import { describe, test, expect } from 'vitest';

import { mergeV8CoverageByUrl, resolveSourcePath, type V8CoverageEntry } from './coverage-options';

const fn = (functionName: string, ranges: Array<[number, number, number]>) => ({
	functionName,
	isBlockCoverage: true,
	ranges: ranges.map(([startOffset, endOffset, count]) => ({ startOffset, endOffset, count })),
});

describe('mergeV8CoverageByUrl', () => {
	test('keeps distinct URLs separate', () => {
		const entries: V8CoverageEntry[] = [
			{ url: 'a.js', source: 'a', functions: [fn('', [[0, 10, 1]])] },
			{ url: 'b.js', source: 'b', functions: [fn('', [[0, 10, 1]])] },
		];
		expect(mergeV8CoverageByUrl(entries)).toHaveLength(2);
	});

	test('collapses re-loaded same-URL scripts into one, summing range counts', () => {
		const merged = mergeV8CoverageByUrl([
			{
				url: 'a.js',
				source: 'src',
				functions: [
					fn('f', [
						[0, 10, 1],
						[4, 8, 1],
					]),
				],
			},
			{
				url: 'a.js',
				source: 'src',
				functions: [
					fn('f', [
						[0, 10, 2],
						[4, 8, 0],
					]),
				],
			},
		]);

		expect(merged).toHaveLength(1);
		expect(merged[0].source).toBe('src'); // one source copy, not two
		const ranges = merged[0].functions[0].ranges;
		expect(ranges.find((r) => r.startOffset === 0)?.count).toBe(3); // 1 + 2
		expect(ranges.find((r) => r.startOffset === 4)?.count).toBe(1); // 1 + 0
	});

	test('unions ranges and functions present in only one copy', () => {
		const merged = mergeV8CoverageByUrl([
			{ url: 'a.js', source: 'src', functions: [fn('f', [[0, 10, 1]])] },
			{
				url: 'a.js',
				source: 'src',
				functions: [
					fn('f', [
						[0, 10, 1],
						[20, 30, 5],
					]),
					fn('g', [[40, 50, 2]]),
				],
			},
		]);

		expect(merged).toHaveLength(1);
		const fns = merged[0].functions;
		expect(fns.map((f) => f.functionName).sort()).toEqual(['f', 'g']);
		expect(
			fns.find((f) => f.functionName === 'f')?.ranges.find((r) => r.startOffset === 20)?.count,
		).toBe(5);
	});
});

describe('resolveSourcePath', () => {
	// Mirrors the real layout: some packages sit directly under `packages/`, the
	// frontend ones a level deeper.
	const packageDirs = new Map([
		['@n8n/design-system', 'packages/frontend/@n8n/design-system'],
		['@n8n/chat', 'packages/frontend/@n8n/chat'],
		['n8n-workflow', 'packages/workflow'],
	]);

	test('leaves an already repo-relative path untouched', () => {
		expect(resolveSourcePath('packages/cli/src/server.ts', packageDirs)).toBe(
			'packages/cli/src/server.ts',
		);
	});

	test('strips an absolute prefix down to the packages/ root', () => {
		expect(
			resolveSourcePath('/home/runner/_work/n8n/n8n/packages/cli/src/server.ts', packageDirs),
		).toBe('packages/cli/src/server.ts');
	});

	test('attributes a bare src/ path to editor-ui', () => {
		expect(resolveSourcePath('src/views/WorkflowView.vue', packageDirs)).toBe(
			'packages/frontend/editor-ui/src/views/WorkflowView.vue',
		);
	});

	test('resolves a scoped workspace specifier to the package real directory', () => {
		expect(
			resolveSourcePath(
				'@n8n/design-system/src/components/N8nDropdownMenu/DropdownMenu.vue',
				packageDirs,
			),
		).toBe('packages/frontend/@n8n/design-system/src/components/N8nDropdownMenu/DropdownMenu.vue');
	});

	test('resolves an unscoped workspace specifier', () => {
		expect(resolveSourcePath('n8n-workflow/src/Expression.ts', packageDirs)).toBe(
			'packages/workflow/src/Expression.ts',
		);
	});

	test('never invents a packages/ path for an unresolvable specifier', () => {
		const resolved = resolveSourcePath('localhost-45789/assets/chunk-CC9Q.js', packageDirs);
		expect(resolved).toBe('localhost-45789/assets/chunk-CC9Q.js');
		expect(resolved).not.toContain('packages/');
	});

	test('normalises windows separators', () => {
		expect(resolveSourcePath('packages\\cli\\src\\server.ts', packageDirs)).toBe(
			'packages/cli/src/server.ts',
		);
	});
});
