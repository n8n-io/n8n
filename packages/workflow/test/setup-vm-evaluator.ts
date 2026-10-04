import { Expression } from '../src/expression';

// The engine projects (vitest.config.ts) run the tests that evaluate
// expressions once per engine. Only those projects set N8N_EXPRESSION_ENGINE;
// the default project runs everything else once.
const engine = process.env.N8N_EXPRESSION_ENGINE as 'vm' | 'legacy' | 'quickjs' | undefined;

// A test that resolves an expression outside the engine projects would pass
// against one engine only, so it fails here until it is added to ENGINE_TESTS.
if (engine === undefined) {
	const resolve = Expression.prototype.resolveSimpleParameterValue;
	Expression.prototype.resolveSimpleParameterValue = function (value, ...rest) {
		if (typeof value === 'string' && value.startsWith('=')) {
			throw new Error(
				`${expect.getState().testPath} evaluates an expression. Add it to ENGINE_TESTS in vitest.config.ts so it runs once per engine.`,
			);
		}
		return resolve.call(this, value, ...rest);
	};
}

// Initializes the expression evaluator once per vitest worker before all tests,
// and disposes it after.
if (engine === 'vm' || engine === 'quickjs') {
	beforeAll(async () => {
		await Expression.initExpressionEngine({
			engine,
			poolSize: 1,
			maxCodeCacheSize: 1024,
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
		});
		// Guard the dual-engine matrix: if init silently fell back, every suite in
		// this project would pass against the wrong engine.
		if (Expression.getActiveImplementation() !== engine) {
			throw new Error(
				`Expected active expression engine '${engine}', got '${Expression.getActiveImplementation()}'`,
			);
		}
	});

	afterAll(async () => {
		await Expression.disposeExpressionEngine();
	});
}
