import { Expression } from '../src/expression';

describe('Expression.initExpressionEngine', () => {
	beforeEach(async () => {
		await Expression.disposeExpressionEngine();
	});

	afterAll(async () => {
		await Expression.disposeExpressionEngine();
	});

	it('leaves the legacy evaluator in place when the runtime bundle does not load', async () => {
		await expect(
			Expression.initExpressionEngine({
				engine: 'quickjs',
				// The browser reads the bundle from an asset; a policy that blocks
				// WASM, or a bad asset, fails the start the same way.
				runtimeBundle: 'this is not javascript (((',
				poolSize: 1,
				maxCodeCacheSize: 1024,
				bridgeTimeout: 5000,
				bridgeMemoryLimit: 128,
			}),
		).rejects.toThrow();

		// A half-started engine reports the selected engine as active while no
		// bridge is acquired, which blocks both a retry and the legacy fallback.
		expect(Expression.getActiveImplementation()).toBe('legacy');
	});

	it('fails loudly on Node when an engine is recorded but never started', async () => {
		await Expression.disposeExpressionEngine();
		// What base-command does for a command that should never evaluate an
		// expression: record the engine without starting one, so an unexpected
		// evaluation is reported instead of silently served by `new Function`.
		Expression.setExpressionEngine('quickjs');

		expect(() =>
			new Expression('UTC').resolveSimpleParameterValue('={{ 1 + 1 }}', {
				$json: {},
				$thisRunIndex: 0,
				$thisItemIndex: 0,
			} as never),
		).toThrow('has not been initialized');

		Expression.setExpressionEngine('legacy');
	});
});

describe('Expression.disposeExpressionEngine', () => {
	afterAll(async () => {
		await Expression.disposeExpressionEngine();
	});

	it('clears the shared browser caller, so a later start is not stuck on it', async () => {
		const { createRequire } = await import('node:module');
		const { readFile } = await import('node:fs/promises');
		const require = createRequire(import.meta.url);
		const runtimeBundle = await readFile(
			require.resolve('@n8n/expression-runtime/runtime-bundle.iife.js'),
			'utf8',
		);
		const options = {
			engine: 'quickjs' as const,
			poolSize: 1,
			maxCodeCacheSize: 1024,
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
		};

		await Expression.disposeExpressionEngine();
		// The browser shape: a pre-loaded bundle, one shared scope, and the runtime
		// built on first use.
		await Expression.initExpressionEngine({
			...options,
			runtimeBundle,
			sharedCaller: true,
			lazyAcquire: true,
		});
		expect(Expression.getActiveImplementation()).toBe('quickjs');

		// The editor never calls acquireIsolate(): it evaluates straight away on a
		// fresh Expression. Without the shared scope this throws "No bridge
		// acquired for this context".
		expect(
			new Expression('UTC').resolveSimpleParameterValue('={{ 1 + 1 }}', {
				$json: {},
				$thisRunIndex: 0,
				$thisItemIndex: 0,
			} as never),
		).toBe(2);

		await Expression.disposeExpressionEngine();

		// The node shape: per-caller isolates. A leftover shared-caller flag would
		// send evaluation to a caller that never acquired a bridge.
		await Expression.initExpressionEngine(options);
		const expression = new Expression('UTC');
		await expression.acquireIsolate();

		expect(
			expression.resolveSimpleParameterValue('={{ 1 + 1 }}', {
				$json: {},
				$thisRunIndex: 0,
				$thisItemIndex: 0,
			} as never),
		).toBe(2);
	});
});
