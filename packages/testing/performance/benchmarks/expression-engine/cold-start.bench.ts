/**
 * Tier 2: Synchronous isolate cold start
 *
 * Under lazy acquisition (N8N_EXPRESSION_ENGINE_LAZY_ACQUIRE) an evaluation
 * that finds the pool exhausted builds its bridge synchronously on the main
 * thread. This measures that build, one evaluation, and disposal, per engine
 * and for isolated-vm with and without the V8 compile cache.
 *
 * Run: pnpm --filter=@n8n/performance bench
 */
import { bench } from 'vitest';
import { IsolatedVmBridge, QuickJsBridge } from '@n8n/expression-runtime';

import { BENCH_OPTIONS } from '../bench-options';

const EXPRESSION = 'return typeof DateTime !== "undefined" && 40 + 2';

// QuickJS caches its WASM module during an async initialize(); initializeSync()
// requires that to have happened once in the process, as pool warmup does.
const warmup = new QuickJsBridge({ timeout: 5000 });
await warmup.initialize();
await warmup.dispose();

bench(
	'cold start: isolated-vm initializeSync + eval',
	async () => {
		const bridge = new IsolatedVmBridge({ timeout: 5000 });
		bridge.initializeSync();
		bridge.execute(EXPRESSION, {});
		await bridge.dispose();
	},
	BENCH_OPTIONS,
);

bench(
	'cold start: isolated-vm initializeSync + eval, compile cache',
	async () => {
		const bridge = new IsolatedVmBridge({ timeout: 5000, compileCache: true });
		bridge.initializeSync();
		bridge.execute(EXPRESSION, {});
		await bridge.dispose();
	},
	BENCH_OPTIONS,
);

bench(
	'cold start: quickjs initializeSync + eval',
	async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		bridge.initializeSync();
		bridge.execute(EXPRESSION, {});
		await bridge.dispose();
	},
	BENCH_OPTIONS,
);
