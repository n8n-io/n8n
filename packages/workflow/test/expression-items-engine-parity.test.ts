// @vitest-environment jsdom

import * as Helpers from './helpers';
import { ExpressionError } from '../src/errors/expression.error';
import { createRunExecutionData } from '../src';
import { Workflow } from '../src/workflow';

// Engine-parity tests for `$items()` boundary behaviour.
//
// `$items()` was migrated to a typed-RPC under the VM engine in CAT-2982.
// This file pins the behaviour of edge-case `runIndex` values across both
// the legacy and VM engines so any divergence in how the runtime handles
// host-side errors fails exactly one project. See `vitest.config.ts` for
// the dual-engine setup.

describe('Expression — $items() boundary behaviour (engine parity)', () => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Source',
				typeVersion: 1,
				type: 'test.set',
				id: 'source-1',
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Current',
				typeVersion: 1,
				type: 'test.set',
				id: 'current-1',
				position: [100, 0],
				parameters: {},
			},
		],
		connections: {
			Source: {
				main: [[{ node: 'Current', type: 'main', index: 0 }]],
			},
		},
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});
	const expression = workflow.expression;

	// Two runs of `Source` so `runIndex = -1` and `runIndex = 1` are valid.
	const runExecutionData = createRunExecutionData({
		resultData: {
			runData: {
				Source: [
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						data: { main: [[{ json: { id: 'run0' } }]] },
					},
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 1,
						source: [],
						data: { main: [[{ json: { id: 'run1' } }]] },
					},
				],
			},
		},
	});

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});

	const evaluate = (expr: string) =>
		expression.getParameterValue(
			expr,
			runExecutionData,
			0, // runIndex of the active node — irrelevant for these assertions
			0, // itemIndex
			'Current',
			[{ json: {} }],
			'manual',
			{},
		);

	it('$items("Source", 0, -1) returns the latest run (host -1 sentinel)', () => {
		expect(evaluate('={{ $items("Source", 0, -1)[0].json.id }}')).toBe('run1');
	});

	it('$items("Source", 0, 0) returns the explicitly-named first run', () => {
		expect(evaluate('={{ $items("Source", 0, 0)[0].json.id }}')).toBe('run0');
	});

	it('$items("Source", 0, 999) throws ExpressionError "Run X not found"', () => {
		// Host throws a structured ExpressionError when the runIndex is past
		// the known length. Both engines should surface this as-is.
		expect(() => evaluate('={{ $items("Source", 0, 999) }}')).toThrowError(ExpressionError);
	});

	it('$items("Source", 0, -2) returns undefined — host TypeError is swallowed by both engines', () => {
		// Host's `getNodeExecutionData` only special-cases -1; any other
		// negative runIndex skips the `length <= runIndex` bounds check
		// (because length > negative) and dereferences `runData[name][-2].data`,
		// which throws a plain TypeError. Both engines' E() handler swallows
		// non-ExpressionError throws, so the observable result is undefined.
		// If a future change makes the VM engine surface the TypeError as an
		// error (instead of undefined), this test fails on the vm-engine
		// project and the divergence is caught.
		expect(evaluate('={{ $items("Source", 0, -2) }}')).toBeUndefined();
	});
});
