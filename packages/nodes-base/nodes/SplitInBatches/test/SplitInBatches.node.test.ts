import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { SplitInBatchesV4 } from '../v4/SplitInBatchesV4.node';

describe('Execute SplitInBatches Node', () => {
	new NodeTestHarness().setupTests();
});

describe('SplitInBatchesV4 Infinite Loop Protection', () => {
	let splitInBatchesNode: SplitInBatchesV4;
	let mockExecuteFunctions: Partial<IExecuteFunctions>;

	beforeEach(() => {
		splitInBatchesNode = new SplitInBatchesV4();

		// Clear static execution counters before each test
		SplitInBatchesV4.clearAllCountersForTest();

		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({ name: 'SplitInBatches' }),
			getExecutionId: jest.fn().mockReturnValue('test-execution-id'),
			getInputData: jest
				.fn()
				.mockReturnValue([{ json: { item: 1 } }, { json: { item: 2 } }, { json: { item: 3 } }]),
			getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'batchSize') return 1;
				if (paramName === 'options') return {};
				return undefined;
			}),
			getContext: jest.fn().mockReturnValue({
				get: jest.fn().mockReturnValue(undefined),
				set: jest.fn(),
			}),
			addOutputData: jest.fn(),
			continueOnFail: jest.fn().mockReturnValue(false),
			getInputSourceData: jest.fn().mockReturnValue([]),
			// helpers not required for these tests
		};
	});

	afterEach(() => {
		// Clean up static state after each test
		SplitInBatchesV4.clearAllCountersForTest();
	});

	describe('checkExecutionLimit', () => {
		it('should allow executions under the limit', () => {
			// Test that executions under the limit (3) are allowed
			expect(() => {
				SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).not.toThrow();

			expect(() => {
				SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).not.toThrow();

			expect(() => {
				SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).not.toThrow();
		});

		it('should throw NodeOperationError when execution limit is exceeded', () => {
			// With 3 input items and batch size 1, expected batches = 3, limit = max(3*2, 10) = 10
			// Execute up to the limit
			for (let i = 0; i < 10; i++) {
				SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}

			// The 11th execution should throw
			expect(() => {
				SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).toThrow(NodeOperationError);
		});

		it('should include proper error message with node name and execution count', () => {
			// Execute up to the limit (10 for this dataset)
			for (let i = 0; i < 10; i++) {
				SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}

			try {
				(SplitInBatchesV4 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
				fail('Expected NodeOperationError to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect(error.message).toContain('Infinite loop detected');
				expect(error.message).toContain('SplitInBatches');
				expect(error.message).toContain('has executed 11 times');
				expect(error.message).toContain('exceeding the calculated limit of 10');
				expect(error.message).toContain('expected ~3 batches');
				expect(error.message).toContain(
					'Check that the "done" output is not connected back to this node\'s input',
				);
			}
		});

		it('should clean up execution counter after throwing error', () => {
			// Execute up to the limit and trigger error
			for (let i = 0; i < 10; i++) {
				SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}

			try {
				SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			} catch (error) {
				// Expected error
			}

			// Counter should be cleaned up
			expect(SplitInBatchesV4.hasCounterForTest('test-execution-id', 'SplitInBatches')).toBe(false);
		});

		it('should track different nodes separately', () => {
			const mockExecuteFunctions2 = {
				...mockExecuteFunctions,
				getNode: jest.fn().mockReturnValue({ name: 'AnotherSplitInBatches' }),
			};

			// Execute node 1 up to limit (10 for this dataset)
			for (let i = 0; i < 10; i++) {
				(SplitInBatchesV4 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}

			// Node 2 should still be able to execute (it has its own counter)
			for (let i = 0; i < 10; i++) {
				expect(() => {
					SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions2 as IExecuteFunctions);
				}).not.toThrow();
			}

			// Both nodes should throw when they exceed their respective limits
			expect(() => {
				SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).toThrow(NodeOperationError);

			expect(() => {
				SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions2 as IExecuteFunctions);
			}).toThrow(NodeOperationError);
		});

		it('should track different execution IDs separately', () => {
			const mockExecuteFunctions2 = {
				...mockExecuteFunctions,
				getExecutionId: jest.fn().mockReturnValue('different-execution-id'),
			};

			// Execute first execution up to limit (10 for this dataset)
			for (let i = 0; i < 10; i++) {
				(SplitInBatchesV4 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}

			// Different execution ID should still be able to execute (it has its own counter)
			for (let i = 0; i < 10; i++) {
				expect(() => {
					(SplitInBatchesV4 as any).checkExecutionLimit(mockExecuteFunctions2 as IExecuteFunctions);
				}).not.toThrow();
			}

			// Both executions should throw when they exceed their respective limits
			expect(() => {
				(SplitInBatchesV4 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).toThrow(NodeOperationError);

			expect(() => {
				(SplitInBatchesV4 as any).checkExecutionLimit(mockExecuteFunctions2 as IExecuteFunctions);
			}).toThrow(NodeOperationError);
		});
	});

	describe('resetExecutionCount', () => {
		it('should remove execution counter for the node', () => {
			// Build up counter
			SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);

			expect(SplitInBatchesV4.hasCounterForTest('test-execution-id', 'SplitInBatches')).toBe(true);

			// Reset counter
			SplitInBatchesV4.resetExecutionCount(mockExecuteFunctions as IExecuteFunctions);

			// Counter should be removed
			expect(SplitInBatchesV4.hasCounterForTest('test-execution-id', 'SplitInBatches')).toBe(false);
		});

		it('should only affect the specific node and execution', () => {
			const mockExecuteFunctions2 = {
				...mockExecuteFunctions,
				getNode: jest.fn().mockReturnValue({ name: 'AnotherSplitInBatches' }),
			};

			// Build up counters for both nodes
			SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			SplitInBatchesV4.checkExecutionLimit(mockExecuteFunctions2 as IExecuteFunctions);

			expect(SplitInBatchesV4.hasCounterForTest('test-execution-id', 'SplitInBatches')).toBe(true);
			expect(SplitInBatchesV4.hasCounterForTest('test-execution-id', 'AnotherSplitInBatches')).toBe(
				true,
			);

			// Reset only first node
			SplitInBatchesV4.resetExecutionCount(mockExecuteFunctions as IExecuteFunctions);

			// Only first node's counter should be removed
			expect(SplitInBatchesV4.hasCounterForTest('test-execution-id', 'SplitInBatches')).toBe(false);
			expect(SplitInBatchesV4.hasCounterForTest('test-execution-id', 'AnotherSplitInBatches')).toBe(
				true,
			);
		});
	});

	describe('execute method integration', () => {
		it('should call checkExecutionLimit on each execution', async () => {
			const checkExecutionLimitSpy = jest.spyOn(SplitInBatchesV4, 'checkExecutionLimit');

			// The execute method signature is: execute(this: IExecuteFunctions)
			// So mockExecuteFunctions should be the 'this' context
			const executeFunctionsWithContext = {
				...mockExecuteFunctions,
				getContext: jest.fn().mockImplementation((contextType: string) => {
					if (contextType === 'node') {
						return {
							set: jest.fn(),
							get: jest.fn().mockReturnValue(undefined),
						};
					}
					return { set: jest.fn(), get: jest.fn() };
				}),
				getInputSourceData: jest.fn().mockReturnValue([]),
			};

			await splitInBatchesNode.execute.call(
				executeFunctionsWithContext as unknown as IExecuteFunctions,
			);

			expect(checkExecutionLimitSpy).toHaveBeenCalledWith(
				executeFunctionsWithContext as unknown as IExecuteFunctions,
			);

			checkExecutionLimitSpy.mockRestore();
		});

		it('should call resetExecutionCount when reset option is true', async () => {
			const resetExecutionCountSpy = jest.spyOn(SplitInBatchesV4, 'resetExecutionCount');

			const executeFunctionsWithContext = {
				...mockExecuteFunctions,
				getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'batchSize') return 1;
					if (paramName === 'options') return { reset: true };
					return undefined;
				}),
				getContext: jest.fn().mockImplementation((contextType: string) => {
					if (contextType === 'node') {
						return {
							set: jest.fn(),
							get: jest.fn().mockReturnValue(undefined), // Undefined means first execution
						};
					}
					return { set: jest.fn(), get: jest.fn() };
				}),
				getInputSourceData: jest.fn().mockReturnValue([]),
			};

			await splitInBatchesNode.execute.call(
				executeFunctionsWithContext as unknown as IExecuteFunctions,
			);

			expect(resetExecutionCountSpy).toHaveBeenCalledWith(
				executeFunctionsWithContext as unknown as IExecuteFunctions,
			);

			resetExecutionCountSpy.mockRestore();
		});

		it('should call resetExecutionCount when processing completes normally', async () => {
			const resetExecutionCountSpy = jest.spyOn(SplitInBatchesV4, 'resetExecutionCount');

			// Mock an execution that has processed all items and has low execution count
			const executeFunctionsWithContext = {
				...mockExecuteFunctions,
				getInputData: jest.fn().mockReturnValue([]), // No input data means no items to return
				getContext: jest.fn().mockImplementation((contextType: string) => {
					if (contextType === 'node') {
						return {
							set: jest.fn(),
							get: jest.fn().mockReturnValue({
								items: [], // No more items to process
								processedItems: [{ json: { processed: true } }], // Some processed items
								currentRunIndex: 1,
								maxRunIndex: 1,
								done: false,
							}),
						};
					}
					return { set: jest.fn(), get: jest.fn() };
				}),
				getInputSourceData: jest.fn().mockReturnValue([]),
			};

			await splitInBatchesNode.execute.call(
				executeFunctionsWithContext as unknown as IExecuteFunctions,
			);

			expect(resetExecutionCountSpy).toHaveBeenCalledWith(
				executeFunctionsWithContext as unknown as IExecuteFunctions,
			);

			resetExecutionCountSpy.mockRestore();
		});

		it('should prevent infinite loops in real execution scenario', async () => {
			// Simulate repeated executions (infinite loop scenario)
			// With 3 input items, batch size 1, limit is max(3*2, 10) = 10
			for (let i = 0; i < 10; i++) {
				const executeFunctionsWithContext = {
					...mockExecuteFunctions,
					getContext: jest.fn().mockImplementation((contextType: string) => {
						if (contextType === 'node') {
							return {
								set: jest.fn(),
								get: jest.fn().mockReturnValue(undefined),
							};
						}
						return { set: jest.fn(), get: jest.fn() };
					}),
					getInputSourceData: jest.fn().mockReturnValue([]),
				};

				await splitInBatchesNode.execute.call(
					executeFunctionsWithContext as unknown as IExecuteFunctions,
				);
			}

			// 11th execution should throw
			const executeFunctionsWithContext = {
				...mockExecuteFunctions,
				getContext: jest.fn().mockImplementation((contextType: string) => {
					if (contextType === 'node') {
						return {
							set: jest.fn(),
							get: jest.fn().mockReturnValue(undefined),
						};
					}
					return { set: jest.fn(), get: jest.fn() };
				}),
				getInputSourceData: jest.fn().mockReturnValue([]),
			};

			await expect(
				splitInBatchesNode.execute.call(
					executeFunctionsWithContext as unknown as IExecuteFunctions,
				),
			).rejects.toThrow(NodeOperationError);
		});

		it('should always reset counter after normal completion regardless of execution count', async () => {
			const executionCounters = (SplitInBatchesV4 as any).executionCounters;
			const globalKey = 'test-execution-id_SplitInBatches';

			// Manually set a high counter to simulate multiple batch runs (bypassing the limit check)
			executionCounters.set(globalKey, 2); // Set to 2 (below limit but > 1 to test the old flawed logic)

			// Simulate a multi-batch workflow that executes and completes normally
			const executeFunctionsWithContext = {
				...mockExecuteFunctions,
				getInputData: jest.fn().mockReturnValue([]), // No items - triggers completion path
				getContext: jest.fn().mockImplementation((contextType: string) => {
					if (contextType === 'node') {
						return {
							set: jest.fn(),
							get: jest.fn().mockReturnValue({
								items: [], // No more items to process
								processedItems: [{ json: { processed: true } }], // Some processed items
								currentRunIndex: 3, // Simulate multiple batches completed
								maxRunIndex: 3,
								done: false,
							}),
						};
					}
					return { set: jest.fn(), get: jest.fn() };
				}),
				getInputSourceData: jest.fn().mockReturnValue([]),
			};

			// Verify counter exists
			expect(SplitInBatchesV4.hasCounterForTest('test-execution-id', 'SplitInBatches')).toBe(true);

			// Execute the completion scenario - should reset counter despite count > 1
			await splitInBatchesNode.execute.call(
				executeFunctionsWithContext as unknown as IExecuteFunctions,
			);

			// Counter should be reset even though it was > 1 (this tests the fix)
			expect(executionCounters.has(globalKey)).toBe(false);
		});

		it('should handle large datasets with appropriate dynamic limits', () => {
			// Large dataset: 1000 items, batch size 50 = 20 expected batches
			// Dynamic limit = max(20*2, 10) = 40
			const largeDatasetMock = {
				...mockExecuteFunctions,
				getInputData: jest.fn().mockReturnValue(new Array(1000).fill({ json: { item: 'data' } })),
				getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'batchSize') return 50;
					if (paramName === 'options') return {};
					return undefined;
				}),
			};

			// Should allow 40 executions without throwing
			for (let i = 0; i < 40; i++) {
				expect(() => {
					(SplitInBatchesV4 as any).checkExecutionLimit(largeDatasetMock as IExecuteFunctions);
				}).not.toThrow();
			}

			// 41st execution should throw
			expect(() => {
				(SplitInBatchesV4 as any).checkExecutionLimit(largeDatasetMock as IExecuteFunctions);
			}).toThrow(NodeOperationError);
		});

		it('should prevent memory leaks by resetting counters after normal multi-batch processing', async () => {
			// Simulate multiple different workflows completing
			const workflows = ['workflow1', 'workflow2', 'workflow3'];

			for (const workflowId of workflows) {
				// Manually set counter to simulate accumulated executions
				SplitInBatchesV4.setCounterForTest(workflowId, 'SplitInBatches', 2);

				// Build up mock functions for this workflow
				const mockFunctions = {
					...mockExecuteFunctions,
					getExecutionId: jest.fn().mockReturnValue(workflowId),
					getInputData: jest.fn().mockReturnValue([]),
					getContext: jest.fn().mockImplementation((contextType: string) => {
						if (contextType === 'node') {
							return {
								set: jest.fn(),
								get: jest.fn().mockReturnValue({
									items: [],
									processedItems: [{ json: { completed: true } }],
									currentRunIndex: 3,
									maxRunIndex: 3,
									done: false,
								}),
							};
						}
						return { set: jest.fn(), get: jest.fn() };
					}),
					getInputSourceData: jest.fn().mockReturnValue([]),
				};

				// Verify counter exists
				expect(SplitInBatchesV4.hasCounterForTest(workflowId, 'SplitInBatches')).toBe(true);

				// Complete the workflow - should clean up counter
				await splitInBatchesNode.execute.call(mockFunctions as unknown as IExecuteFunctions);

				// Counter should be cleaned up
				expect(SplitInBatchesV4.hasCounterForTest(workflowId, 'SplitInBatches')).toBe(false);
			}
		});

		it('should reset counter before infinite loop check when options.reset is true', async () => {
			const splitInBatchesNode = new SplitInBatchesV4();
			// Set high counter to simulate previous executions
			SplitInBatchesV4.setCounterForTest('test-execution-id', 'SplitInBatches', 50);

			const mockFunctions = {
				getNode: jest.fn().mockReturnValue({ name: 'SplitInBatches' }),
				getExecutionId: jest.fn().mockReturnValue('test-execution-id'),
				getNodeParameter: jest.fn((name: string) => {
					if (name === 'batchSize') return 1;
					if (name === 'options') return { reset: true };
					return {};
				}),
				getInputData: jest.fn().mockReturnValue([{ json: { value: 'test' } }]),
				getContext: jest.fn().mockReturnValue({}),
				getInputSourceData: jest.fn().mockReturnValue([]),
			};

			// Should not throw because counter is reset before check
			const result = await splitInBatchesNode.execute.call(
				mockFunctions as unknown as IExecuteFunctions,
			);
			expect(result).toBeTruthy();
		});

		it('should clean up counter on checkExecutionLimit error', async () => {
			const splitInBatchesNode = new SplitInBatchesV4();
			// Set counter to exceed limit
			SplitInBatchesV4.setCounterForTest('test-execution-id', 'SplitInBatches', 1001);

			const mockFunctions = {
				getNode: jest.fn().mockReturnValue({ name: 'SplitInBatches' }),
				getExecutionId: jest.fn().mockReturnValue('test-execution-id'),
				getNodeParameter: jest.fn((name: string) => {
					if (name === 'batchSize') return 1;
					if (name === 'options') return {};
					return {};
				}),
				getInputData: jest.fn().mockReturnValue([{ json: { value: 'test' } }]),
				getContext: jest.fn().mockReturnValue({}),
				getInputSourceData: jest.fn().mockReturnValue([]),
			};

			await expect(
				splitInBatchesNode.execute.call(mockFunctions as unknown as IExecuteFunctions),
			).rejects.toThrow('Infinite loop detected');

			// Counter should be cleaned up after error
			expect(SplitInBatchesV4.hasCounterForTest('test-execution-id', 'SplitInBatches')).toBe(false);
		});

		it('should provide cleanup method for execution counters', () => {
			const executionId = 'test-execution';

			// Add some counters
			SplitInBatchesV4.setCounterForTest(executionId, 'node1', 5);
			SplitInBatchesV4.setCounterForTest(executionId, 'node2', 3);
			SplitInBatchesV4.setCounterForTest('other-execution', 'node1', 2);

			// Cleanup specific execution
			SplitInBatchesV4.cleanupExecutionCounters(executionId);

			// Should remove counters for the specific execution
			expect(SplitInBatchesV4.hasCounterForTest(executionId, 'node1')).toBe(false);
			expect(SplitInBatchesV4.hasCounterForTest(executionId, 'node2')).toBe(false);

			// Should keep counters for other executions
			expect(SplitInBatchesV4.hasCounterForTest('other-execution', 'node1')).toBe(true);
		});
	});
});
