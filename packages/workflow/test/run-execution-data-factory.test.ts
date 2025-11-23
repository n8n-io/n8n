import { mock } from 'vitest-mock-extended';

import type { INode, ExecutionError } from '../src/interfaces';
import {
	createRunExecutionData,
	createEmptyRunExecutionData,
	createErrorExecutionData,
	type CreateFullRunExecutionDataOptions,
} from '../src/run-execution-data-factory';

describe('RunExecutionDataFactory', () => {
	describe('createRunExecutionData', () => {
		it('should create a complete IRunExecutionData object with default values', () => {
			const result = createRunExecutionData();

			expect(result).toEqual({
				version: 0,
				startData: {},
				manualData: undefined,
				parentExecution: undefined,
				pushRef: undefined,
				validateSignature: undefined,
				waitTill: undefined,
				resultData: {
					error: undefined,
					runData: {},
					pinData: undefined,
					lastNodeExecuted: undefined,
					metadata: undefined,
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			});
		});

		it('should create a complete IRunExecutionData object with custom options', () => {
			const options = {
				startData: {
					startNodes: [{ name: 'Start', sourceData: { previousNode: 'Previous' } }],
					destinationNode: 'End',
				},
				resultData: {
					runData: { testNode: [] },
					lastNodeExecuted: 'testNode',
				},
				executionData: {
					nodeExecutionStack: [{ node: {} as INode, data: {}, source: null }],
					runtimeData: {
						version: 1 as const,
						establishedAt: 1234567890,
						source: 'webhook' as const,
						credentials: 'test-credentials',
					},
				},
				parentExecution: {
					executionId: 'parent-123',
					workflowId: 'workflow-456',
				},
				validateSignature: true,
				waitTill: new Date('2023-01-01'),
			} satisfies CreateFullRunExecutionDataOptions;

			const result = createRunExecutionData(options);

			expect(result.startData).toEqual(options.startData);
			expect(result.resultData.runData).toEqual(options.resultData.runData);
			expect(result.resultData.lastNodeExecuted).toEqual(options.resultData.lastNodeExecuted);
			expect(result.executionData?.nodeExecutionStack).toEqual(
				options.executionData.nodeExecutionStack,
			);
			expect(result.executionData?.runtimeData).toEqual(options.executionData.runtimeData);
			expect(result.parentExecution).toEqual(options.parentExecution);
			expect(result.validateSignature).toBe(true);
			expect(result.waitTill).toEqual(options.waitTill);
		});

		it('should omit `executionData` if null is passed', () => {
			const result = createRunExecutionData({
				executionData: null,
			});

			expect(result.executionData).toBeUndefined();
			expect(result.startData).toEqual({});
			expect(result.resultData.runData).toEqual({});
		});

		it('should omit `resultData.runData` if null is passed', () => {
			const result = createRunExecutionData({
				resultData: {
					runData: null,
				},
			});

			expect(result.resultData.runData).toBeUndefined();
			expect(result.startData).toEqual({});
			expect(result.executionData).toEqual({
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			});
		});
	});

	describe('createMinimalRunExecutionData', () => {
		it('should create a minimal IRunExecutionData object with empty runData', () => {
			const result = createEmptyRunExecutionData();

			expect(result).toEqual({
				version: 0,
				resultData: {
					runData: {},
				},
			});
		});
	});

	describe('createErrorExecutionData', () => {
		it('should create a IRunExecutionData object for error execution', () => {
			const node: INode = {
				id: 'node-123',
				name: 'TestNode',
				type: 'test',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const error = mock<ExecutionError>({
				message: 'Test error occurred',
				name: 'TestError',
			});

			const result = createErrorExecutionData(node, error);

			expect(result.startData?.destinationNode).toEqual('TestNode');
			expect(result.startData?.runNodeFilter).toEqual(['TestNode']);

			expect(result.executionData?.contextData).toEqual({});
			expect(result.executionData?.metadata).toEqual({});
			expect(result.executionData?.waitingExecution).toEqual({});
			expect(result.executionData?.waitingExecutionSource).toEqual({});

			expect(result.executionData?.nodeExecutionStack).toHaveLength(1);
			expect(result.executionData?.nodeExecutionStack?.[0]?.node).toBe(node);
			expect(result.executionData?.nodeExecutionStack?.[0]?.data.main).toEqual([
				[{ json: {}, pairedItem: { item: 0 } }],
			]);
			expect(result.executionData?.nodeExecutionStack?.[0]?.source).toBe(null);

			expect(result.resultData.runData['TestNode']).toHaveLength(1);
			expect(result.resultData.runData['TestNode'][0]).toEqual({
				startTime: 0,
				executionIndex: 0,
				executionTime: 0,
				error,
				source: [],
			});

			expect(result.resultData.error).toBe(error);
			expect(result.resultData.lastNodeExecuted).toBe('TestNode');
		});
	});
});
