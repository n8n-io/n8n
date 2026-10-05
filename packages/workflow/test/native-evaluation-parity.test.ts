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
				huge: 'h'.repeat(MAX_RESULT_LENGTH + 1),
				hugeArr: new Array<number>(MAX_RESULT_LENGTH + 1).fill(0),
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

		// concat is bounded by receiver plus arguments. Asserted natively only:
		// the engine would marshal a million-element result.
		test('concat bails when receiver plus arguments exceed the limit', () => {
			expect(nativeOutcome('={{ $json.item.names.concat($json.item.hugeArr) }}').handled).toBe(
				false,
			);
			expect(nativeOutcome('={{ $json.item.names.concat($json.item.names) }}').handled).toBe(true);
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

		// concat is bounded by receiver plus arguments. Asserted natively only:
		// the engine would marshal a million-element result.
		test('concat bails when receiver plus arguments exceed the limit', () => {
			expect(nativeOutcome('={{ $json.item.names.concat($json.item.hugeArr) }}').handled).toBe(
				false,
			);
			expect(nativeOutcome('={{ $json.item.names.concat($json.item.names) }}').handled).toBe(true);
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

	describe('structural guards', () => {
		// Direct calls: the data shapes here cannot come out of a node, so the
		// engines have nothing to agree with.
		const nativeOn = (expr: string, data: Record<string, unknown>) => {
			Expression.setNativeEvaluation(true);
			try {
				return evaluateNatively(expr, data as never);
			} finally {
				Expression.setNativeEvaluation(false);
			}
		};

		// join and toSorted stringify elements; on nested arrays that work is
		// proportional to the nested size, so they only run over primitives.
		test('join and toSorted hand nested elements to the engine', () => {
			const big = new Array<number>(600_000).fill(0);
			const rows = { $json: { rows: [big, big], flat: [3, 1, 2] } };
			expect(nativeOn('{{ $json.rows.join() }}', rows)).toEqual({ handled: false });
			expect(nativeOn('{{ $json.rows.toSorted() }}', rows)).toEqual({ handled: false });
			// The hand-off happens before any element is stringified.
			let stringified = false;
			const spy = {
				toString() {
					stringified = true;
					return 'spy';
				},
			};
			expect(nativeOn('{{ $json.list.join() }}', { $json: { list: [spy, 1] } })).toEqual({
				handled: false,
			});
			expect(nativeOn('{{ $json.list.toSorted() }}', { $json: { list: [spy, 1] } })).toEqual({
				handled: false,
			});
			expect(stringified).toBe(false);
			expect(nativeOn('{{ $json.flat.toSorted() }}', rows)).toEqual({
				handled: true,
				value: [1, 2, 3],
			});
			expect(nativeOn('{{ $json.rows.at(0).length }}', rows)).toEqual({
				handled: true,
				value: 600_000,
			});
		});

		// concat can reference one payload string many times; the clone of the
		// result and every downstream method then pay for each reference, so it
		// is bounded by content size, not element count.
		test('concat is bounded by the content it references', () => {
			const a = ['p'.repeat(300_000), 'q'.repeat(300_000)];
			expect(nativeOn('{{ $json.a.concat($json.a).length }}', { $json: { a } })).toEqual({
				handled: false,
			});
			expect(
				nativeOn('{{ $json.a.concat($json.one).length }}', { $json: { a, one: [1] } }),
			).toEqual({
				handled: true,
				value: 3,
			});
			const n = [{ k: 'r'.repeat(400_000) }];
			expect(nativeOn('{{ $json.n.concat($json.n, $json.n).length }}', { $json: { n } })).toEqual({
				handled: false,
			});
			// Fan-out of one payload string into hundreds of references bails
			// before anything is cloned.
			const fanOut = `{{ $json.big.concat(${'$json.big, '.repeat(499)}$json.big).length }}`;
			const start = performance.now();
			expect(nativeOn(fanOut, { $json: { big: ['x'.repeat(MAX_RESULT_LENGTH)] } })).toEqual({
				handled: false,
			});
			expect(performance.now() - start).toBeLessThan(200);
		});

		test('nesting deeper than the cap is declined', () => {
			expect(isNativelyEvaluable(`{{ ${'!'.repeat(20)}$json.item.active }}`)).toBe(true);
			expect(isNativelyEvaluable(`{{ ${'!'.repeat(100)}$json.item.active }}`)).toBe(false);
		});

		test('an expression too long to cache still evaluates natively', () => {
			const literal = 'x'.repeat(20_000);
			expect(nativeOutcome(`={{ '${literal}' }}`)).toEqual({ handled: true, value: literal });
		});

		test('flat is bounded by the flattened size, not the outer length', () => {
			const big = new Array<number>(600_000).fill(0);
			expect(nativeOutcome('={{ $json.item.names.flat() }}').handled).toBe(true);
			expect(nativeOn('{{ $json.rows.flat() }}', { $json: { rows: [big, big] } })).toEqual({
				handled: false,
			});
			expect(nativeOn('{{ $json.rows.flat(0) }}', { $json: { rows: [big, big] } }).handled).toBe(
				true,
			);
		});

		// A single replacement with context tokens can expand to many times the
		// receiver, so replace bails like replaceAll before anything is built.
		// Receiver and expansion both stay under the size cap here, so only the
		// token check can decline; a token-free twin of the same size is handled.
		test('replace bails on context tokens before allocating', () => {
			const text = 'a'.repeat(1_000) + 'b';
			const context = '$`'.repeat(400);
			const plain = 'x'.repeat(800);
			expect(
				nativeOn('{{ $json.text.replace("b", $json.to) }}', { $json: { text, to: context } }),
			).toEqual({
				handled: false,
			});
			expect(
				nativeOn('{{ $json.text.replace("b", $json.to).length }}', { $json: { text, to: plain } }),
			).toEqual({ handled: true, value: 1_800 });
		});

		test('an inherited member below the root hands off to the engine', () => {
			const $json = { item: Object.create({ inherited: 1 }) as object };
			expect(nativeOn('{{ $json.item.inherited }}', { $json })).toEqual({ handled: false });
			expect(nativeOn('{{ $json.item.missing }}', { $json })).toEqual({
				handled: true,
				value: undefined,
			});
		});

		test('a prototype patched after import does not reach the native path', () => {
			const original = String.prototype.toUpperCase;
			String.prototype.toUpperCase = () => 'patched';
			try {
				expect(nativeOn('{{ $json.name.toUpperCase() }}', { $json: { name: 'foo' } })).toEqual({
					handled: true,
					value: 'FOO',
				});
			} finally {
				String.prototype.toUpperCase = original;
			}
		});

		test('an own property shadowing a method hands off to the engine', () => {
			const $json = { list: Object.assign(['a'], { join: null }) };
			expect(nativeOn('{{ $json.list.join() }}', { $json })).toEqual({ handled: false });
			expect(nativeOn('{{ $json.list.at(0) }}', { $json })).toEqual({ handled: true, value: 'a' });
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
