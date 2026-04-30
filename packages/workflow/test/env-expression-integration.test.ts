/**
 * Integration test for GHC-8094
 * Bug: $env still errors out despite N8N_BLOCK_ENV_ACCESS_IN_NODE being set to false
 * https://github.com/n8n-io/n8n/issues/29603
 *
 * This test simulates the actual expression evaluation flow.
 */

import { Workflow } from '../src/workflow';
import type { INode, INodeExecutionData, IRunExecutionData, INodeTypes } from '../src/interfaces';

describe('GHC-8094: $env in expression evaluation', () => {
	const originalEnv = process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE;

	// Mock node types
	const mockNodeTypes: INodeTypes = {
		getByNameAndVersion: () => ({
			description: {
				properties: [],
			},
		}),
	} as any;

	afterEach(() => {
		// Restore original value
		if (originalEnv === undefined) {
			delete process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE;
		} else {
			process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = originalEnv;
		}
		delete process.env.TEST_ENV_VAR;
	});

	it('should evaluate $env expression when N8N_BLOCK_ENV_ACCESS_IN_NODE is false', () => {
		// Setup: Unblock env access
		process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'false';
		process.env.TEST_ENV_VAR = 'test_value';

		const nodes: INode[] = [
			{
				id: 'node-1',
				name: 'Test Node',
				typeVersion: 1,
				type: 'n8n-nodes-base.set',
				position: [0, 0],
				parameters: {},
			},
		];

		const connections = {};
		const workflow = new Workflow({
			nodes,
			connections,
			active: false,
			nodeTypes: mockNodeTypes,
		});

		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {},
			},
		};

		const connectionInputData: INodeExecutionData[] = [
			{
				json: {},
			},
		];

		// Evaluate expression with $env
		const result = workflow.expression.getParameterValue(
			'={{ $env.TEST_ENV_VAR }}',
			runExecutionData,
			0,
			0,
			'Test Node',
			connectionInputData,
			'manual',
			{},
		);

		// Should NOT throw and should return the env var value
		expect(result).toBe('test_value');
	});

	it('should throw error when $env is accessed but env is blocked', () => {
		// Setup: Block env access (default)
		process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'true';

		const nodes: INode[] = [
			{
				id: 'node-1',
				name: 'Test Node',
				typeVersion: 1,
				type: 'n8n-nodes-base.set',
				position: [0, 0],
				parameters: {},
			},
		];

		const connections = {};
		const workflow = new Workflow({
			nodes,
			connections,
			active: false,
			nodeTypes: mockNodeTypes,
		});

		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {},
			},
		};

		const connectionInputData: INodeExecutionData[] = [
			{
				json: {},
			},
		];

		// Evaluate expression with $env - should throw
		expect(() =>
			workflow.expression.getParameterValue(
				'={{ $env.SOME_VAR }}',
				runExecutionData,
				0,
				0,
				'Test Node',
				connectionInputData,
				'manual',
				{},
			),
		).toThrow('access to env vars denied');
	});

	it('should handle env unblocking after initial blocking (no state caching)', () => {
		// First: Block env access
		process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'true';

		const nodes: INode[] = [
			{
				id: 'node-1',
				name: 'Test Node',
				typeVersion: 1,
				type: 'n8n-nodes-base.set',
				position: [0, 0],
				parameters: {},
			},
		];

		const connections = {};
		const workflow1 = new Workflow({
			nodes,
			connections,
			active: false,
			nodeTypes: mockNodeTypes,
		});

		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {},
			},
		};

		const connectionInputData: INodeExecutionData[] = [
			{
				json: {},
			},
		];

		// Should throw with blocked env
		expect(() =>
			workflow1.expression.getParameterValue(
				'={{ $env.TEST_VAR }}',
				runExecutionData,
				0,
				0,
				'Test Node',
				connectionInputData,
				'manual',
				{},
			),
		).toThrow('access to env vars denied');

		// Now: Unblock env access (simulating restart with new config)
		process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE = 'false';
		process.env.TEST_ENV_VAR = 'new_value';

		// Create a NEW workflow instance (simulating restart)
		const workflow2 = new Workflow({
			nodes,
			connections,
			active: false,
			nodeTypes: mockNodeTypes,
		});

		// Should work now with the new workflow instance
		// GHC-8094: This would fail if env provider state is cached globally
		const result = workflow2.expression.getParameterValue(
			'={{ $env.TEST_ENV_VAR }}',
			runExecutionData,
			0,
			0,
			'Test Node',
			connectionInputData,
			'manual',
			{},
		);

		expect(result).toBe('new_value');
	});
});
