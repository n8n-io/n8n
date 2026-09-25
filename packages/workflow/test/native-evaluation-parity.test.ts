// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { ExpressionExtensions } from '../src/extensions';
import {
	isNativelyEvaluable,
	CALLABLE_METHODS,
	MAX_RESULT_LENGTH,
} from '../src/expressions/native-evaluation';
import { Expression } from '../src/expression';
import { Workflow } from '../src/workflow';
import { DateTime } from 'luxon';

// Parity corpus for fast native expression evaluation.
//
// Every expression in HANDLED_CORPUS must (a) fit the native subset and (b)
// produce exactly the same value natively as through the regular pipeline.
// The file runs once per engine project (legacy, vm, quickjs - see
// vitest.config.ts), so native evaluation is pinned against all three
// engines.
//
// Every expression in DECLINED_CORPUS must be outside the subset so it takes
// the engine untouched. Every expression in RUNTIME_BAILOUT_CORPUS fits the
// subset but meets a runtime value the parse could not see, and must bail to
// the engine with the engine's result coming back unchanged.

const HANDLED_CORPUS: string[] = [
	'={{ $json.item.name }}',
	"={{ $json.item.name !== 'foo' }}",
	"={{ $json.item.my_object.addresses.primary ?? 'no address' }}",
	"={{ $json.item.missing ?? 'fallback' }}",
	'={{ $json.item.missing.deep }}',
	'={{ $json.item.names[0] }}',
	'={{ $json.item.count + 1 }}',
	"={{ $json.item.count > 1 ? 'many' : 'one' }}",
	'={{ $json.item.active && $json.item.name }}',
	'={{ $json.item.disabled || $json.item.count }}',
	'={{ !$json.item.active }}',
	'={{ !$json.item.my_object }}',
	'={{ -$json.item.count }}',
	"={{ 'a' + 'b' }}",
	'={{ 5 }}',
	'={{ null }}',
	'={{ undefined }}',
	'={{ $json.item.nothing }}',
	'={{ $json.item.my_object }}',
	'={{ $json.item.names }}',
	'={{ $json.item.my_object?.addresses?.primary }}',
	'={{ $json.item.missing?.deep }}',
	'={{ $json.item.name.length }}',
	'={{ $parameter["value1"] }}',
	"={{ $parameter['missing'] || 'GET' }}",
	// value2 is itself an expression: the $parameter proxy resolves it by
	// re-entering resolveSimpleParameterValue (natively again when enabled).
	'={{ $parameter.value2 }}',
	// value3 is an expression outside the subset: the nested resolution takes
	// the engine while the outer expression stays native.
	'={{ $parameter.value3 }}',
	'=Name: {{ $json.item.name }}!',
	'=({{ $json.item.nothing }})',
	'=count: {{ $json.item.count }} / {{ $json.item.count + 1 }}',
	"=zero: {{ 0 }} false: {{ false }} empty: {{ '' }}",
	'=plain text',
	'=',
	// Allowlisted String.prototype methods on a runtime-verified string
	// receiver.
	"={{ $json.item.name.toUpperCase() === 'FOO' }}",
	'={{ $json.item.name.toLowerCase() }}',
	"={{ $json.item.name.includes('oo') }}",
	"={{ $json.item.name.startsWith('f') && $json.item.name.endsWith('o') }}",
	'={{ $json.item.name.slice(1, 2) }}',
	"={{ $json.item.name.indexOf('o') }}",
	'={{ $json.item.name.trim().toUpperCase() }}',
	'={{ $json.item.missing?.toUpperCase() }}',
	'={{ $json.item.nothing.toUpperCase() }}',
	"={{ $json.item.name.replace('f', 'b') }}",
	"={{ $json.item.name.replaceAll('o', '0') }}",
	'={{ $json.item.count.toFixed(2) }}',
	'={{ $json.item.count.toString() }}',
	'={{ $json.item.count.toPrecision(3) }}',
	"={{ $json.item.names.includes('bar') }}",
	"={{ $json.item.names.indexOf('baz') }}",
	"={{ $json.item.names.join(', ') }}",
	'={{ $json.item.names.slice(0, 1) }}',
	'={{ $json.item.names.at(-1) }}',
	'={{ $json.item.names.toSorted() }}',
	"={{ $json.item.names.toReversed().join('-') }}",
	"={{ $json.item.names.concat('qux') }}",
	'={{ $json.item.names.concat($json.item.names) }}',
	'={{ $json.item.names.flat() }}',
	'={{ $json.item.names.flat(2) }}',
];

// Fits the subset, but a runtime value falls outside what the parse proved:
// evaluation bails and the engine result must come back unchanged.
const RUNTIME_BAILOUT_CORPUS: string[] = [
	// Allowlisted method on a receiver of another type.
	'={{ $json.item.count.toUpperCase() }}',
	'={{ $json.item.name.toFixed(1) }}',
	"={{ $json.item.my_object.includes('x') }}",
	// Operators on object operands: the engine compares and coerces copies.
	"={{ $json.item.my_object + '' }}",
	'={{ $json.item.names === $json.item.names }}',
	'={{ -$json.item.names }}',
	'=Name: {{ $json.item.my_object }}',
	// A result above MAX_RESULT_LENGTH goes to the engine's limits, whether
	// it shows in the result or in the pre-flight bound.
	"={{ $json.item.name.replaceAll('', $json.item.filler).replaceAll('', $json.item.filler).replaceAll('', $json.item.filler) }}",
	"={{ $json.item.big.replaceAll('', $json.item.filler) }}",
	'={{ $json.item.manyEmpty.join($json.item.filler) }}',
	// Object arguments to string methods: a RegExp value in data would run as
	// a live pattern here, while the engines never see it as a regex.
	"={{ $json.item.name.replace($json.item.re, 'X') }}",
	'={{ $json.item.name.includes($json.item.re) }}',
	'={{ $json.item.name.slice($json.item.my_object) }}',
	// Object arguments to array methods: coercion hooks, or a live-reference
	// comparison where the isolate compares copies.
	'={{ $json.item.names.includes($json.item.my_object) }}',
	'={{ $json.item.names.concat($json.item.my_object) }}',
	'={{ $json.item.names.slice($json.item.my_object) }}',
	// Sparse arrays: holes do not cross the bridge the way they exist here.
	'={{ $json.item.sparse }}',
	'={{ $json.item.sparse.flat() }}',
	'={{ $json.item.sparse.slice(0) }}',
	'={{ $json.item.names.concat($json.item.sparse) }}',
];

const DECLINED_CORPUS: string[] = [
	"={{ $json.item.names.filter((n) => n.includes('bar')) }}",
	'={{ $json.item.names.first() }}',
	'={{ Object.keys($json.item) }}',
	'={{ $json.item[$json.item.name] }}',
	'={{ $now }}',
	"={{ $json.item['__proto__'] }}",
	'={{ $json.item.name.constructor }}',
	// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
	'={{ `hi ${$json.item.name}` }}',
	'={{ /foo/.test($json.item.name) }}',
	'={{ (function () { return 1 })() }}',
	'={{ [1, 2, 3] }}',
	'={{ { a: 1 } }}',
	// Extension methods and non-allowlisted natives stay on the engine.
	'={{ $json.item.name.isEmpty() }}',
	'={{ $json.item.name.hash() }}',
	'={{ $json.item.name.padStart(8) }}',
	// sort()/fill() mutate the receiver in place; only immutable variants are
	// allowlisted. A callback makes any call non-simple.
	'={{ $json.item.names.sort() }}',
	"={{ $json.item.names.fill('x') }}",
	'={{ $json.item.names.toSorted((a, b) => a.length - b.length) }}',
	// Iterator-returning methods have no engine-equivalent value.
	'={{ $json.item.names.entries() }}',
	'={{ $json.item.names.values() }}',
	'={{ $json.item.names.keys() }}',
	"={{ $json.item.name['toUpperCase']() }}",
	'={{ $json.item.name.toUpperCase($json.item[$json.item.name]) }}',
	// Syntax errors go to the engine for its error reporting.
	'={{ $json.item. }}',
	// Deep enough to overflow the recursive re-parse: declined, never thrown.
	`={{ $json${'.a'.repeat(5000)} }}`,
];

// Both paths must throw the same error.
const ERROR_CORPUS: string[] = [
	'={{ $json.item.name }}',
	'=Name: {{ $json.item.name }}',
	'={{ $parameter.value2 }}',
];

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
				manyEmpty: new Array<string>(20_000).fill(''),
				re: /o/g,
				// eslint-disable-next-line no-sparse-arrays
				sparse: [1, , 3] as unknown[],
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

	describe('handled expressions match the engine result', () => {
		test.each(HANDLED_CORPUS)('%s', (expr) => {
			// Guard against the parity check passing vacuously: the expression
			// must actually fit the subset.
			expect(isNativelyEvaluable(expr.slice(1))).toBe(true);

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

	// Divergences accepted on purpose, all against the legacy engine only:
	// native evaluation sides with the vm/quickjs engines, which the parity
	// assertions below confirm. Both need data only a Code node can produce.
	// Pinned so a change in either direction is visible.
	describe('known divergences from the legacy engine on non-JSON data', () => {
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

		test('a function-valued read is undefined natively; legacy throws', () => {
			const legacy = isLegacy();
			expect(evaluateExotic('={{ $json.item.fn }}', true)).toBeUndefined();
			if (legacy)
				expect(() => evaluateExotic('={{ $json.item.fn }}', false)).toThrow('this is a function');
			else expect(evaluateExotic('={{ $json.item.fn }}', false)).toBeUndefined();
		});

		test('a symbol-valued read is undefined natively; legacy returns the symbol', () => {
			const legacy = isLegacy();
			expect(evaluateExotic('={{ $json.item.sym }}', true)).toBeUndefined();
			const viaEngine = evaluateExotic('={{ $json.item.sym }}', false);
			if (legacy) expect(typeof viaEngine).toBe('symbol');
			else expect(viaEngine).toBeUndefined();
		});

		test('a whole-value DateTime read is a copy natively; legacy returns the instance', () => {
			const legacy = isLegacy();
			const native = evaluateExotic('={{ $json.item.dt }}', true);
			const viaEngine = evaluateExotic('={{ $json.item.dt }}', false);
			expect(native).not.toBeInstanceOf(DateTime);
			expect(viaEngine instanceof DateTime).toBe(legacy);
			if (!legacy) expect(native).toStrictEqual(viaEngine);
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
