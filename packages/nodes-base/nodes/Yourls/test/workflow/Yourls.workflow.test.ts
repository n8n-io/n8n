import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Yourls > Workflows', () => {
	const credentials = {
		yourlsApi: {
			url: 'https://sho.rt',
			signature: 'fake-signature',
		},
	};

	beforeAll(() => {
		const api = nock('https://sho.rt');
		api
			.get('/yourls-api.php')
			.query({
				action: 'shorturl',
				url: 'https://n8n.io/',
				signature: 'fake-signature',
				format: 'json',
			})
			.reply(200, { status: 'success', shorturl: 'https://sho.rt/n8n' });
		api
			.get('/yourls-api.php')
			.query({
				action: 'expand',
				shorturl: 'https://sho.rt/n8n',
				signature: 'fake-signature',
				format: 'json',
			})
			.reply(200, { longurl: 'https://n8n.io/' });
		api
			.get('/yourls-api.php')
			.query({
				action: 'url-stats',
				shorturl: 'https://sho.rt/n8n',
				signature: 'fake-signature',
				format: 'json',
			})
			.reply(200, { link: { clicks: '3' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
