// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { ExpressionExtensions } from '../src/extensions';
import {
	evaluateNatively,
	isNativelyEvaluable,
	CALLABLE_METHODS,
	MAX_RESULT_LENGTH,
} from '../src/expressions/native-evaluation';
import { WorkflowDataProxy } from '../src/workflow-data-proxy';
import { Expression } from '../src/expression';
import { Workflow } from '../src/workflow';
import { DateTime } from 'luxon';
import {
	DECLINED_CORPUS,
	ENGINE_DECIDED_CORPUS,
	ERROR_CORPUS,
	HANDLED_CORPUS,
	RUNTIME_BAILOUT_CORPUS,
} from './native-evaluation-corpus';

// The expression corpora live in native-evaluation-corpus.ts.

describe('Expression - fast native evaluation parity', () => {
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
				parameters: {
					value1: 'hello',
					value2: '={{ $json.item.name }}',
					value3: '={{ $json.item.names.first() }}',
				},
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

	const makeItem = () => ({
		json: {
			item: {
				name: 'foo',
				count: 2,
				active: true,
				disabled: false,
				nothing: null,
				my_object: { addresses: { primary: '123 Main St' } },
				names: ['bar', 'baz'],
				filler: 'x'.repeat(Math.ceil(Math.cbrt(MAX_RESULT_LENGTH))),
				big: 'y'.repeat(20_000),
				bigger: 'y'.repeat(150_000),
				manyEmpty: new Array<string>(20_000).fill(''),
				manyBig: new Array<string>(2_000).fill('z'.repeat(1_000)),
				re: /o/g,
			},
		},
	});
	const item = makeItem();

	const runDataFor = (items: Array<ReturnType<typeof makeItem>>) =>
		createRunExecutionData({
			resultData: {
				runData: {
					Source: [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							source: [],
							data: { main: [items] },
						},
					],
				},
			},
		});
	const runExecutionData = runDataFor([item]);

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});
	afterEach(() => {
		Expression.setNativeEvaluation(false);
	});

	const evaluate = (
		expr: string,
		native: boolean,
		data = runExecutionData,
		items: Array<ReturnType<typeof makeItem>> = [item],
	) => {
		Expression.setNativeEvaluation(native);
		try {
			return expression.getParameterValue(expr, data, 0, 0, 'Current', items, 'manual', {});
		} finally {
			Expression.setNativeEvaluation(false);
		}
	};

	// The native outcome on its own, through the same data proxy the workflow
	// builds: HANDLED entries must be evaluated natively, RUNTIME_BAILOUT
	// entries must hand off to the engine. Parity alone cannot tell the two
	// apart, since a bailout returns the engine's value either way.
	const nativeOutcome = (expr: string) => {
		const node = workflow.getNode('Current');
		const proxy = new WorkflowDataProxy(
			workflow,
			runExecutionData,
			0,
			0,
			'Current',
			[item],
			node?.parameters ?? {},
			'manual',
			{},
		).getDataProxy();

		Expression.setNativeEvaluation(true);
		try {
			return evaluateNatively(expr.slice(1), proxy);
		} finally {
			Expression.setNativeEvaluation(false);
		}
	};

	describe('handled expressions match the engine result', () => {
		test.each(HANDLED_CORPUS)('%s', (expr) => {
			// Guard against the parity check passing vacuously: the expression
			// must actually fit the subset.
			expect(isNativelyEvaluable(expr.slice(1))).toBe(true);
			expect(nativeOutcome(expr).handled).toBe(true);

			const engineResult = evaluate(expr, false);
			const nativeResult = evaluate(expr, true);
			expect(nativeResult).toStrictEqual(engineResult);
		});
	});

	describe('non-simple expressions are declined', () => {
		test.each(DECLINED_CORPUS)('%s', (expr) => {
			expect(isNativelyEvaluable(expr.slice(1))).toBe(false);
		});
	});

	describe('expressions that bail at runtime match the engine result', () => {
		test.each(RUNTIME_BAILOUT_CORPUS)('%s', (expr) => {
			expect(isNativelyEvaluable(expr.slice(1))).toBe(true);
			expect(nativeOutcome(expr).handled).toBe(false);

			const engineResult = evaluate(expr, false);
			const nativeResult = evaluate(expr, true);
			expect(nativeResult).toStrictEqual(engineResult);
		});
	});

	describe('errors match the engine', () => {
		// No execution data for the source node: every `$json` read throws.
		const emptyRunData = runDataFor([]);

		test.each(ERROR_CORPUS)('%s', (expr) => {
			expect(isNativelyEvaluable(expr.slice(1))).toBe(true);

			const capture = (native: boolean): Error => {
				try {
					evaluate(expr, native, emptyRunData, []);
				} catch (error) {
					return error as Error;
				}
				throw new Error('expected an error');
			};
			const engineError = capture(false);
			const nativeError = capture(true);
			expect(nativeError).toBeInstanceOf(engineError.constructor);
			expect(nativeError.message).toBe(engineError.message);
		});
	});

	test('object results are copies, never the live execution data', () => {
		const fresh = makeItem();
		const result = evaluate('={{ $json.item.my_object }}', true, runDataFor([fresh]), [fresh]);
		expect(result).toStrictEqual(fresh.json.item.my_object);
		expect(result).not.toBe(fresh.json.item.my_object);

		(result as { addresses: { primary: string } }).addresses.primary = 'changed';
		expect(fresh.json.item.my_object.addresses.primary).toBe('123 Main St');
	});

	// Values no node should produce (the engine does not enforce that yet) and
	// inherited members on the root. Native either matches the configured
	// engine or hands the expression to it; the one remaining divergence is
	// the DateTime copy under legacy, pinned so a change is visible.
	describe('non-JSON values and inherited members', () => {
		const exotic = {
			json: {
				item: { fn: () => 1, sym: Symbol('s'), dt: DateTime.fromISO('2026-01-02T03:04:05Z') },
			},
		};
		const exoticRunData = runDataFor([exotic as never]);
		const evaluateExotic = (expr: string, native: boolean) =>
			evaluate(expr, native, exoticRunData, [exotic as never]);
		// Read per test: the engine is only initialised once the suite runs.
		const isLegacy = () => Expression.getActiveImplementation() === 'legacy';

		test.each(ENGINE_DECIDED_CORPUS)('%s matches the engine, value or error', (expr) => {
			const capture = (native: boolean) => {
				try {
					return { value: evaluateExotic(expr, native) };
				} catch (error) {
					return { error: error as Error };
				}
			};
			const viaEngine = capture(false);
			const viaNative = capture(true);

			if (viaEngine.error) {
				expect(viaNative.error).toBeInstanceOf(viaEngine.error.constructor);
				expect(viaNative.error?.message).toBe(viaEngine.error.message);
			} else {
				expect(viaNative).toStrictEqual(viaEngine);
			}
		});

		test('a whole-value DateTime read is a copy natively; legacy returns the instance', () => {
			const legacy = isLegacy();
			const native = evaluateExotic('={{ $json.item.dt }}', true);
			const viaEngine = evaluateExotic('={{ $json.item.dt }}', false);
			expect(native).not.toBeInstanceOf(DateTime);
			expect(viaEngine instanceof DateTime).toBe(legacy);
			// Both copies carry the instant; their cloned Luxon internals (locale
			// and zone caches) depend on the host environment, so compare only
			// what the expression author can observe.
			expect((native as { ts: number }).ts).toBe((viaEngine as { ts: number }).ts);
			// Member reads keep working on both paths.
			expect(evaluateExotic('={{ $json.item.dt.year }}', true)).toBe(2026);
		});
	});

	// extendSyntax rewrites calls to extension-named methods into extend()
	// dispatch; native evaluation calls natives directly, so its allowlist
	// must never contain an extension name.
	test('method allowlist is disjoint from expression extensions', () => {
		const extensionNames = new Set(
			ExpressionExtensions.flatMap((extension) => Object.keys(extension.functions)),
		);
		for (const method of CALLABLE_METHODS) {
			expect(extensionNames.has(method)).toBe(false);
		}
	});
});
