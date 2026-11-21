import {
	createRunExecutionData,
	type INodeExecutionData,
	type IPairedItemData,
	type ISourceData,
	type ITaskData,
} from 'n8n-workflow';

import { previousTaskData, findPairedItemThroughWorkflowData } from './workflow-backtracking';

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

	describe('findPairedItemThroughWorkflowData', () => {
		it('should return undefined when lastNodeExecuted is undefined', () => {
			const workflowRunData = createRunExecutionData({
				resultData: {
					runData: {},
					lastNodeExecuted: undefined,
				},
			});
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBeUndefined();
		});

		it('should return undefined when no run data exists for lastNodeExecuted', () => {
			const workflowRunData = createRunExecutionData({
				resultData: {
					runData: {},
					lastNodeExecuted: 'node1',
				},
			});
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBeUndefined();
		});

		it('should return undefined when run data is empty', () => {
			const workflowRunData = createRunExecutionData({
				resultData: {
					runData: {
						node1: [],
					},
					lastNodeExecuted: 'node1',
				},
			});
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBeUndefined();
		});

		it('should return undefined when task data is undefined', () => {
			const workflowRunData = createRunExecutionData({
				resultData: {
					runData: {
						node1: [undefined as any],
					},
					lastNodeExecuted: 'node1',
				},
			});
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBeUndefined();
		});

		it('should return paired item when no previous task data exists', () => {
			const expectedPairedItem: IPairedItemData = { item: 0 };
			const workflowRunData = createRunExecutionData({
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
			});
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: expectedPairedItem,
			};

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBe(expectedPairedItem);
		});

		it('should backtrack through workflow data with simple paired item', () => {
			const finalPairedItem: IPairedItemData = { item: 5 };
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};
			const workflowRunData = createRunExecutionData({
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
			});

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBe(finalPairedItem);
		});

		it('should backtrack through workflow data with object paired item', () => {
			const finalPairedItem: IPairedItemData = { item: 3, input: 1 };
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0, input: 1 },
			};
			const workflowRunData = createRunExecutionData({
				resultData: {
					runData: {
						node1: [
							{
								source: [null, { previousNode: 'node2', previousNodeOutput: 1 }],
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
			});

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBe(finalPairedItem);
		});

		it('should follow a numeric paired item', () => {
			const finalPairedItem: IPairedItemData = { item: 7 };

			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: 2, // Numeric paired item
			};

			const workflowRunData = createRunExecutionData({
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
			});

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBe(finalPairedItem);
		});

		it('should handle multiple levels of backtracking', () => {
			const finalPairedItem: IPairedItemData = { item: 10 };
			const workflowRunData = createRunExecutionData({
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
			});
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBe(finalPairedItem);
		});

		it('should use last run data when multiple runs exist', () => {
			const finalPairedItem: IPairedItemData = { item: 15 };
			const workflowRunData = createRunExecutionData({
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
			});
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBe(finalPairedItem);
		});

		it('should handle missing nodeInformationArray gracefully', () => {
			const workflowRunData = createRunExecutionData({
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
			});
			const item: INodeExecutionData = {
				json: { test: 'value' },
				pairedItem: { item: 0 },
			};

			const result = findPairedItemThroughWorkflowData(workflowRunData, item);

			expect(result).toBeUndefined();
		});

		describe('with a multi-input node', () => {
			const task = (
				source: Array<ISourceData | null>,
				items: INodeExecutionData[],
				outputIndex = 0,
			): ITaskData => ({
				source,
				data: { main: [...Array<INodeExecutionData[]>(outputIndex).fill([]), items] },
				executionTime: 0,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 0,
			});

			it('should follow the second input when the first input has no source', () => {
				const firstPairedItem: IPairedItemData = { item: 4 };
				const item: INodeExecutionData = { json: {}, pairedItem: { item: 0, input: 1 } };
				const workflowRunData = createRunExecutionData({
					resultData: {
						runData: {
							trigger: [task([], [{ json: {}, pairedItem: firstPairedItem }])],
							branchB: [
								task([{ previousNode: 'trigger' }], [{ json: {}, pairedItem: { item: 0 } }]),
							],
							merge: [task([null, { previousNode: 'branchB' }], [item])],
						},
						lastNodeExecuted: 'merge',
					},
				});

				expect(findPairedItemThroughWorkflowData(workflowRunData, item)).toBe(firstPairedItem);
			});

			it('should follow the input that the paired item names when both inputs have a source', () => {
				const pairedItemOfA: IPairedItemData = { item: 1 };
				const pairedItemOfB: IPairedItemData = { item: 2 };
				const item: INodeExecutionData = { json: {}, pairedItem: { item: 0, input: 1 } };
				const workflowRunData = createRunExecutionData({
					resultData: {
						runData: {
							branchA: [task([], [{ json: {}, pairedItem: pairedItemOfA }])],
							branchB: [task([], [{ json: {}, pairedItem: pairedItemOfB }])],
							merge: [task([{ previousNode: 'branchA' }, { previousNode: 'branchB' }], [item])],
						},
						lastNodeExecuted: 'merge',
					},
				});

				expect(findPairedItemThroughWorkflowData(workflowRunData, item)).toBe(pairedItemOfB);
			});

			it('should read the output that the source names', () => {
				const firstPairedItem: IPairedItemData = { item: 3 };
				const item: INodeExecutionData = { json: {}, pairedItem: { item: 0 } };
				const workflowRunData = createRunExecutionData({
					resultData: {
						runData: {
							if: [task([], [{ json: {}, pairedItem: firstPairedItem }], 1)],
							last: [task([{ previousNode: 'if', previousNodeOutput: 1 }], [item])],
						},
						lastNodeExecuted: 'last',
					},
				});

				expect(findPairedItemThroughWorkflowData(workflowRunData, item)).toBe(firstPairedItem);
			});

			it('should return undefined when the input of the paired item has no source', () => {
				const item: INodeExecutionData = { json: {}, pairedItem: { item: 0, input: 0 } };
				const workflowRunData = createRunExecutionData({
					resultData: {
						runData: {
							branchB: [task([], [{ json: {}, pairedItem: { item: 0 } }])],
							merge: [task([null, { previousNode: 'branchB' }], [item])],
						},
						lastNodeExecuted: 'merge',
					},
				});

				expect(findPairedItemThroughWorkflowData(workflowRunData, item)).toBeUndefined();
			});
		});

		describe('with an item that has several paired items', () => {
			const task = (source: Array<ISourceData | null>, items: INodeExecutionData[]): ITaskData => ({
				source,
				data: { main: [items] },
				executionTime: 0,
				executionStatus: 'success',
				executionIndex: 0,
				startTime: 0,
			});
			const triggerItems = (...origins: number[]): INodeExecutionData[] =>
				origins.map((origin) => ({ json: {}, pairedItem: { item: origin } }));
			const runDataEndingWith = (lastNodeExecuted: string, runData: Record<string, ITaskData[]>) =>
				createRunExecutionData({ resultData: { runData, lastNodeExecuted } });

			it('should keep the origin of each item that the last node aggregates', () => {
				const item: INodeExecutionData = { json: {}, pairedItem: [{ item: 0 }, { item: 1 }] };
				const workflowRunData = runDataEndingWith('aggregate', {
					trigger: [task([], triggerItems(0, 1))],
					aggregate: [task([{ previousNode: 'trigger' }], [item])],
				});

				expect(findPairedItemThroughWorkflowData(workflowRunData, item)).toEqual([
					{ item: 0 },
					{ item: 1 },
				]);
			});

			it('should keep the origin of each item that a node before the last node aggregates', () => {
				const item: INodeExecutionData = { json: {}, pairedItem: { item: 0 } };
				const workflowRunData = runDataEndingWith('last', {
					trigger: [task([], triggerItems(3, 4))],
					aggregate: [
						task(
							[{ previousNode: 'trigger' }],
							[{ json: {}, pairedItem: [{ item: 0 }, { item: 1 }] }],
						),
					],
					last: [task([{ previousNode: 'aggregate' }], [item])],
				});

				expect(findPairedItemThroughWorkflowData(workflowRunData, item)).toEqual([
					{ item: 3 },
					{ item: 4 },
				]);
			});

			it('should follow each paired item through the input, the output and the run that it names', () => {
				const item: INodeExecutionData = {
					json: {},
					pairedItem: [
						{ item: 0, input: 0 },
						{ item: 0, input: 1 },
					],
				};
				const branchB: ITaskData = {
					...task([{ previousNode: 'trigger' }], []),
					data: { main: [[], [{ json: {}, pairedItem: { item: 1 } }]] },
				};
				const workflowRunData = runDataEndingWith('merge', {
					trigger: [task([], triggerItems(5, 6))],
					branchA: [task([{ previousNode: 'trigger' }], [{ json: {}, pairedItem: { item: 0 } }])],
					branchB: [task([{ previousNode: 'trigger' }], []), branchB],
					merge: [
						task(
							[
								{ previousNode: 'branchA' },
								{ previousNode: 'branchB', previousNodeOutput: 1, previousNodeRun: 1 },
							],
							[item],
						),
					],
				});

				expect(findPairedItemThroughWorkflowData(workflowRunData, item)).toEqual([
					{ item: 5 },
					{ item: 6 },
				]);
			});

			it('should return one paired item when all paths end at the same item', () => {
				const origin: IPairedItemData = { item: 2 };
				const item: INodeExecutionData = {
					json: {},
					pairedItem: [
						{ item: 0, input: 0 },
						{ item: 0, input: 1 },
					],
				};
				const workflowRunData = runDataEndingWith('merge', {
					trigger: [task([], [{ json: {}, pairedItem: origin }])],
					branchA: [task([{ previousNode: 'trigger' }], [{ json: {}, pairedItem: { item: 0 } }])],
					branchB: [task([{ previousNode: 'trigger' }], [{ json: {}, pairedItem: { item: 0 } }])],
					merge: [task([{ previousNode: 'branchA' }, { previousNode: 'branchB' }], [item])],
				});

				expect(findPairedItemThroughWorkflowData(workflowRunData, item)).toBe(origin);
			});

			it('should return undefined when one of the paths does not reach the first task', () => {
				const item: INodeExecutionData = { json: {}, pairedItem: [{ item: 0 }, { item: 1 }] };
				const workflowRunData = runDataEndingWith('aggregate', {
					trigger: [task([], triggerItems(0, 1))],
					middle: [
						task(
							[{ previousNode: 'trigger' }],
							[{ json: {}, pairedItem: { item: 0 } }, { json: {} }],
						),
					],
					aggregate: [task([{ previousNode: 'middle' }], [item])],
				});

				expect(findPairedItemThroughWorkflowData(workflowRunData, item)).toBeUndefined();
			});
		});
	});
});
