import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { SplitInBatchesV3 } from '../v3/SplitInBatchesV3.node';

describe('Execute SplitInBatches Node', () => {
	new NodeTestHarness().setupTests();
});

describe('SplitInBatchesV3 Infinite Loop Protection', () => {
	let splitInBatchesNode: SplitInBatchesV3;
	let mockExecuteFunctions: Partial<IExecuteFunctions>;

	beforeEach(() => {
		splitInBatchesNode = new SplitInBatchesV3();

		// Clear static execution counters before each test
		(SplitInBatchesV3 as any).executionCounters.clear();

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
			helpers: {} as any,
		};
	});

	afterEach(() => {
		// Clean up static state after each test
		(SplitInBatchesV3 as any).executionCounters.clear();
	});

	describe('checkExecutionLimit', () => {
		it('should allow executions under the limit', () => {
			// Test that executions under the limit (3) are allowed
			expect(() => {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).not.toThrow();

			expect(() => {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).not.toThrow();

			expect(() => {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).not.toThrow();
		});

		it('should throw NodeOperationError when execution limit is exceeded', () => {
			// Execute up to the limit
			for (let i = 0; i < 3; i++) {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}

			// The 4th execution should throw
			expect(() => {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).toThrow(NodeOperationError);
		});

		it('should include proper error message with node name and execution count', () => {
			// Execute up to the limit
			for (let i = 0; i < 3; i++) {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}

			try {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
				fail('Expected NodeOperationError to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect(error.message).toContain('Infinite loop detected');
				expect(error.message).toContain('SplitInBatches');
				expect(error.message).toContain('has executed 4 times');
				expect(error.message).toContain('exceeding the limit of 3');
				expect(error.message).toContain(
					'Check that the "done" output is not connected back to this node\'s input',
				);
			}
		});

		it('should clean up execution counter after throwing error', () => {
			// Execute up to the limit and trigger error
			for (let i = 0; i < 3; i++) {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}

			try {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			} catch (error) {
				// Expected error
			}

			// Counter should be cleaned up
			const executionCounters = (SplitInBatchesV3 as any).executionCounters;
			const globalKey = `test-execution-id_SplitInBatches`;
			expect(executionCounters.has(globalKey)).toBe(false);
		});

		it('should track different nodes separately', () => {
			const mockExecuteFunctions2 = {
				...mockExecuteFunctions,
				getNode: jest.fn().mockReturnValue({ name: 'AnotherSplitInBatches' }),
			};

			// Execute node 1 up to limit
			for (let i = 0; i < 3; i++) {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}

			// Node 2 should still be able to execute
			expect(() => {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions2 as IExecuteFunctions);
			}).not.toThrow();

			expect(() => {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions2 as IExecuteFunctions);
			}).not.toThrow();

			expect(() => {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions2 as IExecuteFunctions);
			}).not.toThrow();

			// But node 1 should still throw
			expect(() => {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).toThrow(NodeOperationError);
		});

		it('should track different execution IDs separately', () => {
			const mockExecuteFunctions2 = {
				...mockExecuteFunctions,
				getExecutionId: jest.fn().mockReturnValue('different-execution-id'),
			};

			// Execute first execution up to limit
			for (let i = 0; i < 3; i++) {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}

			// Different execution ID should still be able to execute
			expect(() => {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions2 as IExecuteFunctions);
			}).not.toThrow();

			// First execution should throw
			expect(() => {
				(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			}).toThrow(NodeOperationError);
		});
	});

	describe('resetExecutionCount', () => {
		it('should remove execution counter for the node', () => {
			// Build up counter
			(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);

			const executionCounters = (SplitInBatchesV3 as any).executionCounters;
			const globalKey = `test-execution-id_SplitInBatches`;
			expect(executionCounters.has(globalKey)).toBe(true);

			// Reset counter
			(SplitInBatchesV3 as any).resetExecutionCount(mockExecuteFunctions as IExecuteFunctions);

			// Counter should be removed
			expect(executionCounters.has(globalKey)).toBe(false);
		});

		it('should only affect the specific node and execution', () => {
			const mockExecuteFunctions2 = {
				...mockExecuteFunctions,
				getNode: jest.fn().mockReturnValue({ name: 'AnotherSplitInBatches' }),
			};

			// Build up counters for both nodes
			(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions as IExecuteFunctions);
			(SplitInBatchesV3 as any).checkExecutionLimit(mockExecuteFunctions2);

			const executionCounters = (SplitInBatchesV3 as any).executionCounters;
			const globalKey1 = `test-execution-id_SplitInBatches`;
			const globalKey2 = `test-execution-id_AnotherSplitInBatches`;

			expect(executionCounters.has(globalKey1)).toBe(true);
			expect(executionCounters.has(globalKey2)).toBe(true);

			// Reset only first node
			(SplitInBatchesV3 as any).resetExecutionCount(mockExecuteFunctions as IExecuteFunctions);

			// Only first node's counter should be removed
			expect(executionCounters.has(globalKey1)).toBe(false);
			expect(executionCounters.has(globalKey2)).toBe(true);
		});
	});

	describe('execute method integration', () => {
		it('should call checkExecutionLimit on each execution', async () => {
			const checkExecutionLimitSpy = jest.spyOn(SplitInBatchesV3 as any, 'checkExecutionLimit');

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
			const resetExecutionCountSpy = jest.spyOn(SplitInBatchesV3 as any, 'resetExecutionCount');

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
			const resetExecutionCountSpy = jest.spyOn(SplitInBatchesV3 as any, 'resetExecutionCount');

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
			for (let i = 0; i < 3; i++) {
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

			// 4th execution should throw
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
	});
});
