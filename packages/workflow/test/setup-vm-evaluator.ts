import { Expression } from '../src/expression';

// Only runs when N8N_EXPRESSION_ENGINE=vm is set.
// Initializes the VM evaluator once per vitest worker before all tests,
// and disposes it after.
if (process.env.N8N_EXPRESSION_ENGINE === 'vm') {
	beforeAll(async () => {
		await Expression.initExpressionEngine({
			engine: 'vm',
			poolSize: 1,
			maxCodeCacheSize: 1024,
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
		});
	});

	// Under Stryker, the worker process exits the moment vitest finishes — the
	// OS reclaims isolated-vm native handles either way. Calling dispose here
	// aborts the worker on Node 24 with a native finaliser assertion, which
	// Stryker reports as a dry-run failure.
	if (!process.env.STRYKER_RUN) {
		afterAll(async () => {
			await Expression.disposeExpressionEngine();
		});
	}
}
