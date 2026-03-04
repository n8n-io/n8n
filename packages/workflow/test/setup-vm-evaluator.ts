import { Expression } from '../src/expression';

// Only runs when N8N_EXPRESSION_ENGINE=vm is set.
// Initializes the VM evaluator once per vitest worker before all tests,
// and disposes it after.
if (process.env.N8N_EXPRESSION_ENGINE === 'vm') {
	beforeAll(async () => {
		await Expression.initializeVmEvaluator();
	});

	afterAll(async () => {
		await Expression.disposeVmEvaluator();
	});
}
