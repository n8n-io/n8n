import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { MicrosoftTeamsV1 } from '../../v1/MicrosoftTeamsV1.node';

const createNode = () =>
	new MicrosoftTeamsV1({
		displayName: 'Microsoft Teams',
		name: 'microsoftTeams',
		group: ['input'],
		description: 'Consume Microsoft Teams API',
	});

describe('Microsoft Teams v1 - request URL encoding', () => {
	it('should encode a team ID with a slash as one path segment', async () => {
		const node = createNode();
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getCurrentNodeParameter.mockReturnValue('abc/joinedTeams');
		context.helpers.requestOAuth2.mockResolvedValue({ value: [] });

		await node.methods.loadOptions.getChannels.call(context);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'microsoftTeamsOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://graph.microsoft.com/v1.0/teams/abc%2FjoinedTeams/channels`,
			}),
		);
	});

	it.each([
		{
			resource: 'channel',
			operation: 'get',
			params: { teamId: 'team-1', channelId: '19%3a4a95f7d8db4c%40thread.tacv2' },
			uri: 'https://graph.microsoft.com/v1.0/teams/team-1/channels/19:4a95f7d8db4c@thread.tacv2',
		},
		{
			resource: 'chatMessage',
			operation: 'get',
			params: { chatId: '19%3A8ea0e38b_97f62344%40unq.gbl.spaces', messageId: '1616990032035' },
			uri: 'https://graph.microsoft.com/v1.0/chats/19:8ea0e38b_97f62344@unq.gbl.spaces/messages/1616990032035',
		},
	])(
		'should decode the $resource ID once in node versions 1 and 1.1',
		async ({ resource, operation, params, uri }) => {
			for (const typeVersion of [1, 1.1]) {
				const parameters: Record<string, string | undefined> = { resource, operation, ...params };
				const context = mockDeep<IExecuteFunctions>();
				context.getInputData.mockReturnValue([{ json: {} }]);
				context.getNode.mockReturnValue(mockDeep<INode>({ typeVersion }));
				context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
				context.helpers.requestOAuth2.mockResolvedValue({});
				context.helpers.returnJsonArray.mockReturnValue([]);
				context.helpers.constructExecutionMetaData.mockReturnValue([]);

				await createNode().execute.call(context);

				const [, options] = context.helpers.requestOAuth2.mock.calls[0];
				expect(String(options.uri)).toBe(uri);
			}
		},
	);
});
