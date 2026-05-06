import { Expression } from '../src/expression';

// Only runs when N8N_EXPRESSION_ENGINE is set to 'vm' or 'quickjs'.
// Initializes the expression evaluator once per vitest worker before all tests,
// and disposes it after.
const engine = process.env.N8N_EXPRESSION_ENGINE as 'vm' | 'quickjs' | undefined;
if (engine === 'vm' || engine === 'quickjs') {
	beforeAll(async () => {
		await Expression.initExpressionEngine({
			engine,
			poolSize: 1,
			maxCodeCacheSize: 1024,
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
		});
	});

	afterAll(async () => {
		await Expression.disposeExpressionEngine();
	});
}
