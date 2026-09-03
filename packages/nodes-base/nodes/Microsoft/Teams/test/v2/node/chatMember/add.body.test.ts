import type { IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';

// Real transport except the network helper, so buildTeamsPath/validateTeamsId and
// getGraphBaseUrl run for real; only microsoftApiRequest is stubbed.
vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

describe('Microsoft Teams V2 — chatMember:add request body', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;
	const userId = 'e76f456f-5c3f-4f1e-9d5e-4d8f0f6ab111';

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown): NodeParameterValueType =>
				(name in params ? params[name] : fallback) as NodeParameterValueType,
		);
	};

	const addParams = (params: Record<string, unknown>) => ({
		authentication: 'microsoftTeamsOAuth2Api',
		resource: 'chatMember',
		operation: 'add',
		chatId: '19:abc@thread.v2',
		userId,
		...params,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getInstanceId.mockReturnValue('instanceId');
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
		// `getGraphBaseUrl` is the real implementation here, so the credential must
		// resolve or every case would fail on an unrelated TypeError instead.
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
		ctx.helpers.returnJsonArray = vi.fn((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		) as unknown as IExecuteFunctions['helpers']['returnJsonArray'];
		ctx.helpers.constructExecutionMetaData = vi.fn(
			(data) => data,
		) as unknown as IExecuteFunctions['helpers']['constructExecutionMetaData'];
	});

	it('sends the 0001-01-01T00:00:00Z sentinel for All history', async () => {
		setParams(addParams({ options: { shareHistory: 'all' } }));

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith('POST', '/v1.0/chats/19:abc@thread.v2/members', {
			'@odata.type': '#microsoft.graph.aadUserConversationMember',
			'user@odata.bind': `https://graph.microsoft.com/v1.0/users/${userId}`,
			roles: ['owner'],
			visibleHistoryStartDateTime: '0001-01-01T00:00:00Z',
		});
	});

	it('sends the selected date for From Date', async () => {
		setParams(
			addParams({
				options: { shareHistory: 'fromDate', historyStartDate: '2026-08-01T00:00:00Z' },
			}),
		);

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith('POST', '/v1.0/chats/19:abc@thread.v2/members', {
			'@odata.type': '#microsoft.graph.aadUserConversationMember',
			'user@odata.bind': `https://graph.microsoft.com/v1.0/users/${userId}`,
			roles: ['owner'],
			visibleHistoryStartDateTime: '2026-08-01T00:00:00Z',
		});
	});

	it('throws when From Date is selected without a date, and issues no request', async () => {
		setParams(addParams({ options: { shareHistory: 'fromDate', historyStartDate: '' } }));

		await expect(node.execute.call(ctx)).rejects.toThrow('No history start date was given');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('sends roles: ["guest"] when the Guest role is selected', async () => {
		setParams(addParams({ options: { role: 'guest' } }));

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith('POST', '/v1.0/chats/19:abc@thread.v2/members', {
			'@odata.type': '#microsoft.graph.aadUserConversationMember',
			'user@odata.bind': `https://graph.microsoft.com/v1.0/users/${userId}`,
			roles: ['guest'],
		});
	});

	// Every Entra B2B guest principal name carries `#EXT#`, which the Graph id
	// validator rejects — guests have to be given by object ID.
	it('rejects a guest UPN containing #EXT# before any request', async () => {
		setParams(addParams({ userId: 'alias_contoso.com#EXT#@tenant.onmicrosoft.com', options: {} }));

		await expect(node.execute.call(ctx)).rejects.toThrow('The ID is not valid');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('uses the credential graphApiBaseUrl in user@odata.bind (sovereign cloud)', async () => {
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: 'https://graph.microsoft.us' });
		setParams(addParams({ options: {} }));

		await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith('POST', '/v1.0/chats/19:abc@thread.v2/members', {
			'@odata.type': '#microsoft.graph.aadUserConversationMember',
			'user@odata.bind': `https://graph.microsoft.us/v1.0/users/${userId}`,
			roles: ['owner'],
		});
	});
});
