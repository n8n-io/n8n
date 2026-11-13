import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('HumanticAI > Workflows', () => {
	const credentials = {
		humanticAiApi: {
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		const api = nock('https://api.humantic.ai/v1');
		api
			.get('/user-profile/create')
			.query({ userid: 'https://www.linkedin.com/in/ada-lovelace', apikey: 'fake-api-key' })
			.reply(200, { data: { status: 'created' } });
		api
			.get('/user-profile')
			.query({ userid: 'https://www.linkedin.com/in/ada-lovelace', apikey: 'fake-api-key' })
			.reply(200, { results: { display_name: 'Ada' } });
		api
			.post('/user-profile/create')
			.query({ userid: 'https://www.linkedin.com/in/ada-lovelace', apikey: 'fake-api-key' })
			.reply(200, { data: { status: 'updated' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
