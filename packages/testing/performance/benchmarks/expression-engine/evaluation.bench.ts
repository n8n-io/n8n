/**
 * Expression Engine Benchmarks
 *
 * Measures expression evaluation performance for baseline tracking
 * and regression detection.
 *
 * ## What These Tests Measure
 *
 * Each benchmark evaluates a different expression pattern to measure specific
 * aspects of the expression engine:
 *
 * | Test | Expression | Measures |
 * |------|------------|----------|
 * | simple property | `$json.name` | Minimal overhead - baseline cost |
 * | nested property | `$json.nested.deep.value` | Property chain resolution |
 * | multiple property | `{{ }} - {{ }}` | Expression splitting/parsing |
 * | string concat | `"Hello " + $json.name` | JS string operations |
 * | template literal | `\`User: ${...}\`` | Template string evaluation |
 * | ternary | `? :` | Conditional branching |
 * | nullish coalescing | `??` | Null handling |
 * | array length | `.length` | Property access on arrays |
 * | array map/filter/find/reduce | `.map()` etc | Iteration performance |
 * | method chain | `.filter().map()` | Chained operations |
 * | scaling tests | Same op, different sizes | O(n) behavior verification |
 *
 * ## Understanding Results
 *
 * - **hz**: Operations per second (higher = faster)
 * - **mean**: Average time per operation in ms
 * - **p99**: 99th percentile (worst-case latency)
 * - **rme**: Relative margin of error (lower = more reliable)
 *
 * ## Regression Detection
 *
 * Compare hz values between runs:
 * - >10% decrease = potential regression
 * - >20% decrease = significant regression
 *
 * Run: pnpm --filter=@n8n/performance bench:expression
 */
import { bench, describe } from 'vitest';
import { Workflow } from 'n8n-workflow';
import type { INodeTypes, INodeType, INodeTypeDescription } from 'n8n-workflow';

// Minimal node types implementation for workflow instantiation
class TestNodeTypes implements INodeTypes {
	getByName(nodeType: string): INodeType {
		return {
			description: {
				name: nodeType,
				displayName: 'Test',
				group: ['transform'],
				version: 1,
				defaults: { name: 'Test' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
			} as INodeTypeDescription,
			execute: async () => [[{ json: {} }]],
		};
	}

	getByNameAndVersion(): INodeType {
		return this.getByName('test.set');
	}

	getKnownTypes(): Record<string, Record<string, unknown>> {
		return {};
	}
}

// Test context data - simulates real workflow data
const createContext = (itemCount: number) => [
	{
		json: {
			name: 'test-user',
			email: 'test@example.com',
			age: 30,
			active: true,
			items: Array(itemCount)
				.fill(null)
				.map((_, i) => ({
					id: i,
					value: i * 10,
					active: i % 2 === 0,
					name: `item-${i}`,
				})),
			nested: {
				deep: {
					value: 42,
					array: [1, 2, 3, 4, 5],
				},
			},
			metadata: {
				createdAt: '2024-01-01T00:00:00Z',
				tags: ['tag1', 'tag2', 'tag3'],
			},
		},
	},
];

// Initialize workflow at module level (synchronous)
const nodeTypes = new TestNodeTypes();
const workflow = new Workflow({
	id: '1',
	nodes: [
		{
			name: 'node',
			typeVersion: 1,
			type: 'test.set',
			id: 'uuid-1234',
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
	active: false,
	nodeTypes,
});

// The function under test - this is what we're benchmarking
const evaluate = (expr: string, data = createContext(100)) =>
	workflow.expression.getParameterValue(expr, null, 0, 0, 'node', data, 'manual', {});

// Warmup - run expressions before benchmarking to ensure JIT is hot
// This prevents the first benchmark from being artificially slow
const defaultData = createContext(100);
for (let i = 0; i < 1000; i++) {
	evaluate('={{ $json.name }}', defaultData);
	evaluate('={{ $json.nested.deep.value }}', defaultData);
	evaluate('={{ $json.items.map(i => i.value) }}', defaultData);
}

describe('Expression Evaluation - Core', () => {
	// BASELINE: Simplest possible expression - measures minimum overhead
	bench('simple property access', () => {
		evaluate('={{ $json.name }}');
	});

	// Tests property chain traversal depth
	bench('nested property access', () => {
		evaluate('={{ $json.nested.deep.value }}');
	});

	// Tests expression parser splitting multiple {{ }} blocks
	bench('multiple property access', () => {
		evaluate('={{ $json.name }} - {{ $json.email }}');
	});

	// Tests JavaScript string concatenation within expression
	bench('string concatenation', () => {
		evaluate('={{ "Hello " + $json.name }}');
	});

	// Tests template literal evaluation
	bench('template literal', () => {
		evaluate('={{ `User: ${$json.name}, Age: ${$json.age}` }}');
	});

	// Tests conditional branching
	bench('ternary expression', () => {
		evaluate('={{ $json.active ? "yes" : "no" }}');
	});

	// Tests null coalescing operator
	bench('nullish coalescing', () => {
		evaluate('={{ $json.missing ?? "default" }}');
	});

	// Tests array property access (not iteration)
	bench('array length', () => {
		evaluate('={{ $json.items.length }}');
	});

	// Tests array iteration - O(n) operation
	bench('array map', () => {
		evaluate('={{ $json.items.map(i => i.value) }}');
	});

	// Tests array iteration with predicate - O(n)
	bench('array filter', () => {
		evaluate('={{ $json.items.filter(i => i.active) }}');
	});

	// Tests array search - O(n) worst case
	bench('array find', () => {
		evaluate('={{ $json.items.find(i => i.id === 50) }}');
	});

	// Tests array aggregation - O(n)
	bench('array reduce', () => {
		evaluate('={{ $json.items.reduce((sum, i) => sum + i.value, 0) }}');
	});

	// Tests method chaining - O(n) + O(n/2)
	bench('method chain (filter + map)', () => {
		evaluate('={{ $json.items.filter(i => i.active).map(i => i.name) }}');
	});
});

describe('Expression Evaluation - Scaling', () => {
	// Tests O(n) scaling behavior - should scale linearly
	// If 1000 items is much more than 10x slower than 100 items, something is wrong

	const sizes = [10, 100, 1000];

	sizes.forEach((size) => {
		bench(`array map (${size} items)`, () => {
			evaluate('={{ $json.items.map(i => i.value) }}', createContext(size));
		});
	});

	sizes.forEach((size) => {
		bench(`array filter (${size} items)`, () => {
			evaluate('={{ $json.items.filter(i => i.active) }}', createContext(size));
		});
	});
});
