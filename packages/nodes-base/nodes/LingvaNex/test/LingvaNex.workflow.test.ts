import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('LingvaNex > Workflows', () => {
	const credentials = {
		lingvaNexApi: {
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		nock('https://api-b2b.backenster.com/b1/api/v3')
			.matchHeader('authorization', 'Bearer fake-api-key')
			.post('/translate', { data: 'Hello', to: 'de_DE', platform: 'api' })
			.reply(200, { err: null, result: 'Hallo' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
