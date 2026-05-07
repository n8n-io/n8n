import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ExecuteAgentData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { MessageAnAgent } from '../MessageAnAgent.node';

describe('MessageAnAgent Node', () => {
	let node: MessageAnAgent;
	let executeFunctions: jest.Mocked<IExecuteFunctions>;

	const mockAgentResult: ExecuteAgentData = {
		response: 'Hello from agent',
		structuredOutput: null,
		usage: {
			promptTokens: 10,
			completionTokens: 20,
			totalTokens: 30,
		},
		toolCalls: [],
		finishReason: 'stop',
	};

	beforeEach(() => {
		node = new MessageAnAgent();
		executeFunctions = mockDeep<IExecuteFunctions>();
		jest.clearAllMocks();

		executeFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'Message an Agent',
			type: 'n8n-nodes-base.messageAnAgent',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});

		executeFunctions.getExecutionId.mockReturnValue('exec-123');
	});

	it('should send a message and return the agent response', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'agentId') return { mode: 'id', value: 'agent-1' };
			if (param === 'message') return 'Hello agent';
			return undefined;
		});
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		const result = await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{ agentId: 'agent-1' },
			'Hello agent',
			'exec-123',
			0,
		);
		expect(result).toEqual([
			[
				{
					json: {
						response: 'Hello from agent',
						structuredOutput: null,
						usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
						toolCalls: [],
						finishReason: 'stop',
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should throw NodeOperationError when message is empty', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'agentId') return { mode: 'id', value: 'agent-1' };
			if (param === 'message') return '   ';
			return undefined;
		});
		executeFunctions.continueOnFail.mockReturnValue(false);

		await expect(node.execute.call(executeFunctions)).rejects.toThrow(NodeOperationError);
		await expect(node.execute.call(executeFunctions)).rejects.toThrow('Message cannot be empty');
	});

	it('should process multiple items with different itemIndex values', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((param: string, itemIndex: number) => {
			if (param === 'agentId') return { mode: 'id', value: `agent-${itemIndex + 1}` };
			if (param === 'message') return `Message ${itemIndex + 1}`;
			return undefined;
		});

		const resultForItem0: ExecuteAgentData = {
			...mockAgentResult,
			response: 'Response 1',
		};
		const resultForItem1: ExecuteAgentData = {
			...mockAgentResult,
			response: 'Response 2',
		};

		executeFunctions.executeAgent
			.mockResolvedValueOnce(resultForItem0)
			.mockResolvedValueOnce(resultForItem1);

		const result = await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledTimes(2);
		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{ agentId: 'agent-1' },
			'Message 1',
			'exec-123',
			0,
		);
		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{ agentId: 'agent-2' },
			'Message 2',
			'exec-123',
			1,
		);
		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json.response).toBe('Response 1');
		expect(result[0][0].pairedItem).toEqual({ item: 0 });
		expect(result[0][1].json.response).toBe('Response 2');
		expect(result[0][1].pairedItem).toEqual({ item: 1 });
	});

	it('should return error item instead of throwing when continueOnFail is true', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'agentId') return { mode: 'id', value: 'agent-1' };
			if (param === 'message') return 'Hello';
			return undefined;
		});
		executeFunctions.continueOnFail.mockReturnValue(true);
		executeFunctions.executeAgent.mockRejectedValue(new Error('Agent unavailable'));

		const result = await node.execute.call(executeFunctions);

		expect(result).toEqual([
			[
				{
					json: { error: 'Agent unavailable' },
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should pass through structuredOutput from agent result', async () => {
		const structuredResult: ExecuteAgentData = {
			...mockAgentResult,
			structuredOutput: { key: 'value', nested: { data: 123 } },
			toolCalls: [{ toolName: 'search', input: { query: 'test' }, result: { found: true } }],
		};

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'agentId') return { mode: 'list', value: 'agent-1' };
			if (param === 'message') return 'Structured query';
			return undefined;
		});
		executeFunctions.executeAgent.mockResolvedValue(structuredResult);

		const result = await node.execute.call(executeFunctions);

		expect(result[0][0].json.structuredOutput).toEqual({
			key: 'value',
			nested: { data: 123 },
		});
		expect(result[0][0].json.toolCalls).toEqual([
			{ toolName: 'search', input: { query: 'test' }, result: { found: true } },
		]);
	});
});
