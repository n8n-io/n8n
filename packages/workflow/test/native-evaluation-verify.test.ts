// @vitest-environment jsdom

import type * as NativeEvaluation from '../src/expressions/native-evaluation';
import { describeNatively } from '../src/expressions/native-evaluation';

const engine = process.env.N8N_EXPRESSION_ENGINE;

// The shared setup file has already loaded Expression with the real native
// evaluator, so the mocked copy needs fresh modules.
async function loadWithMockedNative() {
	vi.resetModules();
	vi.doMock('../src/expressions/native-evaluation', async (importOriginal) => {
		const original = await importOriginal<typeof NativeEvaluation>();
		return { ...original, evaluateNatively: vi.fn(original.evaluateNatively) };
	});
	const native = await import('../src/expressions/native-evaluation');
	const { Expression } = await import('../src/expression');
	const { workflow } = await import('./ExpressionExtensions/helpers');
	const LoggerProxy = await import('../src/logger-proxy');
	return {
		evaluateNatively: vi.mocked(native.evaluateNatively),
		Expression,
		workflow,
		LoggerProxy,
	};
}

describe('Expression - native evaluation verify mode', () => {
	const warn = vi.fn();
	let modules: Awaited<ReturnType<typeof loadWithMockedNative>>;
	let evaluateNatively: typeof modules.evaluateNatively;

	beforeAll(async () => {
		modules = await loadWithMockedNative();
		evaluateNatively = modules.evaluateNatively;
		if (engine === 'vm' || engine === 'quickjs') {
			await modules.Expression.initExpressionEngine({
				engine,
				poolSize: 1,
				maxCodeCacheSize: 1024,
				bridgeTimeout: 5000,
				bridgeMemoryLimit: 128,
			});
		}
		await modules.workflow.expression.acquireIsolate();
	});

	afterAll(async () => {
		await modules.workflow.expression.releaseIsolate();
		await modules.Expression.disposeExpressionEngine();
		vi.doUnmock('../src/expressions/native-evaluation');
	});

	const evaluate = (value: string) =>
		modules.workflow.expression.getParameterValue(
			value,
			null,
			0,
			0,
			'node',
			[{ json: { name: 'secret-name' } }],
			'manual',
			{},
		);

	beforeEach(() => {
		modules.LoggerProxy.init({ error: vi.fn(), warn, info: vi.fn(), debug: vi.fn() });
		modules.Expression.setNativeEvaluationVerifySample(1);
	});

	afterEach(() => {
		modules.Expression.setNativeEvaluationVerifySample(0);
		vi.clearAllMocks();
	});

	describe('skeleton', () => {
		test.each([
			['{{ $json.name.toUpperCase() }}', '{{ $json.<id>.toUpperCase() }}'],
			['Hi {{ $json.name }}!', '<text>{{ $json.<id> }}<text>'],
			[
				"{{ $('Node A').item.json.email === 'a@b.c' }}",
				'{{ ($(<str>).item.json.<id> === <str>) }}',
			],
			[
				'{{ $json.list.filter(x => x.n > 3).length }}',
				'{{ $json.<id>.filter(x => (x.<id> > <num>)).length }}',
			],
			['{{ $json.list[0] ?? [1, "a"] }}', '{{ ($json.<id>.<num> ?? [<num>, <str>]) }}'],
		])('%s', (expression, skeleton) => {
			expect(describeNatively(expression)?.skeleton).toBe(skeleton);
		});

		test('flags clock reads', () => {
			expect(describeNatively('{{ $now.toMillis() }}')?.readsClock).toBe(true);
			expect(describeNatively('{{ $json.a }}')?.readsClock).toBe(false);
		});
	});

	if (engine === 'vm' || engine === 'quickjs') {
		test('returns the engine result and logs the mismatch without workflow data', () => {
			evaluateNatively.mockReturnValueOnce({ handled: true, value: 'native' });

			expect(evaluate('={{ $json.name.toUpperCase() }}')).toBe('SECRET-NAME');
			expect(warn).toHaveBeenCalledTimes(1);
			const [, meta] = warn.mock.calls[0];
			expect(meta).toEqual({
				skeleton: '{{ $json.<id>.toUpperCase() }}',
				engine,
				nativeResult: 'string',
				engineResult: 'string',
				workflowId: undefined,
			});
			expect(JSON.stringify(warn.mock.calls)).not.toContain('secret');
		});

		test('logs each mismatch shape once', () => {
			evaluateNatively
				.mockReturnValueOnce({ handled: true, value: 42 })
				.mockReturnValueOnce({ handled: true, value: 42 });

			evaluate('={{ $json.name.toLowerCase() }}');
			evaluate('={{ $json.name.toLowerCase() }}');

			expect(warn).toHaveBeenCalledTimes(1);
		});

		test('compares errors', () => {
			evaluateNatively.mockImplementationOnce(() => {
				throw new Error('native failed');
			});

			expect(evaluate('={{ $json.name.trim() }}')).toBe('secret-name');
			expect(warn.mock.calls[0][1]).toMatchObject({ nativeResult: 'error:Error' });
		});

		test('does not log a match', () => {
			expect(evaluate('={{ $json.name.slice(0, 6) }}')).toBe('secret');
			expect(evaluateNatively).toHaveBeenCalled();
			expect(warn).not.toHaveBeenCalled();
		});

		test('never verifies while native evaluation is on', () => {
			modules.Expression.setNativeEvaluation(true);
			try {
				evaluateNatively.mockReturnValueOnce({ handled: true, value: 'native' });

				expect(evaluate('={{ $json.name.padEnd(1) }}')).toBe('native');
				expect(warn).not.toHaveBeenCalled();
			} finally {
				modules.Expression.setNativeEvaluation(false);
			}
		});

		test('ignores the sample when native evaluation is configured on', async () => {
			await modules.Expression.initExpressionEngine({
				engine: engine,
				poolSize: 1,
				maxCodeCacheSize: 1024,
				bridgeTimeout: 5000,
				bridgeMemoryLimit: 128,
				nativeEvaluation: true,
				nativeEvaluationVerifySample: 1,
			});
			modules.Expression.setNativeEvaluation(false);

			expect(warn.mock.calls[0][0]).toContain('native evaluation is on');
			evaluate('={{ $json.name.padStart(1) }}');
			expect(evaluateNatively).not.toHaveBeenCalled();
		});

		test('does not compare clock reads', () => {
			evaluateNatively.mockReturnValueOnce({ handled: true, value: 0 });

			evaluate('={{ $now.toMillis() }}');
			expect(warn).not.toHaveBeenCalled();
		});
	} else {
		test('does nothing under the legacy engine', async () => {
			await modules.Expression.initExpressionEngine({
				engine: 'legacy',
				poolSize: 1,
				maxCodeCacheSize: 1024,
				bridgeTimeout: 5000,
				bridgeMemoryLimit: 128,
				nativeEvaluationVerifySample: 1,
			});
			expect(warn.mock.calls[0][0]).toContain('vm or quickjs');

			expect(evaluate('={{ $json.name.toUpperCase() }}')).toBe('SECRET-NAME');
			expect(evaluateNatively).not.toHaveBeenCalled();
		});
	}
});
