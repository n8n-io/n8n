import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	ok: true,
	channel: {
		id: 'C085WNEHP4Y',
		name: 'test-channel',
		is_channel: true,
		is_group: false,
		is_im: false,
		is_mpim: false,
		is_private: false,
		created: 1734325731,
		is_archived: false,
		is_general: false,
		unlinked: 0,
		name_normalized: 'test-channel',
		is_shared: false,
		is_org_shared: false,
		is_pending_ext_shared: false,
		pending_shared: [],
		context_team_id: 'T0364MSFHV2',
		creator: 'U0362BXQYJW',
		is_ext_shared: false,
		shared_team_ids: ['T0364MSFHV2'],
		pending_connected_team_ids: [],
		is_member: true,
		topic: {
			value: '',
			creator: '',
			last_set: 0,
		},
		purpose: {
			value: '',
			creator: '',
			last_set: 0,
		},
	},
};

describe('Test SlackV1, channel => create', () => {
	const slackNock = nock('https://slack.com')
		.post('/api/conversations.create', {
			name: 'test-channel',
		})
		.reply(200, API_RESPONSE);

	afterAll(() => slackNock.done());
	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});
});
