import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, WAIT_INDEFINITELY } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { HitlStackAgent } from '../HitlStackAgent.node';

const RESUME_URL = 'http://localhost:5678/webhook-waiting/1042?token=abc';

const setupExecuteFunctions = (
	params: Record<string, unknown>,
	items: INodeExecutionData[] = [{ json: { customer: 'acme' } }],
) => {
	const ctx = mockDeep<IExecuteFunctions>();

	ctx.getInputData.mockReturnValue(items);
	ctx.getExecutionId.mockReturnValue('1042');
	ctx.getWorkflow.mockReturnValue({ id: 'wf-1', name: 'wf', active: false });
	ctx.getSignedResumeUrl.mockReturnValue(RESUME_URL);
	ctx.getNode.mockReturnValue({
		id: 'hitl-node',
		name: 'HITLStackAgent',
		type: 'n8n-nodes-base.hitlStackAgent',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	});
	ctx.getNodeParameter.mockImplementation(
		(name: string, _itemIndex?: number, fallback?: unknown) => (params[name] ?? fallback) as never,
	);

	return ctx;
};

const baseParams = {
	url: 'http://localhost:3100/hitl',
	sendHeaders: false,
	limitWaitTime: false,
	includeContext: false,
	options: {},
};

describe('HITLStackAgent Node — registration', () => {
	it('registers the item with a signed resume URL, then parks the execution', async () => {
		const ctx = setupExecuteFunctions(baseParams);
		ctx.helpers.httpRequest.mockResolvedValue({ requestId: 'r1', status: 'registered' });

		const result = await new HitlStackAgent().execute.call(ctx);

		expect(ctx.helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				url: 'http://localhost:3100/hitl',
				method: 'POST',
				json: true,
				body: {
					executionId: '1042',
					workflowId: 'wf-1',
					workflowName: 'wf',
					nodeName: 'HITLStackAgent',
					nodeId: 'hitl-node',
					registeredAt: expect.any(String),
					resumeUrl: RESUME_URL,
					data: { customer: 'acme' },
				},
			}),
		);
		expect(ctx.putExecutionToWait).toHaveBeenCalledWith(WAIT_INDEFINITELY);
		// Only surfaces if the wait times out; a callback replaces it via webhook()
		expect(result[0]).toEqual([{ json: { customer: 'acme' } }]);
	});

	it('captures what upstream nodes produced when context is enabled', async () => {
		const ctx = setupExecuteFunctions({ ...baseParams, includeContext: true, contextDepth: 2 });
		ctx.getParentNodes.mockReturnValue([
			{ name: 'AI Agent', type: 'n8n-nodes-base.agent', typeVersion: 1, disabled: false },
			{ name: 'Chat Trigger', type: 'n8n-nodes-base.chatTrigger', typeVersion: 1, disabled: false },
		]);
		ctx.getWorkflowDataProxy.mockReturnValue({
			$items: (name: string) =>
				name === 'AI Agent'
					? [{ json: { output: 'draft A' } }]
					: [{ json: { chatInput: 'summarise this' } }],
		} as never);
		ctx.helpers.httpRequest.mockResolvedValue({});

		await new HitlStackAgent().execute.call(ctx);

		const body = ctx.helpers.httpRequest.mock.calls[0][0].body as IDataObject;
		expect(body.trail).toEqual([
			{
				node: 'AI Agent',
				type: 'n8n-nodes-base.agent',
				executed: true,
				output: { output: 'draft A' },
			},
			{
				node: 'Chat Trigger',
				type: 'n8n-nodes-base.chatTrigger',
				executed: true,
				output: { chatInput: 'summarise this' },
			},
		]);
	});

	it('marks an upstream node that never ran, without failing the registration', async () => {
		const ctx = setupExecuteFunctions({ ...baseParams, includeContext: true, contextDepth: 2 });
		ctx.getParentNodes.mockReturnValue([
			{ name: 'Skipped Branch', type: 'n8n-nodes-base.set', typeVersion: 1, disabled: false },
		]);
		ctx.getWorkflowDataProxy.mockReturnValue({
			$items: () => {
				throw new Error("Node 'Skipped Branch' hasn't been executed");
			},
		} as never);
		ctx.helpers.httpRequest.mockResolvedValue({});

		await new HitlStackAgent().execute.call(ctx);

		const body = ctx.helpers.httpRequest.mock.calls[0][0].body as IDataObject;
		expect(body.trail).toEqual([
			{ node: 'Skipped Branch', type: 'n8n-nodes-base.set', executed: false, output: null },
		]);
	});

	it('rejects more than one input item before making any call', async () => {
		const ctx = setupExecuteFunctions(baseParams, [{ json: { a: 1 } }, { json: { b: 2 } }]);

		await expect(new HitlStackAgent().execute.call(ctx)).rejects.toThrow(NodeOperationError);
		expect(ctx.helpers.httpRequest).not.toHaveBeenCalled();
		expect(ctx.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('does NOT park the execution when registration fails', async () => {
		const ctx = setupExecuteFunctions(baseParams);
		ctx.helpers.httpRequest.mockRejectedValue(new Error('connect ECONNREFUSED'));

		await expect(new HitlStackAgent().execute.call(ctx)).rejects.toThrow(NodeApiError);
		// Parking here would strand the execution forever with nothing able to resume it
		expect(ctx.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('honours a bounded wait time', async () => {
		const ctx = setupExecuteFunctions({
			...baseParams,
			limitWaitTime: true,
			maxWaitMinutes: 30,
		});
		ctx.helpers.httpRequest.mockResolvedValue({});

		const before = Date.now();
		await new HitlStackAgent().execute.call(ctx);

		const waitTill = ctx.putExecutionToWait.mock.calls[0][0];
		expect(waitTill).not.toEqual(WAIT_INDEFINITELY);
		const deltaMinutes = (waitTill.getTime() - before) / 60000;
		expect(deltaMinutes).toBeGreaterThan(29);
		expect(deltaMinutes).toBeLessThanOrEqual(30);
	});

	it('skips header names that would pollute the prototype', async () => {
		const ctx = setupExecuteFunctions({
			...baseParams,
			sendHeaders: true,
			headerParameters: {
				parameters: [
					{ name: 'X-Token', value: 'abc' },
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased -- header fixture, not a node display name
					{ name: '__proto__', value: 'polluted' },
				],
			},
		});
		ctx.helpers.httpRequest.mockResolvedValue({});

		await new HitlStackAgent().execute.call(ctx);

		const { headers } = ctx.helpers.httpRequest.mock.calls[0][0];
		expect(headers).toEqual({ 'X-Token': 'abc' });
		expect({}.constructor.prototype.polluted).toBeUndefined();
	});
});

describe('HITLStackAgent Node — resume', () => {
	it('turns the callback body into the node output', async () => {
		const ctx = mockDeep<IWebhookFunctions>();
		const callback: IDataObject = {
			requestId: 'r1',
			status: 'processed',
			data: { customer: 'ACME' },
		};
		ctx.getBodyData.mockReturnValue(callback);

		const result = await new HitlStackAgent().webhook.call(ctx);

		expect(result.workflowData).toEqual([[{ json: callback }]]);
	});
});
