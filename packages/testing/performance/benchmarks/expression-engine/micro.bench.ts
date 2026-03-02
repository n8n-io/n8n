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
import { bench, describe, beforeAll, afterAll } from 'vitest';
import { ExpressionEvaluator, IsolatedVmBridge } from '@n8n/expression-runtime';
import type { IExpressionEvaluator } from '@n8n/expression-runtime';
import {
	DollarSignValidator,
	PrototypeSanitizer,
	ThisSanitizer,
} from 'n8n-workflow/src/expression-sandboxing';

let evaluator: IExpressionEvaluator;

const testData: Record<string, unknown> = {
	$json: { id: 123, name: 'test', email: 'test@example.com' },
	$runIndex: 0,
	$itemIndex: 0,
};

beforeAll(async () => {
	const bridge = new IsolatedVmBridge({ timeout: 5000 });
	evaluator = new ExpressionEvaluator({
		bridge,
		hooks: {
			before: [ThisSanitizer],
			after: [PrototypeSanitizer, DollarSignValidator],
		},
	});
	await evaluator.initialize();
});

afterAll(async () => {
	await evaluator.dispose();
});

describe('Script Compilation', () => {
	// Cache hit: same expression every iteration
	bench('cache hit (repeated expression)', () => {
		evaluator.evaluate('$json.id', testData);
	});

	// Cache miss: unique expression each iteration
	let counter = 0;
	bench('cache miss (unique expressions)', () => {
		evaluator.evaluate(`$json.id + ${counter++}`, testData);
	});
});

describe('Data Complexity', () => {
	const shallowData: Record<string, unknown> = {
		$json: { value: 42 },
	};

	const deepData: Record<string, unknown> = {
		$json: { a: { b: { c: { d: { e: { value: 42 } } } } } },
	};

	bench('shallow access (depth 1)', () => {
		evaluator.evaluate('$json.value', shallowData);
	});

	bench('deep access (depth 6)', () => {
		evaluator.evaluate('$json.a.b.c.d.e.value', deepData);
	});
});

describe('Array Element Access', () => {
	const arrayData: Record<string, unknown> = {
		$json: {
			items: Array.from({ length: 100 }, (_, i) => ({ id: i })),
		},
	};

	bench('single element', () => {
		evaluator.evaluate('$json.items[0].id', arrayData);
	});

	bench('map 100 elements', () => {
		evaluator.evaluate('$json.items.map(i => i.id)', arrayData);
	});
});
