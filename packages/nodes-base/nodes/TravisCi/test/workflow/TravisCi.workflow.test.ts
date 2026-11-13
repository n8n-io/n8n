import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const build = { id: 86549912, number: '1204', state: 'passed' };

describe('TravisCi > Workflows', () => {
	const credentials = {
		travisCiApi: {
			apiToken: 'fake-api-token',
		},
	};

	beforeAll(() => {
		const api = nock('https://api.travis-ci.com').matchHeader(
			'authorization',
			'token fake-api-token',
		);
		api.get('/build/86549912').reply(200, build);
		api
			.get('/builds')
			.query({ limit: 5 })
			.reply(200, { builds: [build] });
		api.post('/build/86549912/cancel').reply(202, { build });
		api.post('/build/86549912/restart').reply(202, { build });
		api
			.post('/repo/n8n-io%2Fn8n/requests', { request: { branch: 'master' } })
			.reply(202, { request: { id: 1 } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
