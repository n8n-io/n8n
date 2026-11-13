import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const alert = { id: '~41160', title: 'Phishing mail' };
const theCase = { id: '~81920', title: 'Phishing campaign' };
const observable = { id: '~12288', data: 'example.com' };
const task = { id: '~20480', title: 'Check logs' };
const log = { id: '~24576', message: 'Logs checked' };
const job = { id: 'AXz2mKd8', status: 'Success' };

describe('TheHive > Workflows', () => {
	const credentials = {
		theHiveApi: {
			ApiKey: 'fake-api-key',
			url: 'https://thehive.example.com',
			apiVersion: '',
			allowUnauthorizedCerts: false,
		},
	};

	beforeAll(() => {
		const api = nock('https://thehive.example.com/api');
		api.get('/alert/~41160').reply(200, alert);
		api.post('/alert/~41160/markAsRead').reply(200, alert);
		api.post('/alert/~41160/markAsUnread').reply(200, alert);
		api.post('/alert/~41160/merge/~81920').reply(200, theCase);
		api.post('/alert/~41160/createCase').reply(200, theCase);
		api.patch('/alert/~41160', { follow: false }).reply(200, alert);
		api.post('/case/~81920/artifact').reply(201, observable);
		api.post('/connector/cortex/job').reply(200, job);
		api.get('/connector/cortex/job/AXz2mKd8').query({ name: 'observable-jobs' }).reply(200, job);
		api.get('/case/artifact/~12288').reply(200, observable);
		api.patch('/case/artifact/~12288', { ioc: false }).reply(200, observable);
		api.get('/case/~81920').reply(200, theCase);
		api.patch('/case/~81920', { flag: true }).reply(200, theCase);
		api.post('/case/~81920/task').reply(201, task);
		api.get('/case/task/~20480').reply(200, task);
		api.patch('/case/task/~20480', { flag: true }).reply(200, task);
		api.post('/case/task/~20480/log').reply(201, log);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
