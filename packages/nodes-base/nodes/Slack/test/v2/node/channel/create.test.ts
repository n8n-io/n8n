import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

const API_RESPONSE = {
	ok: true,
	channel: {
		id: 'C085WNEHP4Y',
		name: 'test-003',
		is_channel: true,
		is_group: false,
		is_im: false,
		is_mpim: false,
		is_private: false,
		created: 1734325731,
		is_archived: false,
		is_general: false,
		unlinked: 0,
		name_normalized: 'test-003',
		is_shared: false,
		is_org_shared: false,
		is_pending_ext_shared: false,
		pending_shared: [],
		context_team_id: 'T0364MSFHV2',
		updated: 1734325731240,
		parent_conversation: null,
		creator: 'U0362BXQYJW',
		is_ext_shared: false,
		shared_team_ids: ['T0364MSFHV2'],
		pending_connected_team_ids: [],
		is_member: true,
		last_read: '0000000000.000000',
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
		previous_names: [],
		priority: 0,
	},
};

describe('Test SlackV2, channel => create', () => {
	nock('https://slack.com').post('/api/conversations.create').reply(200, API_RESPONSE);

	const workflows = ['nodes/Slack/test/v2/node/channel/create.workflow.json'];
	testWorkflows(workflows);
});
