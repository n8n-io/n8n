import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

const team = '/v1.0/teams/fbe2bf47-16c8-47cf-b4a5-4b9b187c508b';
const channelId = '19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2';
const channel = `${team}/channels/${channelId}`;
const betaChannel = `/beta/teams/fbe2bf47-16c8-47cf-b4a5-4b9b187c508b/channels/${channelId}`;
const chat =
	'/v1.0/chats/19:8ea0e38b-efb3-4757-924a-5f94061cf8c2_97f62344-57dc-409c-88ad-c4af14158ff5@unq.gbl.spaces';
const messageId = '1616990032035';
const task = '/v1.0/planner/tasks/01gzSlKkIUSUl6DF_EilrmQAKDhh';
const taskData = { id: '01gzSlKkIUSUl6DF_EilrmQAKDhh', title: 'Review budget' };
const etag = 'W/"JzEtVGFzayAgQEBAQEBAQEBAQEBAQEBAWCc="';
const channelData = { id: channelId, displayName: 'General Updates' };

describe('Microsoft Teams v1 - request URLs', () => {
	beforeAll(() => {
		const graph = nock('https://graph.microsoft.com');

		graph
			.post(`${team}/channels`, { displayName: 'General Updates', description: 'Team updates' })
			.reply(200, channelData)
			.delete(channel)
			.reply(204)
			.get(channel)
			.reply(200, channelData)
			.get(`${team}/channels`)
			.reply(200, { value: [channelData, { id: '19:other@thread.tacv2', displayName: 'Other' }] })
			.patch(channel, { displayName: 'General' })
			.reply(204);

		graph
			.post(`${betaChannel}/messages`, { body: { contentType: 'text', content: 'Hello' } })
			.reply(200, { id: messageId })
			.post(`${betaChannel}/messages/${messageId}/replies`, {
				body: { contentType: 'text', content: 'Thanks' },
			})
			.reply(200, { id: '1616990171266' })
			.get(`${betaChannel}/messages`)
			.query({ $top: 1 })
			.reply(200, { value: [{ id: messageId }] });

		graph
			.post(`${chat}/messages`, { body: { contentType: 'text', content: 'Hello' } })
			.reply(200, { id: messageId })
			.get(`${chat}/messages/${messageId}`)
			.reply(200, { id: messageId })
			.get(`${chat}/messages`)
			.reply(200, {
				value: [],
				'@odata.nextLink': `https://graph.microsoft.com${chat}/messages?$skiptoken=page2`,
			})
			.get(`${chat}/messages`)
			.query({ $skiptoken: 'page2' })
			.reply(200, { value: [{ id: messageId }] });

		graph
			.get(task)
			.reply(200, { ...taskData, '@odata.etag': etag })
			.delete(task)
			.matchHeader('If-Match', etag)
			.reply(204)
			.get(task)
			.reply(200, taskData)
			.get('/v1.0/users/6463a5ce-2119-4198-9f2a-628761df4a62/planner/tasks')
			.reply(200, { value: [taskData, { id: 'WDl8aTH8kE2v1ibvq3bdlGQAEkFh', title: 'Other' }] })
			.get('/v1.0/planner/plans/xqQg5FS2LkCp935s-FIFm2QAFkHM/tasks')
			.reply(200, { value: [taskData] })
			.get(task)
			.reply(200, { ...taskData, '@odata.etag': etag })
			.patch(task, { title: 'Review Q3 budget' })
			.matchHeader('If-Match', etag)
			.reply(204);
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requestUrls.workflow.json'],
	});
});
