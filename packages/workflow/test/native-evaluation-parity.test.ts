// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import type { IWorkflowDataProxyData } from '../src/interfaces';
import { ExpressionExtensions } from '../src/extensions';
import {
	evaluateNatively,
	isNativelyEvaluable,
	CALLABLE_METHODS,
	TIME_METHODS,
	ITERATOR_METHODS,
	MAX_RESULT_LENGTH,
	MAX_STEPS,
	MAX_WORK,
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
	TIME_CORPUS,
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
					value3: '={{ Object.keys($json.item.names) }}',
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

	const sparse = new Array<number>(3);
	sparse[0] = 1;
	sparse[2] = 3;

	const makeItem = (oversized = true) => ({
		pairedItem: { item: 0 },
		binary: {
			file: { data: 'aGVsbG8=', mimeType: 'text/plain', fileName: 'hello.txt', fileSize: '5 B' },
		},
		json: {
			item: {
				name: 'foo',
				count: 2,
				active: true,
				disabled: false,
				nothing: null,
				when: '2024-01-02T03:04:05.000Z',
				my_object: { addresses: { primary: '123 Main St' } },
				names: ['bar', 'baz'],
				mixed: ['a', 1],
				empty: [] as number[],
				sparse,
				...(oversized
					? {
							manyZeros: new Array<number>(MAX_STEPS + 1).fill(0),
							filler: 'x'.repeat(Math.ceil(Math.cbrt(MAX_RESULT_LENGTH))),
							big: 'y'.repeat(20_000),
							bigger: 'y'.repeat(150_000),
							manyEmpty: new Array<string>(20_000).fill(''),
							manyBig: new Array<string>(2_000).fill('z'.repeat(1_000)),
							huge: 'h'.repeat(MAX_RESULT_LENGTH + 1),
							hugeArr: new Array<number>(MAX_RESULT_LENGTH + 1).fill(0),
						}
					: {}),
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
	// A node reference hands the whole item to the engine, so under quickjs
	// every oversized value crosses the bridge. Node reference cases get an
	// item without them.
	const slimItem = makeItem(false);
	const slimRunData = runDataFor([slimItem]);
	const fixtureFor = (expr: string) =>
		/\$\(|\$input|\$node\[/.test(expr)
			? { data: slimRunData, items: [slimItem] }
			: { data: runExecutionData, items: [item] };
	// `$vars` comes in through additionalKeys; `$('Source').item` resolves the
	// paired item through executeData.source.
	const additionalKeys = { $vars: { region: 'eu' } };
	const executeDataFor = (items: Array<ReturnType<typeof makeItem>>) => ({
		node: workflow.getNode('Current')!,
		data: { main: [items] },
		source: { main: [{ previousNode: 'Source' }] },
	});

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
		data = fixtureFor(expr).data,
		items: Array<ReturnType<typeof makeItem>> = fixtureFor(expr).items,
	) => {
		Expression.setNativeEvaluation(native);
		try {
			return expression.getParameterValue(
				expr,
				data,
				0,
				0,
				'Current',
				items,
				'manual',
				additionalKeys,
				executeDataFor(items),
			);
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
		const { data, items } = fixtureFor(expr);
		const proxy = new WorkflowDataProxy(
			workflow,
			data,
			0,
			0,
			'Current',
			items,
			node?.parameters ?? {},
			'manual',
			additionalKeys,
			executeDataFor(items),
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

	// Each side reads its own clock, so the values are compared as instants
	// within a minute of each other; everything else must match exactly.
	describe('time root expressions match the engine result', () => {
		const asInstant = (value: unknown): number | null => {
			if (typeof value === 'number') return value;
			if (typeof value !== 'string') return null;

			const instant = DateTime.fromISO(value.replace(/^since /, ''));
			return instant.isValid ? instant.toMillis() : null;
		};

		test.each(TIME_CORPUS)('%s', (expr) => {
			expect(isNativelyEvaluable(expr.slice(1))).toBe(true);
			expect(nativeOutcome(expr).handled).toBe(true);

			const engineResult = evaluate(expr, false);
			const nativeResult = evaluate(expr, true);
			expect(typeof nativeResult).toBe(typeof engineResult);

			const engineInstant = asInstant(engineResult);
			const nativeInstant = asInstant(nativeResult);
			if (engineInstant === null || nativeInstant === null) {
				expect(nativeResult).toStrictEqual(engineResult);
				return;
			}

			// Milliseconds, seconds (toSeconds, toUnixInteger), or a calendar
			// getter, which must match exactly.
			const tolerance = engineInstant > 1e11 ? 60_000 : engineInstant > 1e8 ? 60 : 0;
			expect(Math.abs(nativeInstant - engineInstant)).toBeLessThanOrEqual(tolerance);
		});

		test('a time root that is not a Luxon DateTime hands off to the engine', () => {
			const dataWith = (value: unknown) => ({ $now: value }) as unknown as IWorkflowDataProxyData;

			expect(evaluateNatively('{{ $now.toMillis() }}', dataWith(new Date()))).toEqual({
				handled: false,
			});
			expect(evaluateNatively('{{ $now.year }}', dataWith({ year: 2026 }))).toEqual({
				handled: false,
			});
			expect(evaluateNatively('{{ $now.year }}', dataWith(DateTime.now()))).toEqual({
				handled: true,
				value: DateTime.now().year,
			});
		});
	});

	describe('non-simple expressions are declined', () => {
		test.each(DECLINED_CORPUS)('%s', (expr) => {
			expect(isNativelyEvaluable(expr.slice(1))).toBe(false);
		});
	});

	describe('expressions that bail at runtime match the engine result', () => {
		// A bail marshals its oversized input into the engine twice. The quickjs
		// bridge takes seconds for that on a loaded CI machine.
		test.each(RUNTIME_BAILOUT_CORPUS)('%s', { timeout: 30_000 }, (expr) => {
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
		test('an extension error is the one extend() throws', () => {
			const expr = '={{ $json.item.name.first() }}';
			const capture = (native: boolean): Error => {
				try {
					evaluate(expr, native);
				} catch (error) {
					return error as Error;
				}
				throw new Error('expected an error');
			};
			expect(capture(true).message).toEqual(capture(false).message);
		});

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

	// Holes are not JSON. The isolates copy the data in and fill them with
	// undefined (quickjs then hands an array result back with null in place of
	// undefined); legacy and native iterate the live array, where the
	// iterators skip them (find visits them). Pinned so a change on either
	// side is visible.
	describe('sparse receivers follow the live array, as under legacy', () => {
		test.each([
			['={{ $json.item.sparse.filter(n => true) }}', [1, 3]],
			['={{ $json.item.sparse.some(n => n === undefined) }}', false],
			['={{ $json.item.sparse.every(n => n > 0) }}', true],
			['={{ $json.item.sparse.find(n => n === undefined) }}', undefined],
		])('%s', (expr, expected) => {
			expect(evaluate(expr, true)).toStrictEqual(expected);

			const viaEngine = evaluate(expr, false);
			const skipsHoles =
				Expression.getActiveImplementation() === 'legacy' || expected === undefined;
			if (skipsHoles) {
				expect(viaEngine).toStrictEqual(expected);
			} else {
				expect(viaEngine).not.toStrictEqual(expected);
			}
		});
	});

	// The quickjs bridge turns a nested -0 into 0 (a top-level -0 survives).
	// Native keeps it, as vm and legacy do. Pinned so a change is visible.
	test('nested -0 survives natively; the quickjs bridge turns it into 0', () => {
		const zeros = { json: { item: { obj: { x: -0 }, arr: [-0], top: -0 } } };
		const data = runDataFor([zeros as never]);
		const run = (expr: string, native: boolean) => evaluate(expr, native, data, [zeros as never]);
		const quickjs = Expression.getActiveImplementation() === 'quickjs';

		expect(run('={{ $json.item.obj }}', true)).toStrictEqual({ x: -0 });
		expect(run('={{ $json.item.arr }}', true)).toStrictEqual([-0]);
		expect(run('={{ $json.item.obj }}', false)).toStrictEqual({ x: quickjs ? 0 : -0 });
		expect(run('={{ $json.item.arr }}', false)).toStrictEqual([quickjs ? 0 : -0]);
		expect(Object.is(run('={{ $json.item.top }}', false), -0)).toBe(true);
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
	// engine or hands the expression to it.
	describe('non-JSON values and inherited members', () => {
		const exotic = {
			json: {
				item: {
					fn: () => 1,
					sym: Symbol('s'),
					dt: DateTime.fromISO('2026-01-02T03:04:05Z'),
					names: ['bar'],
				},
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

		test('a whole-value DateTime read hands off to the engine', () => {
			expect(nativeOutcome('={{ $json.item.my_object }}').handled).toBe(true);
			const data = { $json: exotic.json } as never;
			expect(evaluateNatively('{{ $json.item.dt }}', data)).toEqual({ handled: false });
		});

		// The vm and quickjs serialiser drops an own `__proto__` key; legacy
		// keeps it. Native hands the copy to the engine, whichever it is.
		test('an own __proto__ key on a whole-value read hands off to the engine', () => {
			const payload = { json: { item: JSON.parse('{"__proto__":1,"safe":2}') as object } };
			const data = runDataFor([payload as never]);
			const run = (native: boolean) =>
				evaluate('={{ $json.item }}', native, data, [payload as never]) as object;
			expect(evaluateNatively('{{ $json.item }}', { $json: payload.json } as never)).toEqual({
				handled: false,
			});
			expect(run(true)).toStrictEqual(run(false));
			expect(Object.keys(run(true)).includes('__proto__')).toBe(isLegacy());
		});
	});

	describe('structural guards', () => {
		test('a whole-value read of shared, cyclic, long sparse or non-plain array data hands off to the engine', () => {
			const shared: Record<string, unknown> = { leaf: 1 };
			let fanOut = shared;
			for (let level = 0; level < 30; level++) fanOut = { a: fanOut, b: fanOut };
			const cyclic: Record<string, unknown> = {};
			cyclic.a = cyclic;
			cyclic.b = cyclic;
			const sparse: unknown[] = [];
			sparse[MAX_RESULT_LENGTH] = 1;
			class SubArray extends Array<number> {}
			const subclassed = SubArray.from([1]);

			for (const item of [fanOut, cyclic, sparse, subclassed]) {
				expect(evaluateNatively('{{ $json.item }}', { $json: { item } } as never)).toEqual({
					handled: false,
				});
			}
		});

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

		// Few elements, much content: an element count would charge almost
		// nothing for work that compares or stringifies every character.
		test('element-comparing methods are charged by element content', () => {
			const big = 'x'.repeat(MAX_RESULT_LENGTH);
			const fits = MAX_WORK / MAX_RESULT_LENGTH - 1;
			const list = (count: number) => ({ $json: { list: new Array<string>(count).fill(big) } });
			for (const method of ['includes', 'indexOf', 'lastIndexOf']) {
				const expr = `{{ $json.list.${method}("y") }}`;
				expect(nativeOn(expr, list(fits + 2))).toEqual({ handled: false });
				expect(nativeOn(expr, list(fits)).handled).toBe(true);
			}
			// Twice the content times log2 of the count: 3 elements cost 12
			// receivers, 2 cost 8.
			expect(nativeOn('{{ $json.list.toSorted().length }}', list(3))).toEqual({
				handled: false,
			});
			expect(nativeOn('{{ $json.list.toSorted().length }}', list(2))).toEqual({
				handled: true,
				value: 2,
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
			expect(nativeOn('{{ $json.rows.flat(0).length }}', { $json: { rows: [big, big] } })).toEqual({
				handled: true,
				value: 2,
			});
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

		// The budget is shared by every iterate node of one expression; a chain
		// of two half-budget loops bails where either alone is handled.
		test('callback steps are budgeted per expression', () => {
			const half = new Array<number>(MAX_STEPS / 2 + 1).fill(1);
			expect(nativeOn('{{ $json.half.map(n => n).length }}', { $json: { half } })).toEqual({
				handled: true,
				value: half.length,
			});
			expect(
				nativeOn('{{ $json.half.map(n => n).filter(n => n).length }}', { $json: { half } }),
			).toEqual({ handled: false });
			expect(
				nativeOn('{{ $json.half.map(n => n).length + $json.half.map(n => n).length }}', {
					$json: { half },
				}),
			).toEqual({ handled: false });
		});

		// Visits are cheap to count but not to run: a body can scan or copy a
		// payload string per element. Method inputs and `+` results are charged
		// against a work budget, so the loop hands off after a few visits however
		// many elements there are.
		// An array literal in a body is rebuilt per visit, so its length is
		// charged like a method input.
		test('array literals in a callback body are charged per visit', () => {
			const literal = `[${new Array<number>(1000).fill(0).join(',')}]`;
			const visits = MAX_WORK / 1000;
			expect(
				nativeOn(`{{ $json.many.every(n => ${literal}.length > n) }}`, {
					$json: { many: new Array<number>(visits + 1).fill(0) },
				}),
			).toEqual({ handled: false });
			expect(
				nativeOn(`{{ $json.few.every(n => ${literal}.length > n) }}`, {
					$json: { few: new Array<number>(5).fill(0) },
				}),
			).toEqual({ handled: true, value: true });
		});

		test('callback work is budgeted by the characters it touches', () => {
			const big = 'x'.repeat(MAX_RESULT_LENGTH);
			const many = new Array<string>(100).fill('y');
			const visits = Math.ceil(MAX_WORK / MAX_RESULT_LENGTH);
			expect(
				nativeOn('{{ $json.many.some(n => $json.big.includes(n)) }}', { $json: { many, big } }),
			).toEqual({ handled: false });
			expect(
				nativeOn('{{ $json.many.some(n => ($json.big + "").length < n.length) }}', {
					$json: { many, big },
				}),
			).toEqual({ handled: false });
			expect(
				nativeOn('{{ $json.many.some(n => $json.small.includes(n)) }}', {
					$json: { many, small: 'z' },
				}),
			).toEqual({ handled: true, value: false });
			// The loop's own receiver counts too, so one scan short of the budget
			// is handled and the budget's worth of scans bails.
			expect(
				nativeOn('{{ $json.few.some(n => $json.big.includes(n)) }}', {
					$json: { few: many.slice(0, visits - 1), big },
				}),
			).toEqual({ handled: true, value: false });
			expect(
				nativeOn('{{ $json.few.some(n => $json.big.includes(n)) }}', {
					$json: { few: many.slice(0, visits), big },
				}),
			).toEqual({ handled: false });
		});

		// A `$parameter` read resolves a nested expression in its own evaluation,
		// with its own budgets. Read once per evaluation (as the vm bridge does),
		// a body cannot resolve it once per element.
		test('a $parameter value is resolved once per evaluation', () => {
			let reads = 0;
			const $parameter = new Proxy(
				{},
				{
					get: (_, key) => {
						reads++;
						return key === 'x' ? 'z' : undefined;
					},
				},
			);
			const many = new Array<string>(1_000).fill('y');
			expect(
				nativeOn('{{ $json.many.some(n => $parameter.x === n) }}', { $json: { many }, $parameter }),
			).toEqual({ handled: true, value: false });
			expect(reads).toBe(1);
		});

		// map results that reference one payload string are bounded like concat
		// operands: by content, before the result is cloned.
		test('map is bounded by the content its results reference', () => {
			const big = 'x'.repeat(600_000);
			const two = [1, 2];
			expect(
				nativeOn('{{ $json.two.map(n => $json.big).length }}', { $json: { two, big } }),
			).toEqual({ handled: false });
			expect(
				nativeOn('{{ $json.two.map(n => $json.big.length) }}', { $json: { two, big } }),
			).toEqual({ handled: true, value: [600_000, 600_000] });
		});

		test('an inherited member on a callback element hands off to the engine', () => {
			const list = [Object.create({ inherited: 1 }) as object];
			expect(nativeOn('{{ $json.list.map(n => n.inherited) }}', { $json: { list } })).toEqual({
				handled: false,
			});
		});

		test('an own property shadowing a method hands off to the engine', () => {
			const $json = { list: Object.assign(['a'], { join: null }) };
			expect(nativeOn('{{ $json.list.join() }}', { $json })).toEqual({ handled: false });
			expect(nativeOn('{{ $json.list.at(0) }}', { $json })).toEqual({ handled: true, value: 'a' });
		});

		// extendSyntax rewrites the call into extend() dispatch regardless.
		test('an own property does not shadow an extension', () => {
			const $json = { list: Object.assign(['a'], { last: null }) };
			expect(nativeOn('{{ $json.list.last() }}', { $json })).toEqual({ handled: true, value: 'a' });
		});

		// In combined binary mode the host copies every item per all() call, so a
		// body calling it per visit is charged for the items each call returns.
		test('node reference calls in a callback body are charged per item', () => {
			const items = new Array<number>(MAX_RESULT_LENGTH).fill(0);
			const $input = { all: () => items };
			const visits = (count: number) => ({
				$json: { list: new Array<number>(count).fill(0) },
				$input,
			});
			const expr = '{{ $json.list.some(n => $input.all().length === -1) }}';
			const fits = MAX_WORK / MAX_RESULT_LENGTH - 1;
			expect(nativeOn(expr, visits(fits + 2))).toEqual({ handled: false });
			expect(nativeOn(expr, visits(fits))).toEqual({ handled: true, value: false });
		});

		// `$('hasOwnProperty')` resolves through a plain object lookup on the
		// host and hands back Object.prototype.hasOwnProperty, not item data.
		test('a node reference call that returns no item shape hands off to the engine', () => {
			const { hasOwnProperty } = Object.prototype;
			const prototypeNode = {
				$: () => ({ all: () => hasOwnProperty, first: () => hasOwnProperty }),
			};
			expect(nativeOn("{{ $('hasOwnProperty').all().name }}", prototypeNode)).toEqual({
				handled: false,
			});
			expect(nativeOn("{{ $('hasOwnProperty').first() }}", prototypeNode)).toEqual({
				handled: false,
			});
			const item = { json: { a: 1 } };
			const node = { $: () => ({ all: () => [item], first: () => item, last: () => undefined }) };
			expect(nativeOn("{{ $('Source').all().length }}", node)).toEqual({ handled: true, value: 1 });
			expect(nativeOn("{{ $('Source').first().json.a }}", node)).toEqual({
				handled: true,
				value: 1,
			});
			expect(nativeOn("{{ $('Source').last() }}", node)).toEqual({
				handled: true,
				value: undefined,
			});
		});
	});

	// extendSyntax rewrites calls to extension-named methods into extend()
	// dispatch; native evaluation calls natives directly, so its allowlist
	// must never contain an extension name.
	test('method allowlist is disjoint from expression extensions', () => {
		const extensionNames = new Set(
			ExpressionExtensions.flatMap((extension) => Object.keys(extension.functions)),
		);
		for (const method of [...CALLABLE_METHODS, ...ITERATOR_METHODS, ...TIME_METHODS.keys()]) {
			expect(extensionNames.has(method)).toBe(false);
		}
	});
});
