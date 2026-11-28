import { Expression } from 'n8n-workflow';

/**
 * Both runners evaluate expressions in the same process, so they share this one
 * evaluator. The settings are the same as in the engine compatibility tests.
 */
export async function startExpressionEngine(): Promise<void> {
	await Expression.initExpressionEngine({
		engine: 'vm',
		poolSize: 1,
		maxCodeCacheSize: 1024,
		bridgeTimeout: 5000,
		bridgeMemoryLimit: 128,
	});
}

export async function stopExpressionEngine(): Promise<void> {
	await Expression.disposeExpressionEngine();
}
