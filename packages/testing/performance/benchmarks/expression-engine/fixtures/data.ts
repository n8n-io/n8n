import { Workflow, Expression } from 'n8n-workflow';
import type { INodeTypes, INodeType, INodeTypeDescription, INodeExecutionData } from 'n8n-workflow';

// Minimal node types for workflow instantiation
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

// ── Workflow factory ──

const nodeTypes = new TestNodeTypes();

export function createWorkflow(): Workflow {
	return new Workflow({
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
			{
				name: 'HTTP Request',
				typeVersion: 1,
				type: 'test.set',
				id: 'uuid-5678',
				position: [100, 0],
				parameters: {},
			},
		],
		connections: {},
		active: false,
		nodeTypes,
	});
}

// ── Evaluate helper ──

export function evaluate(workflow: Workflow, expr: string, data: INodeExecutionData[]): unknown {
	return workflow.expression.getParameterValue(expr, null, 0, 0, 'node', data, 'manual', {});
}

// ── Data generators ──

export function makeSmallData(): INodeExecutionData[] {
	return [
		{
			json: {
				id: 123,
				name: 'John Doe',
				email: 'john@example.com',
				status: 'active',
				date: '2026-03-02T12:00:00.000Z',
				nested: {
					user: {
						profile: {
							displayName: 'johndoe',
							age: 30,
						},
					},
				},
			},
		},
	];
}

export function makeMediumData(): INodeExecutionData[] {
	return [
		{
			json: {
				id: 1,
				name: 'Batch Result',
				items: Array.from({ length: 100 }, (_, i) => ({
					id: i,
					value: i * 10,
					active: i % 2 === 0,
					label: `item-${i}`,
					user: {
						name: `User ${i}`,
						email: `user${i}@example.com`,
					},
				})),
			},
		},
	];
}

export function makeLargeData(): INodeExecutionData[] {
	return [
		{
			json: {
				id: 1,
				name: 'Large Batch',
				items: Array.from({ length: 10_000 }, (_, i) => ({
					id: i,
					value: i * 10,
					active: i % 2 === 0,
					label: `item-${i}`,
					user: {
						name: `User ${i}`,
						profile: {
							age: 20 + (i % 50),
							city: `City ${i % 100}`,
						},
					},
				})),
			},
		},
	];
}

// ── Engine switching helpers ──

export async function useCurrentEngine(): Promise<void> {
	await Expression.disposeVmEvaluator();
	Expression.setExpressionEngine('current');
}

export async function useVmEngine(): Promise<void> {
	Expression.setExpressionEngine('vm');
	await Expression.initializeVmEvaluator();
}
