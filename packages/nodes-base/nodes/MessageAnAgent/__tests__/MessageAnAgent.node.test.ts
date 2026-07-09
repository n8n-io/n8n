import type { IExecuteFunctions, ExecuteAgentData, NodeParameterValueType } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { MessageAnAgent, baseDescription } from '../MessageAnAgent.node';
import { MessageAnAgentV1 } from '../v1/MessageAnAgentV1.node';
import { MessageAnAgentV2 } from '../v2/MessageAnAgentV2.node';

describe('MessageAnAgent Node', () => {
	let node: MessageAnAgentV2;
	let executeFunctions: Mocked<IExecuteFunctions>;

	const mockSession = {
		agentId: 'agent-1',
		projectId: 'project-1',
		sessionId: 'exec-123-0',
	};

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
		session: mockSession,
	};

	/**
	 * Mock `getNodeParameter` with sensible defaults (a non-empty `message`).
	 * Tests pass `overrides` keyed by param name; an override value of
	 * `undefined`/`''` is honored (not replaced).
	 */
	function mockParams(overrides: Record<string, unknown> = {}) {
		executeFunctions.getNodeParameter.mockImplementation(
			(param: string, _itemIndex?: number, fallback?: unknown) => {
				if (param in overrides) return overrides[param] as NodeParameterValueType;
				if (param === 'agentId') return { mode: 'id', value: 'agent-1' };
				if (param === 'message') return 'Hello agent';
				if (param === 'advanced.invokeMode') return 'perItem';
				if (param === 'advanced') return fallback ?? {};
				return undefined;
			},
		);
	}

	beforeEach(() => {
		node = new MessageAnAgentV2(baseDescription);
		executeFunctions = mockDeep<IExecuteFunctions>();
		vi.clearAllMocks();

		executeFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'Message an Agent',
			type: 'n8n-nodes-base.messageAnAgent',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});

		executeFunctions.getExecutionId.mockReturnValue('exec-123');
	});

	it('should send a message and return the agent response', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockParams();
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		const result = await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				sessionId: undefined,
				inputDataScope: 'item',
				exposeWorkflowData: false,
			},
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
						session: mockSession,
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should forward a user-supplied sessionId from the Advanced collection', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockParams({ advanced: { sessionId: '  thread-42  ' } });
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				sessionId: 'thread-42',
				inputDataScope: 'item',
				exposeWorkflowData: false,
			},
			'Hello agent',
			'exec-123',
			0,
		);
	});

	it('should treat a whitespace-only sessionId as no override', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockParams({ advanced: { sessionId: '   ' } });
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				sessionId: undefined,
				inputDataScope: 'item',
				exposeWorkflowData: false,
			},
			'Hello agent',
			'exec-123',
			0,
		);
	});

	describe('prompt resolution', () => {
		it('uses the message param', async () => {
			executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockParams({ message: 'Process the refund' });
			executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

			await node.execute.call(executeFunctions);

			expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: 'agent-1' }),
				'Process the refund',
				'exec-123',
				0,
			);
		});

		it('reads the message param on a v1 node', async () => {
			executeFunctions.getNode.mockReturnValue({
				id: 'test-node-id',
				name: 'Message an Agent',
				type: 'n8n-nodes-base.messageAnAgent',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});
			executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockParams({ message: 'v1 message' });
			executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

			const v1 = new MessageAnAgentV1(baseDescription);
			await v1.execute.call(executeFunctions);

			expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: 'agent-1' }),
				'v1 message',
				'exec-123',
				0,
			);
		});

		it('throws NodeOperationError when the resolved prompt is empty', async () => {
			executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockParams({ message: '   ' });
			executeFunctions.continueOnFail.mockReturnValue(false);

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(NodeOperationError);
			await expect(node.execute.call(executeFunctions)).rejects.toThrow('Prompt cannot be empty');
		});
	});

	it('should process multiple items with different itemIndex values', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation(
			(param: string, itemIndex?: number, fallback?: unknown) => {
				if (param === 'agentId') return { mode: 'id', value: `agent-${(itemIndex ?? 0) + 1}` };
				if (param === 'message') return `Message ${(itemIndex ?? 0) + 1}`;
				if (param === 'advanced') return fallback ?? {};
				if (param === 'advanced.invokeMode') return 'perItem';
				return fallback as NodeParameterValueType;
			},
		);

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
			{
				agentId: 'agent-1',
				sessionId: undefined,
				inputDataScope: 'item',
				exposeWorkflowData: false,
			},
			'Message 1',
			'exec-123',
			0,
		);
		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{
				agentId: 'agent-2',
				sessionId: undefined,
				inputDataScope: 'item',
				exposeWorkflowData: false,
			},
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
		mockParams({ message: 'Hello' });
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
		mockParams({ agentId: { mode: 'list', value: 'agent-1' }, message: 'Structured query' });
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

	it('should forward the parsed output schema when structured output is enabled', async () => {
		const schemaString = JSON.stringify({
			type: 'object',
			properties: { result: { type: 'string' } },
			required: ['result'],
		});

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockParams({ useStructuredOutput: true, outputSchema: schemaString });
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				sessionId: undefined,
				outputSchema: {
					type: 'object',
					properties: { result: { type: 'string' } },
					required: ['result'],
				},
				inputDataScope: 'item',
				exposeWorkflowData: false,
			},
			'Hello agent',
			'exec-123',
			0,
		);
	});

	it('should throw NodeOperationError when the output schema is not valid JSON', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockParams({ useStructuredOutput: true, outputSchema: '{ not valid json' });
		executeFunctions.continueOnFail.mockReturnValue(false);

		await expect(node.execute.call(executeFunctions)).rejects.toThrow(NodeOperationError);
		await expect(node.execute.call(executeFunctions)).rejects.toThrow(
			'Output schema is not valid JSON',
		);
		expect(executeFunctions.executeAgent).not.toHaveBeenCalled();
	});

	it('should throw NodeOperationError when structured output is enabled with an empty schema', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockParams({ useStructuredOutput: true, outputSchema: '   ' });
		executeFunctions.continueOnFail.mockReturnValue(false);

		await expect(node.execute.call(executeFunctions)).rejects.toThrow('Output schema is empty');
		expect(executeFunctions.executeAgent).not.toHaveBeenCalled();
	});

	it('forwards an already-parsed object schema (e.g. from an expression) without calling .trim()', async () => {
		// A `type: "json"` parameter backed by an expression like
		// `={{ $json.outputSchema }}` resolves to an object, not a string.
		const schemaObject = {
			type: 'object',
			properties: { result: { type: 'string' } },
			required: ['result'],
		};

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockParams({ useStructuredOutput: true, outputSchema: schemaObject });
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				sessionId: undefined,
				outputSchema: schemaObject,
				inputDataScope: 'item',
				exposeWorkflowData: false,
			},
			'Hello agent',
			'exec-123',
			0,
		);
	});

	it('throws NodeOperationError when the output schema resolves to an array', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockParams({ useStructuredOutput: true, outputSchema: [{ type: 'object' }] });
		executeFunctions.continueOnFail.mockReturnValue(false);

		await expect(node.execute.call(executeFunctions)).rejects.toThrow(
			'Output schema must be a JSON Schema object',
		);
		expect(executeFunctions.executeAgent).not.toHaveBeenCalled();
	});

	it('throws NodeOperationError when the output schema resolves to a non-object, non-string value', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockParams({ useStructuredOutput: true, outputSchema: 42 });
		executeFunctions.continueOnFail.mockReturnValue(false);

		await expect(node.execute.call(executeFunctions)).rejects.toThrow(
			'Output schema is not valid JSON',
		);
		expect(executeFunctions.executeAgent).not.toHaveBeenCalled();
	});

	it('invokes the agent once with all-items scope in "Once for All Items" mode', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: { i: 0 } }, { json: { i: 1 } }]);
		executeFunctions.getNodeParameter.mockImplementation(
			(param: string, _itemIndex?: number, fallback?: unknown) => {
				if (param === 'agentId') return { mode: 'id', value: 'agent-1' };
				if (param === 'message') return 'Summarize all items';
				if (param === 'advanced') return fallback ?? {};
				if (param === 'advanced.invokeMode') return 'allItems';
				if (param === 'allowOtherNodesData') return false;
				return fallback as NodeParameterValueType;
			},
		);
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		const result = await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledTimes(1);
		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				sessionId: undefined,
				inputDataScope: 'all',
				exposeWorkflowData: false,
			},
			'Summarize all items',
			'exec-123',
			0,
		);
		expect(result[0]).toHaveLength(1);
	});

	it('defaults to once-for-all-items when Invoke Agent is not set in Advanced', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: { i: 0 } }, { json: { i: 1 } }]);
		// No 'advanced.invokeMode' branch: the mock returns the caller's fallback,
		// mirroring the real getNodeParameter for an unset collection option.
		executeFunctions.getNodeParameter.mockImplementation(
			(param: string, _itemIndex?: number, fallback?: unknown) => {
				if (param === 'agentId') return { mode: 'id', value: 'agent-1' };
				if (param === 'message') return 'Summarize all items';
				if (param === 'advanced') return fallback ?? {};
				return fallback as NodeParameterValueType;
			},
		);
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		const result = await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledTimes(1);
		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			expect.objectContaining({ inputDataScope: 'all' }),
			'Summarize all items',
			'exec-123',
			0,
		);
		expect(result[0]).toHaveLength(1);
	});

	it('passes exposeWorkflowData when "Allow agent to access other nodes data" is on', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation(
			(param: string, _itemIndex?: number, fallback?: unknown) => {
				if (param === 'agentId') return { mode: 'id', value: 'agent-1' };
				if (param === 'message') return 'Hello';
				if (param === 'advanced') return { allowOtherNodesData: true };
				if (param === 'advanced.invokeMode') return 'perItem';
				return fallback as NodeParameterValueType;
			},
		);
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				sessionId: undefined,
				inputDataScope: 'item',
				exposeWorkflowData: true,
			},
			'Hello',
			'exec-123',
			0,
		);
	});

	it('does not invoke the agent in "Once for All Items" mode with no input items', async () => {
		executeFunctions.getInputData.mockReturnValue([]);
		executeFunctions.getNodeParameter.mockImplementation(
			(param: string, _itemIndex?: number, fallback?: unknown) => {
				if (param === 'agentId') return { mode: 'id', value: 'agent-1' };
				if (param === 'message') return 'Summarize all items';
				if (param === 'advanced') return fallback ?? {};
				if (param === 'advanced.invokeMode') return 'allItems';
				return fallback as NodeParameterValueType;
			},
		);
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		const result = await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).not.toHaveBeenCalled();
		expect(result[0]).toHaveLength(0);
	});
});

describe('MessageAnAgent versioning', () => {
	it('exposes v1 and v2 with v2 as the default', () => {
		const versioned = new MessageAnAgent();

		expect(versioned.description.defaultVersion).toBe(2);
		expect(Object.keys(versioned.nodeVersions)).toEqual(['1', '2']);
	});

	it('keeps the original resourceLocator picker on v1 (non-breaking) with the listAgents method', () => {
		const v1 = new MessageAnAgentV1(baseDescription);
		const agentId = v1.description.properties.find((p) => p.name === 'agentId');

		expect(v1.description.version).toBe(1);
		expect(agentId?.type).toBe('resourceLocator');
		expect(v1.methods?.listSearch?.listAgents).toBeDefined();
	});

	it('uses the agentSelector picker on v2', () => {
		const v2 = new MessageAnAgentV2(baseDescription);
		const agentId = v2.description.properties.find((p) => p.name === 'agentId');

		expect(v2.description.version).toBe(2);
		expect(agentId?.type).toBe('agentSelector');
	});

	it('keeps the same message field on both versions', () => {
		const v1Names = new MessageAnAgentV1(baseDescription).description.properties.map((p) => p.name);
		expect(v1Names).toContain('message');

		const v2Names = new MessageAnAgentV2(baseDescription).description.properties.map((p) => p.name);
		expect(v2Names).toContain('message');
		expect(v2Names).not.toContain('promptType');
		expect(v2Names).not.toContain('text');
	});
});
