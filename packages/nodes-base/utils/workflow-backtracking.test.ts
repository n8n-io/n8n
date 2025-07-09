import type {
	INodeExecutionData,
	IPairedItemData,
	IRunExecutionData,
	ISourceData,
	ITaskData,
} from 'n8n-workflow';

import { previousTaskData, findPairedItemTroughWorkflowData } from './workflow-backtracking';

describe('backtracking.ts', () => {
	describe('previousTaskData', () => {
		it('should return undefined when source is empty', () => {
			const runData = {};
			const currentRunData: ITaskData = {
				source: [],
				data: { main: [[]] },
				executionTime: 0,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 0,
			};

			const result = previousTaskData(runData, currentRunData);

			expect(result).toBeUndefined();
		});

		it('should return undefined when source is undefined', () => {
			const runData = {};
			const currentRunData: ITaskData = {
				data: { main: [[]] },
				executionTime: 0,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 0,
			} as unknown as ITaskData; // Type assertion to match the expected type

			const result = previousTaskData(runData, currentRunData);

			expect(result).toBeUndefined();
		});

		it('should return undefined when previousNode is undefined', () => {
			const runData = {};
			const currentRunData: ITaskData = {
				source: [{} as unknown as ISourceData],
				data: { main: [[]] },
				executionTime: 0,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 0,
			};

			const result = previousTaskData(runData, currentRunData);

			expect(result).toBeUndefined();
		});

		it('should return undefined when run data for previousNode does not exist', () => {
			const runData = {};
			const currentRunData: ITaskData = {
				source: [{ previousNode: 'node1' }],
				data: { main: [[]] },
				executionTime: 0,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 0,
			};

			const result = previousTaskData(runData, currentRunData);

			expect(result).toBeUndefined();
		});

		it('should return undefined when run data for previousNode is empty', () => {
			const runData = {
				node1: [],
			};
			const currentRunData: ITaskData = {
				source: [{ previousNode: 'node1' }],
				data: { main: [[]] },
				executionTime: 0,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 0,
			};

			const result = previousTaskData(runData, currentRunData);

			expect(result).toBeUndefined();
		});

		it('should return the correct task data from previousNode', () => {
			const expectedTaskData: ITaskData = {
				data: { main: [[{ json: { test: 'value' } }]] },
				executionTime: 100,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 1000,
			} as unknown as ITaskData;

			const runData = {
				node1: [expectedTaskData],
			};
			const currentRunData: ITaskData = {
				source: [{ previousNode: 'node1' }],
				data: { main: [[]] },
				executionTime: 0,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 0,
			};

			const result = previousTaskData(runData, currentRunData);

			expect(result).toBe(expectedTaskData);
		});

		it('should return correct task data using previousNodeRun index', () => {
			const taskData1: ITaskData = {
				data: { main: [[{ json: { run: 1 } }]] },
				executionTime: 100,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 1000,
			} as unknown as ITaskData;

			const taskData2: ITaskData = {
				data: { main: [[{ json: { run: 2 } }]] },
				executionTime: 200,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 2000,
			} as unknown as ITaskData;

			const runData = {
				node1: [taskData1, taskData2],
			};
			const currentRunData: ITaskData = {
				source: [{ previousNode: 'node1', previousNodeRun: 1 }],
				data: { main: [[]] },
				executionTime: 0,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 0,
			};

			const result = previousTaskData(runData, currentRunData);

			expect(result).toBe(taskData2);
		});

		it('should default to index 0 when previousNodeRun is undefined', () => {
			const taskData1: ITaskData = {
				data: { main: [[{ json: { run: 1 } }]] },
				executionTime: 100,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 1000,
			} as unknown as ITaskData;

			const taskData2: ITaskData = {
				data: { main: [[{ json: { run: 2 } }]] },
				executionTime: 200,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 2000,
			} as unknown as ITaskData;

			const runData = {
				node1: [taskData1, taskData2],
			};
			const currentRunData: ITaskData = {
				source: [{ previousNode: 'node1' }],
				data: { main: [[]] },
				executionTime: 0,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 0,
			};

			const result = previousTaskData(runData, currentRunData);

			expect(result).toBe(taskData1);
		});
	});

	describe('findPairedItemTroughWorkflowData', () => {
		it('should return undefined when lastNodeExecuted is undefined', () => {
			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {},
					lastNodeExecuted: undefined,
				},
			};
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 0);

			expect(result).toBeUndefined();
		});

		it('should return undefined when no run data exists for lastNodeExecuted', () => {
			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {},
					lastNodeExecuted: 'node1',
				},
			};
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 0);

			expect(result).toBeUndefined();
		});

		it('should return undefined when run data is empty', () => {
			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {
						node1: [],
					},
					lastNodeExecuted: 'node1',
				},
			};
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 0);

			expect(result).toBeUndefined();
		});

		it('should return undefined when task data is undefined', () => {
			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {
						node1: [undefined as any],
					},
					lastNodeExecuted: 'node1',
				},
			};
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 0);

			expect(result).toBeUndefined();
		});

		it('should return paired item when no previous task data exists', () => {
			const expectedPairedItem: IPairedItemData = { item: 0 };
			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {
						node1: [
							{
								data: { main: [[]] },
								executionTime: 0,
								executionStatus: 'success',
								startTime: 0,
							} as unknown as ITaskData,
						],
					},
					lastNodeExecuted: 'node1',
				},
			};
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: expectedPairedItem,
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 0);

			expect(result).toBe(expectedPairedItem);
		});

		it('should backtrack through workflow data with simple paired item', () => {
			const finalPairedItem: IPairedItemData = { item: 5 };
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};
			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {
						node1: [
							{
								source: [{ previousNode: 'node2' }],
								data: { main: [[item]] },
								executionTime: 100,
								executionStatus: 'success',
								executionIndex: 0,
								startTime: 1000,
							},
						],
						node2: [
							{
								data: { main: [[{ json: { value: 2 }, pairedItem: finalPairedItem }]] },
								executionTime: 200,
								executionStatus: 'success',
								executionIndex: 0,
								startTime: 2000,
							} as unknown as ITaskData,
						],
					},
					lastNodeExecuted: 'node1',
				},
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 0);

			expect(result).toBe(finalPairedItem);
		});

		it('should backtrack through workflow data with object paired item', () => {
			const finalPairedItem: IPairedItemData = { item: 3, input: 1 };
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0, input: 1 },
			};
			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {
						node1: [
							{
								source: [{ previousNode: 'node2' }],
								data: { main: [[item]] },
								executionTime: 100,
								executionStatus: 'success',
								startTime: 1000,
							} as unknown as ITaskData,
						],
						node2: [
							{
								data: { main: [[], [{ json: { value: 2 }, pairedItem: finalPairedItem }]] },
								executionTime: 200,
								executionStatus: 'success',
								startTime: 2000,
							} as unknown as ITaskData,
						],
					},
					lastNodeExecuted: 'node1',
				},
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 0);

			expect(result).toBe(finalPairedItem);
		});

		it('should use itemIndex parameter when paired item is numeric', () => {
			const finalPairedItem: IPairedItemData = { item: 7 };

			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: 2, // Numeric paired item
			};

			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {
						node1: [
							{
								source: [{ previousNode: 'node2' }],
								data: { main: [[item]] },
								executionTime: 100,
								executionStatus: 'success',
								startTime: 1000,
							} as unknown as ITaskData,
						],
						node2: [
							{
								data: {
									main: [
										[
											{ json: {} },
											{ json: {} },
											{ json: { value: 2 }, pairedItem: finalPairedItem },
										],
									],
								},
								executionTime: 200,
								executionStatus: 'success',
								startTime: 2000,
							} as unknown as ITaskData,
						],
					},
					lastNodeExecuted: 'node1',
				},
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 5);

			expect(result).toBe(finalPairedItem);
		});

		it('should handle multiple levels of backtracking', () => {
			const finalPairedItem: IPairedItemData = { item: 10 };
			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {
						node1: [
							{
								source: [{ previousNode: 'node2' }],
								data: { main: [[{ json: { value: 1 }, pairedItem: { item: 0 } }]] },
								executionTime: 100,
								executionStatus: 'success',
								startTime: 1000,
							} as unknown as ITaskData,
						],
						node2: [
							{
								source: [{ previousNode: 'node3' }],
								data: { main: [[{ json: { value: 2 }, pairedItem: { item: 1 } }]] },
								executionTime: 200,
								executionStatus: 'success',
								startTime: 2000,
							} as unknown as ITaskData,
						],
						node3: [
							{
								data: { main: [[null, { json: { value: 3 }, pairedItem: finalPairedItem }]] },
								executionTime: 300,
								executionStatus: 'success',
								startTime: 3000,
							} as unknown as ITaskData,
						],
					},
					lastNodeExecuted: 'node1',
				},
			};
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 0);

			expect(result).toBe(finalPairedItem);
		});

		it('should use last run data when multiple runs exist', () => {
			const finalPairedItem: IPairedItemData = { item: 15 };
			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {
						node1: [
							{
								source: [{ previousNode: 'node2' }],
								data: { main: [[{ json: { value: 1 }, pairedItem: { item: 0 } }]] },
								executionTime: 100,
								executionStatus: 'success',
								startTime: 1000,
							} as unknown as ITaskData,
							{
								source: [{ previousNode: 'node2' }],
								data: { main: [[{ json: { value: 2 }, pairedItem: { item: 0 } }]] },
								executionTime: 150,
								executionStatus: 'success',
								startTime: 1500,
							} as unknown as ITaskData,
						],
						node2: [
							{
								data: { main: [[{ json: { value: 3 }, pairedItem: finalPairedItem }]] },
								executionTime: 200,
								executionStatus: 'success',
								startTime: 2000,
							} as unknown as ITaskData,
						],
					},
					lastNodeExecuted: 'node1',
				},
			};
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 0);

			expect(result).toBe(finalPairedItem);
		});

		it('should handle missing nodeInformationArray gracefully', () => {
			const workflowRunData: IRunExecutionData = {
				resultData: {
					runData: {
						node1: [
							{
								source: [{ previousNode: 'node2' }],
								data: {},
								executionTime: 100,
								executionStatus: 'success',
								startTime: 1000,
							} as unknown as ITaskData,
						],
						node2: [
							{
								data: { main: [[]] },
								executionTime: 200,
								executionStatus: 'success',
								startTime: 2000,
							} as unknown as ITaskData,
						],
					},
					lastNodeExecuted: 'node1',
				},
			};
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemTroughWorkflowData(workflowRunData, item, 0);

			expect(result).toBeUndefined();
		});
	});
});
