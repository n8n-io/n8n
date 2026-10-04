import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { HitlStackAgent } from '../HitlStackAgent.node';

const setupExecuteFunctions = (
	params: Record<string, unknown>,
	items: INodeExecutionData[] = [{ json: { output: '108' } }],
) => {
	const ctx = mockDeep<IExecuteFunctions>();

	ctx.getInputData.mockReturnValue(items);
	ctx.getExecutionId.mockReturnValue('1042');
	ctx.getWorkflow.mockReturnValue({ id: 'wf-1', name: 'wf', active: false });
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
	agentId: 'ag_1',
	includeContext: false,
};

const mockCerebroHttp = (ctx: ReturnType<typeof setupExecuteFunctions>) => {
	ctx.getCredentials.mockResolvedValue({ baseUrl: 'https://cerebro.example', apiKey: 'k' });
	ctx.helpers.httpRequest.mockImplementation(async (opts: { url: string }) => {
		if (opts.url.endsWith('/config/v1/auth/api-keys/token'))
			return { access_token: 'jwt-1', expires_in: 300 };
		if (opts.url.endsWith('/config/v1/agents'))
			return { items: [{ agent_id: 'ag_1', agent_name: 'Support' }] };
		return { accepted_spans: 1, rejected_spans: 0 };
	});
};

describe('HITLStackAgent Node — non-blocking (Cerebro)', () => {
	it('exports the trace to Cerebro and continues without parking', async () => {
		const ctx = setupExecuteFunctions(baseParams);
		mockCerebroHttp(ctx);

		const result = await new HitlStackAgent().execute.call(ctx);

		// non-blocking: never parks
		expect(ctx.putExecutionToWait).not.toHaveBeenCalled();

		// the trace is ingested to the agent's Cerebro endpoint
		const ingest = ctx.helpers.httpRequest.mock.calls
			.map((c) => c[0])
			.find((r) => r.url.includes('/ingest/v1/agents/'))!;
		expect(ingest.url).toBe('https://cerebro.example/ingest/v1/agents/ag_1/traces');
		expect(ingest.headers).toMatchObject({ Authorization: 'Bearer jwt-1' });

		// the item flows downstream with a Cerebro review marker
		const json = result[0][0].json as IDataObject;
		expect(json.output).toBe('108');
		expect(json.review).toMatchObject({
			mode: 'cerebro',
			status: 'pending',
			agentId: 'ag_1',
			delivered: true,
			acceptedSpans: 1,
		});
	});

	it('sends the upstream question as the trace prompt when context is enabled', async () => {
		const ctx = setupExecuteFunctions({ agentId: 'ag_1', includeContext: true, contextDepth: 2 });
		mockCerebroHttp(ctx);
		ctx.getParentNodes.mockReturnValue([
			{ name: 'AI Agent', type: 'n8n-nodes-base.agent', typeVersion: 1, disabled: false },
			{ name: 'Chat Trigger', type: 'n8n-nodes-base.chatTrigger', typeVersion: 1, disabled: false },
		]);
		ctx.getWorkflowDataProxy.mockReturnValue({
			$items: (name: string) =>
				name === 'AI Agent'
					? [{ json: { output: '108' } }]
					: [{ json: { chatInput: 'what is 12 * 9?' } }],
		} as never);

		await new HitlStackAgent().execute.call(ctx);

		const ingest = ctx.helpers.httpRequest.mock.calls
			.map((c) => c[0])
			.find((r) => r.url.includes('/ingest/v1/agents/'))!;
		const body = ingest.body as {
			resourceSpans: Array<{
				scopeSpans: Array<{ spans: Array<{ attributes: Array<IDataObject> }> }>;
			}>;
		};
		const span = body.resourceSpans[0].scopeSpans[0].spans[0];
		const promptAttr = span.attributes.find((a) => a.key === 'gen_ai.prompt') as {
			value: { stringValue: string };
		};
		expect(promptAttr.value.stringValue).toBe('what is 12 * 9?');
	});

	it('marks the review failed when the trace is not delivered', async () => {
		const ctx = setupExecuteFunctions(baseParams);
		ctx.getCredentials.mockResolvedValue({ baseUrl: 'https://cerebro.example', apiKey: 'k' });
		ctx.helpers.httpRequest.mockImplementation(async (opts: { url: string }) => {
			if (opts.url.endsWith('/config/v1/auth/api-keys/token'))
				return { access_token: 'jwt-1', expires_in: 300 };
			if (opts.url.endsWith('/config/v1/agents'))
				return { items: [{ agent_id: 'ag_1', agent_name: 'Support' }] };
			throw new Error('ingest unavailable');
		});

		const result = await new HitlStackAgent().execute.call(ctx);

		// delivery failed → must not read as awaiting human input
		expect(result[0][0].json.review).toMatchObject({ status: 'failed', delivered: false });
		expect(ctx.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('fails when no agent is selected', async () => {
		const ctx = setupExecuteFunctions({ agentId: '', includeContext: false });

		await expect(new HitlStackAgent().execute.call(ctx)).rejects.toThrow(NodeOperationError);
		expect(ctx.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('rejects more than one input item before making any call', async () => {
		const ctx = setupExecuteFunctions(baseParams, [{ json: { a: 1 } }, { json: { b: 2 } }]);

		await expect(new HitlStackAgent().execute.call(ctx)).rejects.toThrow(NodeOperationError);
		expect(ctx.helpers.httpRequest).not.toHaveBeenCalled();
	});
});
