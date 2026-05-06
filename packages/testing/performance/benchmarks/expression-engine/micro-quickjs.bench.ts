/**
 * Tier 2: QuickJS Micro-benchmarks
 *
 * Isolates the costliest operations in the QuickJS expression engine:
 * - QuickJS boundary crossing (single evaluation call)
 * - Script compilation (cache miss vs cache hit)
 * - Data access patterns (shallow vs deep, arrays)
 *
 * These use ExpressionEvaluator and QuickJsBridge directly.
 *
 * Run: pnpm --filter=@n8n/performance bench
 */
import { bench } from 'vitest';
import { ExpressionEvaluator, QuickJsBridge } from '@n8n/expression-runtime';
import {
	DollarSignValidator,
	PrototypeSanitizer,
	ThisSanitizer,
} from 'n8n-workflow/src/expression-sandboxing';

// Top-level await — vitest bench doesn't support beforeAll
const evaluator = new ExpressionEvaluator({
	createBridge: () => new QuickJsBridge({ timeout: 5000 }),
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
bench('quickjs micro: Script Compilation - cache hit (repeated expression)', () => {
	evaluator.evaluate('$json.id', testData, caller);
});

let counter = 0;
bench('quickjs micro: Script Compilation - cache miss (unique expressions)', () => {
	evaluator.evaluate(`$json.id + ${counter++}`, testData, caller);
});

// Data Complexity
const shallowData: Record<string, unknown> = {
	$json: { value: 42 },
};

const deepData: Record<string, unknown> = {
	$json: { a: { b: { c: { d: { e: { value: 42 } } } } } },
};

bench('quickjs micro: Data Complexity - shallow access (depth 1)', () => {
	evaluator.evaluate('$json.value', shallowData, caller);
});

bench('quickjs micro: Data Complexity - deep access (depth 6)', () => {
	evaluator.evaluate('$json.a.b.c.d.e.value', deepData, caller);
});

// Array Element Access
const arrayData: Record<string, unknown> = {
	$json: {
		items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
	},
};

bench('quickjs micro: Array Element Access - single element', () => {
	evaluator.evaluate('$json.items[0].id', arrayData, caller);
});

bench('quickjs micro: Array Element Access - map 100 elements', () => {
	evaluator.evaluate('$json.items.map(i => i.id)', arrayData, caller);
});
