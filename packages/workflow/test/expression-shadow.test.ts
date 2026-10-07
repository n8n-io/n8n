import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

import { Expression } from '../src/expression';
import type { ExpressionEvaluationOutcome, ExpressionShadowRunner } from '../src/expression';

// The shadow run observes the legacy engine only, so these run in the legacy project.
describe.runIf(process.env.N8N_EXPRESSION_ENGINE === 'legacy')('Expression shadow run', () => {
	const data = () =>
		({
			$json: { name: 'n8n', list: [1, 2, 3] },
			$thisRunIndex: 0,
			$thisItemIndex: 0,
		}) as never;

	const resolve = (expression: string) =>
		new Expression('UTC').resolveSimpleParameterValue(expression, data());

	afterEach(() => {
		Expression.setShadowRunner(undefined);
	});

	it('calls the runner before the legacy engine and passes the legacy outcome', () => {
		const calls: string[] = [];
		const outcomes: ExpressionEvaluationOutcome[] = [];
		const runner: ExpressionShadowRunner = {
			beforeLegacy: (context) => {
				calls.push(`before ${context.source} ${context.timezone}`);
				return (legacy) => {
					calls.push('after');
					outcomes.push(legacy);
				};
			},
		};
		Expression.setShadowRunner(runner);

		expect(resolve('={{ $json.name.toUpperCase() }}')).toBe('N8N');
		expect(calls).toEqual(['before {{ $json.name.toUpperCase() }} UTC', 'after']);
		expect(outcomes).toEqual([{ ok: true, value: 'N8N' }]);
	});

	it('passes a legacy error to the runner and still throws it to the caller', () => {
		const outcomes: ExpressionEvaluationOutcome[] = [];
		Expression.setShadowRunner({ beforeLegacy: () => (legacy) => outcomes.push(legacy) });

		expect(() => resolve('={{ ) }}')).toThrow('invalid syntax');
		expect(outcomes).toEqual([expect.objectContaining({ ok: false, errorClass: 'SyntaxError' })]);
	});

	it('keeps the legacy result when the runner throws', () => {
		Expression.setShadowRunner({
			beforeLegacy: () => {
				throw new Error('shadow bug');
			},
		});

		expect(resolve('={{ $json.list.length }}')).toBe(3);
	});

	it('keeps the legacy result when the outcome callback throws', () => {
		Expression.setShadowRunner({
			beforeLegacy: () => () => {
				throw new Error('shadow bug');
			},
		});

		expect(resolve('={{ $json.list.length }}')).toBe(3);
	});

	describe('createQuickJsShadowEvaluator', () => {
		const start = async (bridgeTimeout = 5000) => {
			const require = createRequire(import.meta.url);
			const runtimeBundle = await readFile(
				require.resolve('@n8n/expression-runtime/runtime-bundle.iife.js'),
				'utf8',
			);
			return await Expression.createQuickJsShadowEvaluator({
				bridgeTimeout,
				bridgeMemoryLimit: 128,
				maxCodeCacheSize: 1024,
				runtimeBundle,
			});
		};

		it('evaluates next to the legacy engine without replacing it', async () => {
			const evaluator = await start();
			try {
				expect(evaluator.evaluate('{{ $json.list.length + 1 }}', data(), 'UTC')).toEqual({
					ok: true,
					value: 4,
				});
				expect(Expression.getActiveImplementation()).toBe('legacy');
			} finally {
				await evaluator.dispose();
			}
		});

		it('returns a timeout as an outcome instead of throwing', async () => {
			const evaluator = await start(50);
			try {
				expect(
					evaluator.evaluate('{{ (() => { while (true) {} })() }}', data(), 'UTC'),
				).toMatchObject({ ok: false, errorClass: 'timeout' });
			} finally {
				await evaluator.dispose();
			}
		});
	});
});
