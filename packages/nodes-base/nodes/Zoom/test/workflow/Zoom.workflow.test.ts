import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const meeting = { id: 85746065432, topic: 'Weekly sync' };

describe('Zoom > Workflows', () => {
	const credentials = {
		zoomApi: {
			accessToken: 'fake-access-token',
		},
	};

	beforeAll(() => {
		const mock = nock('https://api.zoom.us/v2');
		mock.post('/users/me/meetings', { topic: 'Weekly sync' }).reply(201, meeting);
		mock.get('/meetings/85746065432').reply(200, meeting);
		mock
			.get('/users/me/meetings')
			.query({ page_size: 10 })
			.reply(200, { meetings: [meeting] });
		mock.patch('/meetings/85746065432', { topic: 'Daily sync' }).reply(204);
		mock.delete('/meetings/85746065432').reply(204);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
