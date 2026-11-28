import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const CARD = {
	type: 'AdaptiveCard',
	version: '1.4',
	body: [{ type: 'TextBlock', text: 'Hello from a card' }],
};

describe('Test MicrosoftTeamsV2, chatMessage => create adaptive card', () => {
	nock('https://graph.microsoft.com')
		.post('/v1.0/chats/19:ebed9ad42c904d6c83adf0db360053ec@thread.v2/messages', (body) => {
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
		})
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#chats('19%3Aebed9ad42c904d6c83adf0db360053ec%40thread.v2')/messages/$entity",
			id: '1698378560692',
			replyToId: null,
			etag: '1698378560692',
			messageType: 'message',
			createdDateTime: '2023-10-27T03:49:20.692Z',
			lastModifiedDateTime: '2023-10-27T03:49:20.692Z',
			lastEditedDateTime: null,
			deletedDateTime: null,
			subject: null,
			summary: null,
			chatId: '19:ebed9ad42c904d6c83adf0db360053ec@thread.v2',
			importance: 'normal',
			locale: 'en-us',
			webUrl: null,
			channelIdentity: null,
			policyViolation: null,
			eventDetail: null,
			from: {
				application: null,
				device: null,
				user: {
					'@odata.type': '#microsoft.graph.teamworkUserIdentity',
					id: '11111-2222-3333',
					displayName: 'Michael Kret',
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
			mentions: [],
			reactions: [],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['create.adaptiveCard.workflow.json'],
	});
});
