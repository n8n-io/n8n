// @vitest-environment jsdom

// Property-based parity for fast native evaluation.
//
// The corpus (native-evaluation-corpus.ts) pins hand-picked shapes; this
// file generates random expressions over the subset grammar together with
// random JSON data and asserts that the native path and the engine agree on
// the value, or fail with the same error. It covers the value space the
// corpus cannot enumerate: -0, empty strings, nulls in arithmetic, unicode,
// odd method arguments. Runs once per engine project (vitest.config.ts).

import fc from 'fast-check';

import * as Helpers from './helpers';
import type { IDataObject } from '../src';
import { createRunExecutionData } from '../src';
import { Expression } from '../src/expression';
import { CALLABLE_METHODS, ITERATOR_METHODS } from '../src/expressions/native-evaluation';
import { Workflow } from '../src/workflow';

// Three pre-existing, flag-independent quickjs bridge behaviours are kept out
// of the comparison: a string is truncated at its first NUL character on the
// way across, a lone surrogate (which indexing an astral character yields)
// comes back as U+FFFD replacement characters, and undefined inside an array
// result comes back as null (vm keeps undefined; native sides with vm). Data
// strings stay NUL-free and inside the Basic Multilingual Plane; the array
// case is skipped below.
const noNul = (s: string) => !s.includes('\0');
const bmpString = (maxLength: number) =>
	fc
		.string({ unit: 'binary', maxLength })
		.filter((s) => noNul(s) && [...s].every((c) => (c.codePointAt(0) ?? 0) < 0x10000));

const KEYS = ['a', 'b', 'c', 'd'] as const;
const INNER_KEYS = ['x', 'y'] as const;

const primitive = fc.oneof(
	fc.string({ maxLength: 6 }).filter(noNul),
	bmpString(4),
	fc.integer({ min: -100, max: 100 }),
	fc.double({ noNaN: true, noDefaultInfinity: true }),
	fc.boolean(),
	fc.constant(null),
);

// Array elements include nested arrays and objects: the methods that
// stringify elements (join, toSorted) must hand those to the engine.
const element = fc.oneof(
	{ weight: 4, arbitrary: primitive },
	fc.array(primitive, { maxLength: 2 }),
	fc.record({ x: primitive }),
);

const jsonValue = fc.oneof(
	{ weight: 3, arbitrary: primitive },
	fc.array(element, { maxLength: 4 }),
	fc.record({ x: primitive, y: fc.array(element, { maxLength: 3 }) }),
);

const data = fc.record({ a: jsonValue, b: jsonValue, c: jsonValue, d: jsonValue });

const literal = fc.oneof(
	fc
		.string({ maxLength: 6 })
		.filter(noNul)
		.map((s) => JSON.stringify(s)),
	bmpString(3).map((s) => JSON.stringify(s)),
	fc.integer({ min: 0, max: 200 }).map(String),
	fc.double({ min: 0, noNaN: true, noDefaultInfinity: true }).map(String),
	fc.constantFrom('true', 'false', 'null', 'undefined'),
);

const hop = fc.constantFrom('.', '?.');
const path = fc
	.tuple(
		fc.constantFrom(...KEYS),
		fc.oneof(
			fc.constant(''),
			fc.tuple(hop, fc.constantFrom(...INNER_KEYS, 'length')).map(([h, k]) => `${h}${k}`),
			fc
				.tuple(hop, fc.integer({ min: 0, max: 3 }))
				.map(([h, i]) => (h === '.' ? `[${i}]` : `?.[${i}]`)),
		),
	)
	.map(([key, rest]) => `$json.${key}${rest}`);

const arrayLiteral = fc.array(literal, { maxLength: 3 }).map((items) => `[${items.join(', ')}]`);

// Callback bodies read the parameter (`p`), a root path or a literal; one
// level only, since a callback inside a callback is declined anyway.
const paramPath = fc
	.oneof(
		fc.constant(''),
		fc.tuple(hop, fc.constantFrom(...INNER_KEYS, 'length')).map(([h, k]) => `${h}${k}`),
		fc
			.tuple(hop, fc.integer({ min: 0, max: 2 }))
			.map(([h, i]) => (h === '.' ? `[${i}]` : `?.[${i}]`)),
	)
	.map((rest) => `p${rest}`);
const body = fc.oneof(
	{ weight: 3, arbitrary: paramPath },
	literal,
	path,
	fc
		.tuple(
			paramPath,
			fc.constantFrom('===', '!==', '<', '>', '+', '&&', '??'),
			fc.oneof(literal, path, paramPath),
		)
		.map(([l, op, r]) => `(${l} ${op} ${r})`),
	fc
		.tuple(
			paramPath,
			hop,
			fc.constantFrom(...CALLABLE_METHODS),
			fc.array(literal, { maxLength: 1 }),
		)
		.map(([recv, h, method, args]) => `(${recv})${h}${method}(${args.join(', ')})`),
);

const { expr } = fc.letrec<{ expr: string }>((tie) => ({
	expr: fc.oneof(
		{ depthSize: 'small', withCrossShrink: true },
		{ weight: 4, arbitrary: path },
		{ weight: 2, arbitrary: literal },
		arrayLiteral,
		fc
			.tuple(
				fc.oneof({ weight: 3, arbitrary: path }, arrayLiteral, tie('expr')),
				hop,
				fc.constantFrom(...ITERATOR_METHODS),
				body,
			)
			.map(([recv, h, method, b]) => `(${recv})${h}${method}(p => ${b})`),
		fc.tuple(fc.constantFrom('!', '-', '+'), tie('expr')).map(([op, e]) => `${op}(${e})`),
		fc
			.tuple(
				tie('expr'),
				fc.constantFrom('===', '!==', '==', '!=', '<', '<=', '>', '>=', '+', '-', '*', '/', '%'),
				tie('expr'),
			)
			.map(([l, op, r]) => `(${l} ${op} ${r})`),
		fc
			.tuple(tie('expr'), fc.constantFrom('&&', '||', '??'), tie('expr'))
			.map(([l, op, r]) => `(${l} ${op} ${r})`),
		fc.tuple(tie('expr'), tie('expr'), tie('expr')).map(([t, c, a]) => `(${t} ? ${c} : ${a})`),
		fc
			.tuple(
				fc.oneof({ weight: 3, arbitrary: path }, tie('expr')),
				hop,
				fc.constantFrom(...CALLABLE_METHODS),
				fc.array(fc.oneof(literal, path), { maxLength: 2 }),
			)
			.map(([recv, h, method, args]) => `(${recv})${h}${method}(${args.join(', ')})`),
	),
}));

const expression = fc.oneof(
	{ weight: 3, arbitrary: expr.map((e) => `={{ ${e} }}`) },
	fc.tuple(expr, expr).map(([e1, e2]) => `=v: {{ ${e1} }} / {{ ${e2} }}`),
);

describe('Expression - fast native evaluation fuzz parity', () => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Source',
				typeVersion: 1,
				type: 'test.set',
				id: 's',
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Current',
				typeVersion: 1,
				type: 'test.set',
				id: 'c',
				position: [1, 0],
				parameters: {},
			},
		],
		connections: { Source: { main: [[{ node: 'Current', type: 'main', index: 0 }]] } },
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});

	beforeAll(async () => {
		await workflow.expression.acquireIsolate();
	});
	afterAll(async () => {
		await workflow.expression.releaseIsolate();
	});

	const outcome = (expr: string, json: IDataObject, native: boolean) => {
		const item = { json };
		const runData = createRunExecutionData({
			resultData: {
				runData: {
					Source: [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							data: { main: [[item]] },
						},
					],
				},
			},
		});
		Expression.setNativeEvaluation(native);
		try {
			return {
				value: workflow.expression.getParameterValue(
					expr,
					runData,
					0,
					0,
					'Current',
					[item],
					'manual',
					{},
				),
			};
		} catch (error) {
			return { error: error as Error };
		} finally {
			Expression.setNativeEvaluation(false);
		}
	};

	// 300 runs through two engine evaluations each take a few seconds on an
	// isolate engine, and longer when the three engine projects share a
	// machine; the default 5 s test timeout is not a budget for that.
	test('native and engine agree on value or error', { timeout: 30_000 }, () => {
		fc.assert(
			fc.property(expression, data, (expr, json) => {
				const viaEngine = outcome(expr, json, false);
				const viaNative = outcome(expr, json, true);

				const holesAsNull =
					Expression.getActiveImplementation() === 'quickjs' &&
					Array.isArray(viaNative.value) &&
					viaNative.value.some((element) => element === undefined);
				if (holesAsNull) return;

				if (viaEngine.error) {
					expect(viaNative.error).toBeInstanceOf(viaEngine.error.constructor);
					expect(viaNative.error?.message).toBe(viaEngine.error.message);
				} else {
					expect(viaNative).toStrictEqual(viaEngine);
				}
			}),
			{ numRuns: 300 },
		);
	});
});
