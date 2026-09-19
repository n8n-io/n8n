// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { ExpressionExtensions } from '../src/extensions';
import { isSimpleExpression, CALLABLE_METHODS } from '../src/expressions/simple-expression';
import { Workflow } from '../src/workflow';

// Parity corpus for the simple-expression fast path (POC).
//
// Every expression in HANDLED_CORPUS must (a) be claimed by the classifier
// and (b) produce exactly the same value through the fast path as through
// the regular pipeline. The file runs once per engine project (legacy, vm,
// quickjs — see vitest.config.ts), so the fast path is pinned against all
// three engines.
//
// Every expression in DECLINED_CORPUS must be declined by the classifier so
// it falls through to the engine untouched.
//
// TODO(POC): extend with error-parity cases (expressions where both paths
// must throw, and throw the same error type).

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
	'={{ -$json.item.count }}',
	"={{ 'a' + 'b' }}",
	'={{ 5 }}',
	'={{ null }}',
	'={{ undefined }}',
	'={{ $json.item.nothing }}',
	'={{ $json.item.my_object?.addresses?.primary }}',
	'={{ $json.item.missing?.deep }}',
	'={{ $json.item.name.length }}',
	'={{ $parameter["value1"] }}',
	"={{ $parameter['missing'] || 'GET' }}",
	// value2 is itself an expression: the $parameter proxy resolves it by
	// re-entering resolveSimpleParameterValue (fast path again when enabled).
	'={{ $parameter.value2 }}',
	'=Name: {{ $json.item.name }}!',
	'=({{ $json.item.nothing }})',
	'=count: {{ $json.item.count }} / {{ $json.item.count + 1 }}',
	"=zero: {{ 0 }} false: {{ false }} empty: {{ '' }}",
	'=plain text',
	'=',
	// Native string-method calls (tier 2): allowlisted String.prototype
	// methods on a runtime-verified string receiver.
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

// Claimed by the classifier, but the runtime receiver is not a string, so
// evaluation bails and the engine result must come back unchanged.
const RUNTIME_BAILOUT_CORPUS: string[] = [
	'={{ $json.item.count.toUpperCase() }}',
	'={{ $json.item.name.toFixed(1) }}',
	"={{ $json.item.my_object.includes('x') }}",
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
];

describe('Expression — simple-expression fast path parity', () => {
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
				parameters: { value1: 'hello', value2: '={{ $json.item.name }}' },
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

	const item = {
		json: {
			item: {
				name: 'foo',
				count: 2,
				active: true,
				disabled: false,
				nothing: null,
				my_object: { addresses: { primary: '123 Main St' } },
				names: ['bar', 'baz'],
			},
		},
	};

	const runExecutionData = createRunExecutionData({
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

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});

	const evaluate = (expr: string, fastPath: boolean) => {
		process.env.N8N_EXPRESSION_SIMPLE_PATH = fastPath ? 'true' : 'false';
		try {
			return expression.getParameterValue(
				expr,
				runExecutionData,
				0,
				0,
				'Current',
				[item],
				'manual',
				{},
			);
		} finally {
			delete process.env.N8N_EXPRESSION_SIMPLE_PATH;
		}
	};

	describe('handled expressions match the engine result', () => {
		test.each(HANDLED_CORPUS)('%s', (expr) => {
			// Guard against the parity check passing vacuously: the classifier
			// must actually claim the expression.
			expect(isSimpleExpression(expr.slice(1))).toBe(true);

			const engineResult = evaluate(expr, false);
			const fastResult = evaluate(expr, true);
			expect(fastResult).toStrictEqual(engineResult);
		});
	});

	describe('non-simple expressions are declined', () => {
		test.each(DECLINED_CORPUS)('%s', (expr) => {
			expect(isSimpleExpression(expr.slice(1))).toBe(false);
		});
	});

	describe('claimed expressions that bail at runtime match the engine result', () => {
		test.each(RUNTIME_BAILOUT_CORPUS)('%s', (expr) => {
			expect(isSimpleExpression(expr.slice(1))).toBe(true);

			const engineResult = evaluate(expr, false);
			const fastResult = evaluate(expr, true);
			expect(fastResult).toStrictEqual(engineResult);
		});
	});

	// extendSyntax rewrites calls to extension-named methods into extend()
	// dispatch; the fast path calls natives directly, so its allowlist must
	// never contain an extension name.
	test('method allowlist is disjoint from expression extensions', () => {
		const extensionNames = new Set(
			ExpressionExtensions.flatMap((extension) => Object.keys(extension.functions)),
		);
		for (const method of CALLABLE_METHODS) {
			expect(extensionNames.has(method)).toBe(false);
		}
	});
});
