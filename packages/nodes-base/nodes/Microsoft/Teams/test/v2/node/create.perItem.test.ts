import type { IDataObject, IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../v2/transport';
import type * as _importType0 from '../../../v2/transport';

// Real transport except the network helper, so the operation runs for real.
vi.mock('../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const USERS: Record<string, IDataObject> = {
	'/v1.0/users/jane%40example.com': { id: 'guid-1', displayName: 'Jane Smith' },
	'/v1.0/users/bob%40example.com': { id: 'guid-2', displayName: 'Bob Jones' },
};

describe('Microsoft Teams V2, create per item', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		ctx.getInstanceId.mockReturnValue('instanceId');
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
		ctx.helpers.returnJsonArray = vi.fn((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
		ctx.helpers.constructExecutionMetaData = vi.fn(
			(data) => data,
		) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
	});

	it.each([
		['channelMessage', { teamId: 'teamID', channelId: 'channelID' }],
		['chatMessage', { chatId: 'chatID' }],
	])('%s create mentions the user configured on each item', async (resource, target) => {
		const mentionedPerItem = ['jane@example.com', 'bob@example.com'];
		const params: Record<string, unknown> = {
			authentication: 'microsoftTeamsOAuth2Api',
			resource,
			operation: 'create',
			...target,
			contentType: 'text',
			message: 'hi',
			options: { includeLinkToWorkflow: false },
			'mentions.mention': [{}],
		};
		ctx.getNodeParameter.mockImplementation(
			(name: string, itemIndex?: number, fallback?: unknown): NodeParameterValueType => {
				if (name === 'mentions.mention[0].userId') {
					return mentionedPerItem[itemIndex as number];
				}
				return (name in params ? params[name] : fallback) as NodeParameterValueType;
			},
		);
		apiRequest.mockImplementation(async (_method: string, resourcePath: string) =>
			resourcePath in USERS ? USERS[resourcePath] : { id: 'sent' },
		);

		await node.execute.call(ctx);

		const sent = apiRequest.mock.calls
			.filter((call) => call[0] === 'POST')
			.map((call) => (call[2] as { body: { content: string } }).body.content);
		expect(sent).toEqual(['hi <at id="0">Jane Smith</at>', 'hi <at id="0">Bob Jones</at>']);
	});
});
