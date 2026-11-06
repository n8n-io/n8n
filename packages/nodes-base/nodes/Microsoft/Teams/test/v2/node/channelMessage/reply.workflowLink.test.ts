import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { Mock } from 'vitest';
import type { IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

// The workflow-file harness leaves `getInstanceBaseUrl` an unconfigured mock, so the
// appended link is unassertable there and every fixture opts out of it. These tests
// drive `execute` directly to cover the on-by-default branch of `Include Link to
// Workflow`, and its parity with `channelMessage:create`.
describe('MicrosoftTeamsV2, channelMessage => reply, workflow link', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getInstanceId.mockReturnValue('instanceId');
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
		ctx.getWorkflow.mockReturnValue({ id: 'workflowId', name: 'wf', active: false });
		ctx.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com/');
		(transport.microsoftApiRequest as Mock).mockResolvedValue({ id: 'replyId' });
		ctx.helpers.returnJsonArray = vi.fn((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
		ctx.helpers.constructExecutionMetaData = vi.fn(
			(data) => data,
		) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const run = async (options: Record<string, unknown> | undefined) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown): NodeParameterValueType => {
				const params: Record<string, unknown> = {
					resource: 'channelMessage',
					operation: 'reply',
					teamId: 'teamId',
					channelId: 'channelId',
					messageId: 'messageId',
					contentType: 'text',
					message: 'on it',
					...(options === undefined ? {} : { options }),
				};
				return (name in params ? params[name] : fallback) as NodeParameterValueType;
			},
		);
		await node.execute.call(ctx);
		return (transport.microsoftApiRequest as Mock).mock.calls[0][2] as {
			body: { content: string; contentType: string };
		};
	};

	it('appends the workflow link and switches to html when the option is unset', async () => {
		const body = await run({});

		expect(body.body.contentType).toBe('html');
		expect(body.body.content).toBe(
			'on it<br><br><em> Powered by <a href="https://n8n.example.com/workflow/workflowId?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.microsoftTeams_instanceId">this n8n workflow</a> </em>',
		);
	});

	it('sends the message untouched when the option is off', async () => {
		const body = await run({ includeLinkToWorkflow: false });

		expect(body.body).toEqual({ contentType: 'text', content: 'on it' });
	});
});
