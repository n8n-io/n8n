// @vitest-environment jsdom

import { createPairedItemPagination } from './fixtures/paired-item-pagination';
import * as Helpers from './helpers';
import type * as NativeEvaluation from '../src/expressions/native-evaluation';
import { canVerifyNatively, nativeSkeleton } from '../src/expressions/native-evaluation/verify';
import type { IDataObject } from '../src/interfaces';

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
	const report = vi.fn();
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

	const evaluate = (value: string, json: IDataObject = { name: 'secret-name' }) =>
		modules.workflow.expression.getParameterValue(
			value,
			null,
			0,
			0,
			'node',
			[{ json }],
			'manual',
			{},
		);

	beforeEach(() => {
		modules.LoggerProxy.init({ error: vi.fn(), warn, info: vi.fn(), debug: vi.fn() });
		modules.Expression.setNativeEvaluationVerify(1, report);
	});

	afterEach(() => {
		modules.Expression.setNativeEvaluation(false);
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
			expect(nativeSkeleton(expression)).toBe(skeleton);
		});

		test.each([
			['{{ $json.a }}', true],
			['{{ $now.toMillis() }}', false],
			['{{ $json.a > $today.year }}', false],
			['{{ $parameter.a }}', false],
			['{{ $json.list.filter(x => x === $parameter.a) }}', false],
		])('can verify %s: %s', (expression, verifiable) => {
			expect(canVerifyNatively(expression)).toBe(verifiable);
		});
	});

	if (engine === 'vm' || engine === 'quickjs') {
		test.each([1, 2])(
			'verifies item ancestry across 5000 pages with %i rows per page',
			async (rows) => {
				const { Workflow } = await import('../src/workflow');
				const fixture = createPairedItemPagination(5000, rows);
				const workflow = new Workflow({ ...fixture.workflow, nodeTypes: Helpers.NodeTypes() });
				const task = fixture.run.data.resultData.runData.Process[0];
				const input = task.data!.main[0]!;
				await workflow.expression.acquireIsolate();
				try {
					expect(modules.Expression.getActiveImplementation()).toBe(engine);
					const value = workflow.expression.getParameterValue(
						"={{ $('Trigger').item.json.timestamp }}",
						fixture.run.data,
						0,
						0,
						'Process',
						input,
						'manual',
						{},
						{
							node: workflow.getNode('Process')!,
							data: { main: [input] },
							source: { main: task.source },
						},
					);

					expect(value).toBe('2024-01-01T08:00:00.000Z');
					expect(evaluateNatively).toHaveReturnedWith({ handled: true, value });
					expect(report).not.toHaveBeenCalled();
				} finally {
					await workflow.expression.releaseIsolate();
				}
			},
		);

		test('returns the engine result and reports the mismatch without workflow data', () => {
			evaluateNatively.mockReturnValueOnce({ handled: true, value: 'native' });

			expect(evaluate('={{ $json.name.toUpperCase() }}')).toBe('SECRET-NAME');
			expect(report).toHaveBeenCalledTimes(1);
			expect(report).toHaveBeenCalledWith({
				skeleton: '{{ $json.<id>.toUpperCase() }}',
				engine,
				nativeResultType: 'string',
				engineResultType: 'string',
				workflowId: undefined,
			});
			expect(JSON.stringify(report.mock.calls)).not.toContain('secret');
			expect(warn).not.toHaveBeenCalled();
		});

		test('reports the workflow ID', () => {
			const { workflow } = modules;
			const previousId = workflow.id;
			workflow.id = 'wf-1';
			try {
				evaluateNatively.mockReturnValueOnce({ handled: true, value: 'native' });

				evaluate('={{ $json.name.trimStart() }}');

				expect(report.mock.calls[0][0]).toMatchObject({ workflowId: 'wf-1' });
			} finally {
				workflow.id = previousId;
			}
		});

		test('reports each mismatch shape once', () => {
			evaluateNatively
				.mockReturnValueOnce({ handled: true, value: 42 })
				.mockReturnValueOnce({ handled: true, value: 42 });

			evaluate('={{ $json.name.toLowerCase() }}');
			evaluate('={{ $json.name.toLowerCase() }}');

			expect(report).toHaveBeenCalledTimes(1);
		});

		test('warns once when the report limit is reached', () => {
			const verifier = (
				modules.Expression as unknown as { nativeVerifier: { reportedShapes: Set<string> } }
			).nativeVerifier;
			for (let i = 0; verifier.reportedShapes.size < 999; i++) {
				verifier.reportedShapes.add(`filler-${i}`);
			}
			evaluateNatively
				.mockReturnValueOnce({ handled: true, value: 'native' })
				.mockReturnValueOnce({ handled: true, value: 'native' });

			evaluate('={{ $json.name.startsWith(1) }}');
			evaluate('={{ $json.name.endsWith(1) }}');

			expect(report).toHaveBeenCalledTimes(1);
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toContain('report limit');
		});

		test('compares errors', () => {
			evaluateNatively.mockImplementationOnce(() => {
				throw new Error('native failed');
			});

			expect(evaluate('={{ $json.name.trim() }}')).toBe('secret-name');
			expect(report.mock.calls[0][0]).toMatchObject({ nativeResultType: 'error:Error' });
		});

		test('reports an object type without its own constructor key', () => {
			evaluateNatively.mockReturnValueOnce({ handled: true, value: 'native' });

			evaluate('={{ $json.body }}', { body: { constructor: { name: 'secret-type' } } });
			expect(report.mock.calls[0][0]).toMatchObject({ engineResultType: 'Object' });
		});

		test('throws the engine error and does not report the same error', () => {
			expect(() => evaluate("={{ $('Missing').item.json.a }}")).toThrow(
				"Referenced node doesn't exist",
			);
			expect(evaluateNatively.mock.results[0].type).toBe('throw');
			expect(report).not.toHaveBeenCalled();
		});

		test('reports two different errors', () => {
			evaluateNatively.mockImplementationOnce(() => {
				throw new Error('native failed');
			});

			expect(() => evaluate("={{ $node['Missing'].json.a }}")).toThrow(
				"Referenced node doesn't exist",
			);
			expect(report.mock.calls[0][0]).toMatchObject({
				nativeResultType: 'error:Error',
				engineResultType: 'error:ExpressionError',
			});
		});

		test('does not report an engine timeout', async () => {
			const { TimeoutError } = await import('@n8n/expression-runtime');
			const evaluator = (
				modules.Expression as unknown as { vmEvaluator: { evaluate: () => unknown } }
			).vmEvaluator;
			const evaluateSpy = vi.spyOn(evaluator, 'evaluate').mockImplementationOnce(() => {
				throw new TimeoutError('timed out', {});
			});
			try {
				expect(() => evaluate('={{ $json.name.charAt(0) }}')).toThrow('Expression timed out');
				expect(evaluateNatively).toHaveBeenCalled();
				expect(report).not.toHaveBeenCalled();
			} finally {
				evaluateSpy.mockRestore();
			}
		});

		test('does not compare values too large to compare', () => {
			const list = Array.from({ length: 20_000 }, () => 0);
			evaluateNatively.mockReturnValueOnce({ handled: true, value: [...list.slice(1), 1] });

			expect(evaluate('={{ $json.list }}', { list })).toEqual(list);
			expect(evaluateNatively).toHaveBeenCalled();
			expect(report).not.toHaveBeenCalled();
		});

		test('does not report an object key that holds undefined', () => {
			expect(evaluate('={{ $json }}', { n: 1, u: undefined })).toEqual({ n: 1 });
			expect(evaluateNatively).toHaveBeenCalled();
			expect(report).not.toHaveBeenCalled();
		});

		test('reports a different object value next to a key that holds undefined', () => {
			evaluateNatively.mockReturnValueOnce({ handled: true, value: { n: 2, u: undefined } });

			evaluate('={{ $json }}', { n: 1, u: undefined });
			expect(report).toHaveBeenCalledTimes(1);
		});

		test('does not report a match', () => {
			expect(evaluate('={{ $json.name.slice(0, 6) }}')).toBe('secret');
			expect(evaluateNatively).toHaveBeenCalled();
			expect(report).not.toHaveBeenCalled();
		});

		test('only compares the sampled share', () => {
			modules.Expression.setNativeEvaluationVerify(0.5, report);
			const random = vi.spyOn(Math, 'random');

			random.mockReturnValueOnce(0.6);
			expect(evaluate('={{ $json.name.indexOf(1) }}')).toBe(-1);
			expect(evaluateNatively).not.toHaveBeenCalled();

			random.mockReturnValueOnce(0.4);
			expect(evaluate('={{ $json.name.indexOf(1) }}')).toBe(-1);
			expect(evaluateNatively).toHaveBeenCalled();
			random.mockRestore();
		});

		test('does not compare without a reporter', () => {
			modules.Expression.setNativeEvaluationVerify(1);

			expect(evaluate('={{ $json.name.trimEnd() }}')).toBe('secret-name');
			expect(evaluateNatively).not.toHaveBeenCalled();
		});

		test('does not compare while reports cannot be sent', () => {
			modules.Expression.setNativeEvaluationVerify(1, report, () => false);

			expect(evaluate('={{ $json.name.trimStart() }}')).toBe('secret-name');
			expect(evaluateNatively).not.toHaveBeenCalled();
		});

		test('does not compare while native evaluation is on', () => {
			modules.Expression.setNativeEvaluation(true);
			evaluateNatively.mockReturnValueOnce({ handled: true, value: 'native' });

			expect(evaluate('={{ $json.name.padEnd(1) }}')).toBe('native');
			expect(report).not.toHaveBeenCalled();
		});

		test.each(['={{ $now.toMillis() }}', '={{ $parameter.a }}'])(
			'does not evaluate %s twice',
			(expression) => {
				evaluate(expression);
				expect(evaluateNatively).not.toHaveBeenCalled();
				expect(report).not.toHaveBeenCalled();
			},
		);
	} else {
		test('does nothing under the legacy engine', async () => {
			await modules.Expression.initExpressionEngine({
				engine: 'legacy',
				poolSize: 1,
				maxCodeCacheSize: 1024,
				bridgeTimeout: 5000,
				bridgeMemoryLimit: 128,
				nativeEvaluation: false,
				nativeEvaluationVerifySample: 1,
				reportNativeVerifyMismatch: report,
			});
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toContain('vm or quickjs');

			expect(evaluate('={{ $json.name.toUpperCase() }}')).toBe('SECRET-NAME');
			expect(evaluateNatively).not.toHaveBeenCalled();
		});

		test('warns that the sample is ignored while native evaluation is on', async () => {
			await modules.Expression.initExpressionEngine({
				engine: 'legacy',
				poolSize: 1,
				maxCodeCacheSize: 1024,
				bridgeTimeout: 5000,
				bridgeMemoryLimit: 128,
				nativeEvaluation: true,
				nativeEvaluationVerifySample: 1,
				reportNativeVerifyMismatch: report,
			});
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toContain('native evaluation is on');
		});
	}
});
