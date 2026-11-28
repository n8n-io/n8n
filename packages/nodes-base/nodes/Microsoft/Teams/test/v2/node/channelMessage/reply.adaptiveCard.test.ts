import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const CARD = {
	type: 'AdaptiveCard',
	version: '1.4',
	body: [{ type: 'TextBlock', text: 'Hello from a card' }],
};

describe('Test MicrosoftTeamsV2, channelMessage => reply adaptive card', () => {
	nock('https://graph.microsoft.com')
		.post(
			'/beta/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages/1698324478896/replies',
			(body) => {
				const envelope = body as {
					body?: { contentType?: string; content?: string };
					attachments?: Array<{
						id?: string;
						contentType?: string;
						contentUrl?: unknown;
						content?: string;
					}>;
					mentions?: unknown;
				};
				const match = /^<attachment id="([0-9a-f-]{36})"><\/attachment>$/.exec(
					envelope.body?.content ?? '',
				);
				if (!match) return false;

				const attachment = envelope.attachments?.[0];

				return (
					envelope.body?.contentType === 'html' &&
					envelope.mentions === undefined &&
					envelope.attachments?.length === 1 &&
					attachment?.id === match[1] &&
					attachment?.contentType === 'application/vnd.microsoft.card.adaptive' &&
					attachment?.contentUrl === null &&
					JSON.parse(attachment?.content ?? '{}').type === 'AdaptiveCard' &&
					!(envelope.body?.content ?? '').includes('Powered by')
				);
			},
		)
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/beta/$metadata#teams('1111-2222-3333')/channels('threadId')/messages/$entity",
			id: '1698324500123',
			replyToId: '1698324478896',
			etag: '1698324500123',
			messageType: 'message',
			createdDateTime: '2023-10-26T12:48:20.123Z',
			lastModifiedDateTime: '2023-10-26T12:48:20.123Z',
			subject: null,
			importance: 'normal',
			locale: 'en-us',
			from: {
				application: null,
				device: null,
				user: {
					'@odata.type': '#microsoft.graph.teamworkUserIdentity',
					id: '11111-2222-3333',
					displayName: 'My Name',
					userIdentityType: 'aadUser',
				},
			},
			body: {
				contentType: 'html',
				content: '<attachment id="11111111-1111-1111-1111-111111111111"></attachment>',
			},
			attachments: [
				{
					id: '11111111-1111-1111-1111-111111111111',
					contentType: 'application/vnd.microsoft.card.adaptive',
					contentUrl: null,
					content: JSON.stringify(CARD),
				},
			],
			channelIdentity: {
				teamId: '1111-2222-3333',
				channelId: '42:aaabbbccc.tacv2',
			},
			mentions: [],
			reactions: [],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['reply.adaptiveCard.workflow.json'],
	});
});
