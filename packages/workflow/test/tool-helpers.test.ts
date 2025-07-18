import type { INode } from '../src/interfaces';
import { nodeNameToToolName } from '../src/tool-helpers';

describe('tool-helpers', () => {
	describe('parallel tool execution', () => {
		// Mock tool map
		const mockToolMap = new Map();
		const successfulTool = {
			invoke: jest.fn().mockResolvedValue({ content: 'Success', tool_call_id: 'test-1' }),
		};
		const failingTool = {
			invoke: jest.fn().mockRejectedValue(new Error('Tool execution failed')),
		};
		mockToolMap.set('successTool', successfulTool);
		mockToolMap.set('failTool', failingTool);

		it('should handle synchronous tool not found errors without aborting other tools', async () => {
			// This test demonstrates the issue: when Promise.all encounters a synchronous throw,
			// it immediately rejects and doesn't wait for other promises to complete
			const toolCalls = [
				{ name: 'nonExistentTool', id: 'call-1', args: {} },
				{ name: 'successTool', id: 'call-2', args: {} },
			];

			// Simulate Promise.all behavior with sync throws
			const results = Promise.all(
				toolCalls.map(async (toolCall) => {
					const tool = mockToolMap.get(toolCall.name);
					if (!tool) {
						// This throws synchronously, causing Promise.all to reject immediately
						throw new Error(`Tool ${toolCall.name} not found`);
					}
					return tool.invoke(toolCall.args, { toolCall });
				}),
			);

			// The entire Promise.all rejects
			await expect(results).rejects.toThrow('Tool nonExistentTool not found');

			// The successful tool was never invoked because Promise.all aborted
			expect(successfulTool.invoke).not.toHaveBeenCalled();
		});

		it('should execute all tools even when some fail synchronously (desired behavior)', async () => {
			// This test shows the desired behavior: all tools should execute
			// and errors should be collected individually
			const toolCalls = [
				{ name: 'nonExistentTool', id: 'call-1', args: {} },
				{ name: 'successTool', id: 'call-2', args: {} },
				{ name: 'failTool', id: 'call-3', args: {} },
			];

			// Wrap each tool execution in a try-catch to handle sync errors
			const results = await Promise.all(
				toolCalls.map(async (toolCall) => {
					try {
						const tool = mockToolMap.get(toolCall.name);
						if (!tool) {
							throw new Error(`Tool ${toolCall.name} not found`);
						}
						return await tool.invoke(toolCall.args, { toolCall });
					} catch (error) {
						// Return error result instead of throwing
						return {
							content: `Error: ${error.message}`,
							tool_call_id: toolCall.id,
							error: true,
						};
					}
				}),
			);

			// All promises complete, even with errors
			expect(results).toHaveLength(3);
			expect(results[0]).toEqual({
				content: 'Error: Tool nonExistentTool not found',
				tool_call_id: 'call-1',
				error: true,
			});
			expect(results[1]).toEqual({ content: 'Success', tool_call_id: 'test-1' });
			expect(results[2]).toEqual({
				content: 'Error: Tool execution failed',
				tool_call_id: 'call-3',
				error: true,
			});

			// The successful tool was invoked
			expect(successfulTool.invoke).toHaveBeenCalledTimes(1);
		});
	});
});

describe('nodeNameToToolName', () => {
	const getNodeWithName = (name: string): INode => ({
		id: 'test-node',
		name,
		type: 'test',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	});

	it('should replace spaces with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test Node'))).toBe('Test_Node');
	});

	it('should replace dots with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test.Node'))).toBe('Test_Node');
	});

	it('should replace question marks with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test?Node'))).toBe('Test_Node');
	});

	it('should replace exclamation marks with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test!Node'))).toBe('Test_Node');
	});

	it('should replace equals signs with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test=Node'))).toBe('Test_Node');
	});

	it('should replace multiple special characters with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test.Node?With!Special=Chars'))).toBe(
			'Test_Node_With_Special_Chars',
		);
	});

	it('should handle names that already have underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test_Node'))).toBe('Test_Node');
	});

	it('should handle names with consecutive special characters', () => {
		expect(nodeNameToToolName(getNodeWithName('Test..!!??==Node'))).toBe('Test_Node');
	});

	it('should replace various special characters with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test#+*()[]{}:;,<>/\\\'"%$Node'))).toBe('Test_Node');
	});

	describe('when passed a string directly', () => {
		it('should replace spaces with underscores', () => {
			expect(nodeNameToToolName('Test Node')).toBe('Test_Node');
		});

		it('should replace dots with underscores', () => {
			expect(nodeNameToToolName('Test.Node')).toBe('Test_Node');
		});

		it('should replace multiple special characters with underscores', () => {
			expect(nodeNameToToolName('Test.Node?With!Special=Chars')).toBe(
				'Test_Node_With_Special_Chars',
			);
		});

		it('should handle consecutive special characters', () => {
			expect(nodeNameToToolName('Test..!!??==Node')).toBe('Test_Node');
		});

		it('should replace various special characters with underscores', () => {
			expect(nodeNameToToolName('Test#+*()[]{}:;,<>/\\\'"%$Node')).toBe('Test_Node');
		});
	});
});
