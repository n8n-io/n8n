/**
 * Tier 2: Micro-benchmarks
 *
 * Isolates the costliest operations in the VM expression engine:
 * - ivm boundary crossing (single applySync call)
 * - Proxy creation (resetDataProxies overhead)
 * - Script compilation (cache miss vs cache hit)
 *
 * These use ExpressionEvaluator and IsolatedVmBridge directly.
 *
 * Run: pnpm --filter=@n8n/performance bench
 */
import { bench } from 'vitest';
import { ExpressionEvaluator, IsolatedVmBridge } from '@n8n/expression-runtime';
import {
	DollarSignValidator,
	PrototypeSanitizer,
	ThisSanitizer,
} from 'n8n-workflow/src/expression-sandboxing';

// Top-level await — vitest bench doesn't support beforeAll
const evaluator = new ExpressionEvaluator({
	createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
	maxCodeCacheSize: 1024,
	hooks: {
		before: [ThisSanitizer],
		after: [PrototypeSanitizer, DollarSignValidator],
	},
});
await evaluator.initialize();
const caller = {};
await evaluator.acquire(caller);

const testData: Record<string, unknown> = {
	$json: { id: 123, name: 'test', email: 'test@example.com' },
	$runIndex: 0,
	$itemIndex: 0,
};

// Script Compilation
bench('vm micro: Script Compilation - cache hit (repeated expression)', () => {
	evaluator.evaluate('$json.id', testData, caller);
});

let counter = 0;
bench('vm micro: Script Compilation - cache miss (unique expressions)', () => {
	evaluator.evaluate(`$json.id + ${counter++}`, testData, caller);
});

// Data Complexity
const shallowData: Record<string, unknown> = {
	$json: { value: 42 },
};

const deepData: Record<string, unknown> = {
	$json: { a: { b: { c: { d: { e: { value: 42 } } } } } },
};

bench('vm micro: Data Complexity - shallow access (depth 1)', () => {
	evaluator.evaluate('$json.value', shallowData, caller);
});

bench('vm micro: Data Complexity - deep access (depth 6)', () => {
	evaluator.evaluate('$json.a.b.c.d.e.value', deepData, caller);
});

// Array Element Access
const arrayData: Record<string, unknown> = {
	$json: {
		items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
	},
};

bench('vm micro: Array Element Access - single element', () => {
	evaluator.evaluate('$json.items[0].id', arrayData, caller);
});

bench('vm micro: Array Element Access - map 100 elements', () => {
	evaluator.evaluate('$json.items.map(i => i.id)', arrayData, caller);
});
