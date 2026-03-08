/**
 * Expression Engine Benchmarks
 *
 * Answers: "What's the baseline performance of expression evaluation?"
 *
 * These benchmarks establish the hot-path performance for comparing
 * alternative implementations (WASM sandbox, quickjs, etc.)
 *
 * Run: pnpm --filter=@n8n/performance bench
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
				description: '',
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

// Shared workflow instance (simulates production reuse)
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

// Factory for fresh workflow instances
const createWorkflow = () =>
	new Workflow({
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
		nodeTypes: new TestNodeTypes(),
	});

// Test data
const smallData = [
	{
		json: {
			name: 'test-user',
			email: 'test@example.com',
			items: Array(100)
				.fill(null)
				.map((_, i) => ({ id: i, value: i * 10, active: i % 2 === 0 })),
		},
	},
];

const largeData = [
	{
		json: {
			name: 'test-user',
			items: Array(10000)
				.fill(null)
				.map((_, i) => ({ id: i, value: i * 10, active: i % 2 === 0 })),
		},
	},
];

const evaluate = (expr: string, data: typeof smallData | typeof largeData) =>
	workflow.expression.getParameterValue(expr, null, 0, 0, 'node', data, 'manual', {});

describe('Hot Path', () => {
	// Baseline: simplest possible expression
	bench('simple property access', () => {
		evaluate('={{ $json.name }}', smallData);
	});

	// Typical: array transform
	bench('array map (100 items)', () => {
		evaluate('={{ $json.items.map(i => i.value) }}', smallData);
	});

	// Complex: chained operations
	bench('method chain', () => {
		evaluate('={{ $json.items.filter(i => i.active).map(i => i.id) }}', smallData);
	});
});

describe('Cold Start', () => {
	// Answers: "What's the WASM sandbox init cost comparison?"
	bench('first evaluation (fresh workflow)', () => {
		const fresh = createWorkflow();
		fresh.expression.getParameterValue(
			'={{ $json.name }}',
			null,
			0,
			0,
			'node',
			smallData,
			'manual',
			{},
		);
	});

	// Answers: "Should we pool expression workers?"
	bench('reused workflow', () => {
		evaluate('={{ $json.name }}', smallData);
	});
});

describe('Data Transfer', () => {
	// Answers: "What's the overhead of data moving between wasm and node?"
	bench('small context (100 items)', () => {
		evaluate('={{ $json.items.map(i => i.id) }}', smallData);
	});

	bench('large context (10k items)', () => {
		evaluate('={{ $json.items.map(i => i.id) }}', largeData);
	});
});
