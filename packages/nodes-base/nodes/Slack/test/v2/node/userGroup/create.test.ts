import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	ok: true,
	usergroup: {
		id: 'S0615G0KT',
		team_id: 'T060RNRCH',
		is_usergroup: true,
		name: 'Marketing Team',
		description: 'Marketing gurus, PR experts and product advocates.',
		handle: 'marketing-team',
		is_external: false,
		date_create: 1446746793,
		date_update: 1446746793,
		date_delete: 0,
		auto_type: null,
		created_by: 'U060RNRCZ',
		updated_by: 'U060RNRCZ',
		deleted_by: null,
		prefs: {
			channels: [],
			groups: [],
		},
		user_count: '0',
	},
};

describe('Test SlackV2, userGroup => create', () => {
	nock('https://slack.com').post('/api/usergroups.create').reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});
});
