import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Phantombuster Node', () => {
	const credentials = {
		phantombusterApi: {
			apiKey: 'test-api-key',
		},
	};

	describe('Agent Requests', () => {
		beforeAll(() => {
			const agent = { id: '4567891234567890', name: 'LinkedIn Profile Scraper' };
			const mock = nock('https://api.phantombuster.com/api/v2');
			mock.post('/agents/delete', { id: '4567891234567890' }).reply(200, {});
			mock.get('/agents/fetch').query({ id: '4567891234567890' }).reply(200, agent);
			mock.get('/agents/fetch-all').reply(200, [agent]);
			mock
				.get('/agents/fetch-output')
				.query({ id: '4567891234567890' })
				.reply(200, { containerId: '7891234567890123', status: 'finished' });
			mock
				.get('/containers/fetch-result-object')
				.query({ id: '7891234567890123' })
				.reply(200, { resultObject: '{"profileUrl":"https://www.linkedin.com/in/nathan"}' });
			mock
				.post('/agents/launch', { id: '4567891234567890', arguments: {}, bonusArgument: {} })
				.reply(200, { containerId: '7891234567890123' });
			mock
				.get('/containers/fetch')
				.query({ id: '7891234567890123' })
				.reply(200, { id: '7891234567890123', status: 'finished' });
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.workflow.json'],
			customAssertions: () => expect(nock.isDone()).toBe(true),
		});
	});
});
