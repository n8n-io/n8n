import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
	buildCallGraph,
	collectFiles,
	isTargetSource,
	longestChains,
	main,
	parseArgs,
	stronglyConnectedComponents,
	summarise,
} from './call-graph-depth.mjs';

const graphOf = (edges) => {
	const graph = new Map();
	for (const [from, targets] of Object.entries(edges)) graph.set(from, new Set(targets));
	return graph;
};

describe('parseArgs', () => {
	it('reads targets and options', () => {
		assert.deepEqual(parseArgs(['src', '--max', '6', '--json', '--tsconfig', 't.json']), {
			targets: ['src'],
			tsconfig: 't.json',
			max: 6,
			json: true,
		});
	});

	it('rejects a missing target, an unknown flag and a bad limit', () => {
		assert.throws(() => parseArgs([]), /at least one/);
		assert.throws(() => parseArgs(['a', '--nope']), /Unknown option/);
		assert.throws(() => parseArgs(['a', '--max', '0']), /positive integer/);
		assert.throws(() => parseArgs(['a', '--max']), /needs a value/);
	});
});

describe('isTargetSource', () => {
	it('keeps source files and skips tests, declarations and build output', () => {
		assert.equal(isTargetSource('/x/src/a.ts'), true);
		assert.equal(isTargetSource('/x/src/a.test.ts'), false);
		assert.equal(isTargetSource('/x/src/a.d.ts'), false);
		assert.equal(isTargetSource('/x/dist/a.ts'), false);
		assert.equal(isTargetSource('/x/src/__tests__/a.ts'), false);
		assert.equal(isTargetSource('/x/src/a.js'), false);
	});
});

describe('stronglyConnectedComponents', () => {
	it('emits callees before callers', () => {
		const components = stronglyConnectedComponents(graphOf({ a: ['b'], b: ['c'], c: [] }));
		assert.deepEqual(components, [['c'], ['b'], ['a']]);
	});

	it('groups mutual recursion', () => {
		const components = stronglyConnectedComponents(graphOf({ a: ['b'], b: ['a'] }));
		assert.equal(components.length, 1);
		assert.deepEqual([...components[0]].sort(), ['a', 'b']);
	});
});

describe('longestChains', () => {
	it('gives a leaf depth 1 and follows the longest branch', () => {
		const chains = longestChains(graphOf({ a: ['b', 'd'], b: ['c'], c: [], d: [] }));
		assert.equal(chains.get('c').depth, 1);
		assert.equal(chains.get('a').depth, 3);
		assert.deepEqual(chains.get('a').chain, ['a', 'b', 'c']);
	});

	it('counts a recursive component as one step and flags it', () => {
		const chains = longestChains(graphOf({ a: ['b'], b: ['c'], c: ['b', 'd'], d: [] }));
		assert.equal(chains.get('a').depth, 3);
		assert.equal(chains.get('b').recursive, true);
		assert.equal(chains.get('d').recursive, false);
	});

	it('flags direct self-recursion', () => {
		const chains = longestChains(graphOf({ a: ['a'] }));
		assert.equal(chains.get('a').depth, 1);
		assert.equal(chains.get('a').recursive, true);
	});

	it('never reports a depth larger than the number of nodes', () => {
		const edges = {};
		for (let index = 0; index < 30; index++)
			edges[`n${index}`] = index < 29 ? [`n${index + 1}`] : [];
		const chains = longestChains(graphOf(edges));
		assert.equal(chains.get('n0').depth, 30);
		for (const entry of chains.values()) assert.ok(entry.depth <= 30);
	});
});

describe('summarise', () => {
	it('lists functions over the limit', () => {
		const chains = longestChains(graphOf({ 'f.ts:1 a': ['f.ts:2 b'], 'f.ts:2 b': [] }));
		const summary = summarise(chains, 1);
		assert.equal(summary.maxDepth, 2);
		assert.equal(summary.overLimit.length, 1);
		assert.equal(summary.files[0].depth, 2);
	});
});

describe('buildCallGraph (fixture)', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'call-depth-'));
	const src = path.join(dir, 'src');
	mkdirSync(src);
	writeFileSync(
		path.join(dir, 'tsconfig.json'),
		JSON.stringify({ compilerOptions: { target: 'es2022', module: 'esnext', strict: true } }),
	);
	writeFileSync(
		path.join(src, 'leaf.ts'),
		'export function leaf(): number { return 1; }\nexport class Box { constructor() { leaf(); } read() { return leaf(); } }\n',
	);
	writeFileSync(
		path.join(src, 'top.ts'),
		[
			"import { leaf, Box } from './leaf';",
			'const helper = () => leaf();',
			'export function top() { const box = new Box(); return box.read() + helper(); }',
			'export function external() { return JSON.stringify({}); }',
		].join('\n'),
	);
	writeFileSync(path.join(src, 'top.test.ts'), 'export const ignored = 1;\n');

	it('resolves imports, methods, constructors and arrow functions', () => {
		const files = collectFiles([src]);
		assert.equal(files.length, 2);
		const chains = longestChains(
			buildCallGraph(files, { tsconfig: path.join(dir, 'tsconfig.json') }),
		);
		const topEntry = [...chains].find(([label]) => label.endsWith(' top'));
		assert.ok(topEntry, 'top is in the graph');
		assert.equal(topEntry[1].depth, 3);
		const externalEntry = [...chains].find(([label]) => label.endsWith(' external'));
		assert.equal(externalEntry[1].depth, 1);
	});

	it('returns exit code 1 above the limit and 0 at the limit', () => {
		const originalLog = console.log;
		console.log = () => {};
		try {
			assert.equal(main([src, '--tsconfig', path.join(dir, 'tsconfig.json'), '--max', '2']), 1);
			assert.equal(
				main([src, '--tsconfig', path.join(dir, 'tsconfig.json'), '--max', '3', '--json']),
				0,
			);
		} finally {
			console.log = originalLog;
		}
	});

	it('cleans up', () => {
		rmSync(dir, { recursive: true, force: true });
	});
});
