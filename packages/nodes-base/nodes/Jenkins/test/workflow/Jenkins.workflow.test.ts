import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const builds = [
	{ number: 42, result: 'SUCCESS' },
	{ number: 41, result: 'FAILURE' },
];

describe('Jenkins > Workflows', () => {
	const credentials = {
		jenkinsApi: {
			username: 'nathan',
			apiKey: 'fake-api-key',
			baseUrl: 'https://jenkins.example.com/',
		},
	};

	beforeAll(() => {
		const mock = nock('https://jenkins.example.com');
		mock.post('/job/deploy-app/build').reply(201);
		mock.post('/job/platform/job/deploy-app/build').reply(201);
		mock.post('/job/platform/job/deploy-app/buildWithParameters', { BRANCH: 'main' }).reply(201);
		mock
			.post('/createItem')
			.query({ name: 'deploy-app-copy', mode: 'copy', from: 'deploy-app' })
			.reply(200);
		mock.post('/createItem', '<project></project>').query({ name: 'new-app' }).reply(200);
		mock.post('/quietDown').query({ reason: 'maintenance' }).reply(200);
		mock.post('/cancelQuietDown').reply(200);
		mock.post('/restart').reply(503);
		mock.post('/safeRestart').reply(503);
		mock.post('/exit').reply(200);
		mock.post('/safeExit').reply(200);
		mock.get('/job/deploy-app/api/json').query({ tree: 'builds[*]{0,2}' }).reply(200, { builds });
		mock
			.get('/job/platform/job/deploy-app/api/json')
			.query({ tree: 'builds[*]' })
			.reply(200, { builds });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
