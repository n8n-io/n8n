import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Twake > Workflows', () => {
	const credentials = {
		twakeCloudApi: {
			workspaceKey: 'fake-workspace-key',
		},
	};

	beforeAll(() => {
		nock('https://plugins.twake.app/plugins/n8n')
			.post('/actions/message/save')
			.reply(200, { object: { id: 'b4f0c1d2-3e4f-5a6b-7c8d-9e0f1a2b3c4d' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
