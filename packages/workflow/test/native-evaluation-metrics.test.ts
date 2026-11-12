import type { ObservabilityProvider } from '@n8n/expression-runtime';
import { EXPRESSION_METRICS } from '@n8n/expression-runtime';
import { mock } from 'vitest-mock-extended';

import { workflow } from './ExpressionExtensions/helpers';
import { Expression } from '../src/expression';
import {
	evaluateNatively,
	MAX_RESULT_LENGTH,
	MAX_STEPS,
} from '../src/expressions/native-evaluation';
import { MAX_DEPTH } from '../src/expressions/native-evaluation/grammar';
import type { IDataObject } from '../src/interfaces';

const engine = process.env.N8N_EXPRESSION_ENGINE as 'vm' | 'legacy' | 'quickjs';

describe('Expression - native evaluation metrics', () => {
	const observability = mock<ObservabilityProvider>({
		metrics: { counter: vi.fn(), gauge: vi.fn(), histogram: vi.fn() },
	});

	beforeAll(async () => {
		await Expression.initExpressionEngine({
			engine,
			poolSize: 1,
			maxCodeCacheSize: 1024,
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
			nativeEvaluation: true,
			observability,
		});
		await workflow.expression.acquireIsolate();
	});

	afterAll(async () => {
		await workflow.expression.releaseIsolate();
		Expression.setNativeEvaluation(false);
	});

	afterEach(() => {
		vi.mocked(observability.metrics.counter).mockClear();
	});

	const evaluate = (value: string, json: IDataObject) =>
		workflow.expression.getParameterValue(value, null, 0, 0, 'node', [{ json }], 'manual', {});

	test.each([
		['={{ $json.name }}', { name: 'a' }, 'handled', 'none'],
		['={{ (() => 1)() }}', {}, 'declined', 'none'],
		['={{ $json.name.toUpperCase() }}', { name: 1 }, 'fallback', 'unsupported_method'],
		['=a {{ $json.name }}', { name: {} }, 'fallback', 'unsupported_type'],
		["={{ $json.name.replace('a', '$&') }}", { name: 'a' }, 'fallback', 'replace_pattern'],
	])('counts %s as %s', (expression, json, result, reason) => {
		evaluate(expression, json);

		expect(observability.metrics.counter).toHaveBeenCalledExactlyOnceWith(
			EXPRESSION_METRICS.nativeEvaluations.name,
			1,
			{ result, reason },
		);
	});

	test('counts an expression that throws natively as handled', () => {
		expect(() => evaluate("={{ $('Missing').item.json.x }}", {})).toThrow();

		expect(observability.metrics.counter).toHaveBeenCalledExactlyOnceWith(
			EXPRESSION_METRICS.nativeEvaluations.name,
			1,
			{ result: 'handled', reason: 'none' },
		);
	});

	test('counts nothing for a value that is not an expression', () => {
		evaluate('plain text', {});

		expect(observability.metrics.counter).not.toHaveBeenCalled();
	});
});

describe('evaluateNatively - fallback reasons', () => {
	const sparse: unknown[] = [];
	sparse[MAX_RESULT_LENGTH] = 1;
	let deep: IDataObject = {};
	for (let level = 0; level <= MAX_DEPTH; level++) deep = { a: deep };

	test.each([
		['{{ $json.item }}', { item: sparse }, 'too_large'],
		['{{ $json.item }}', { item: deep }, 'too_deep'],
		[
			'{{ $json.item.filter(x => true).length }}',
			{ item: new Array(MAX_STEPS + 1).fill(0) },
			'too_much_work',
		],
		['{{ $json.item.toUpperCase() }}', { item: 1 }, 'unsupported_method'],
		['a {{ $json.item }}', { item: {} }, 'unsupported_type'],
		["{{ $json.item.replace('a', '$&') }}", { item: 'a' }, 'replace_pattern'],
	])('%s on %#', (expression, json, fallbackReason) => {
		expect(evaluateNatively(expression, { $json: json } as never)).toEqual({
			handled: false,
			fallbackReason,
		});
	});

	test('a declined expression has no fallback reason', () => {
		expect(evaluateNatively('{{ (() => 1)() }}', { $json: {} } as never)).toEqual({
			handled: false,
		});
	});
});
