import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const theCase = { _id: '~81920', title: 'Phishing campaign' };
const comment = { _id: '~28672', message: 'Checked' };
const log = { _id: '~24576', message: 'Logs checked' };
const page = { _id: '~32768', title: 'Summary' };
const job = { id: 'AXz2mKd8', status: 'Success' };

describe('TheHiveProject > Request URLs', () => {
	const credentials = {
		theHiveProjectApi: {
			ApiKey: 'fake-api-key',
			url: 'https://thehive.example.com',
			allowUnauthorizedCerts: false,
		},
	};

	beforeAll(() => {
		const api = nock('https://thehive.example.com/api');
		api.delete('/v1/alert/~41160').reply(204);
		api.patch('/v1/alert/~41160', { status: 'Ignored' }).reply(204);
		api.patch('/v1/alert/~41160', { title: 'Phishing mail' }).reply(204);
		api.post('/v1/alert/~41160/case').reply(201, theCase);
		api.post('/alert/~41160/merge/~81920').reply(200, theCase);
		api.delete('/v1/case/~81920').reply(204);
		api.patch('/v1/case/~81920', { title: 'Phishing campaign' }).reply(204);
		api.get('/v1/case/~81920/timeline').reply(200, { events: [] });
		api
			.get('/v1/case/~81920/attachment/c3ab8ff13720e8ad/download')
			.reply(200, 'report', { 'content-type': 'text/plain' });
		api.delete('/v1/case/~81920/attachment/c3ab8ff13720e8ad').reply(204);
		api.post('/v1/alert/~41160/comment', { message: 'Checked' }).reply(201, comment);
		api.patch('/v1/comment/~28672', { message: 'Checked twice' }).reply(200, comment);
		api.delete('/v1/comment/~28672').reply(204);
		api.post('/v1/task/~20480/log', { message: 'Logs checked' }).reply(201, log);
		api.delete('/v1/log/~24576').reply(204);
		api.delete('/v1/log/~24576/attachments/c3ab8ff13720e8ad').reply(204);
		api.delete('/v1/observable/~12288').reply(204);
		api.patch('/v1/observable/~12288', { id: '~12288', message: 'Known domain' }).reply(204);
		api.post('/connector/cortex/job').reply(200, job);
		api.get('/connector/cortex/job/AXz2mKd8').query({ name: 'observable-jobs' }).reply(200, job);
		api.post('/v1/case/~81920/page').reply(201, page);
		api.patch('/v1/page/~32768', { content: 'Updated notes' }).reply(200, page);
		api.patch('/v1/case/~81920/page/~32768', { content: 'Case notes' }).reply(200, page);
		api.delete('/v1/case/~81920/page/~32768').reply(204);
		api.patch('/v1/task/~20480', { id: '~20480', title: 'Check logs' }).reply(204);
		api.delete('/v1/task/~20480').reply(204);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
