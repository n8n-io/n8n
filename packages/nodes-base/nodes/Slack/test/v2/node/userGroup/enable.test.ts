import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	ok: true,
	usergroup: {
		id: 'S07XXXXXX',
		team_id: 'T1234567890',
		is_usergroup: true,
		is_subteam: true,
		name: 'Marketing Team',
		description: 'Marketing department user group',
		handle: 'marketing',
		is_external: false,
		date_create: 1734322671,
		date_update: 1734322671,
		date_delete: 0,
		auto_type: null,
		auto_provision: false,
		enterprise_subteam_id: '',
		created_by: 'U1234567890',
		updated_by: 'U1234567890',
		deleted_by: null,
		prefs: {
			channels: [],
			groups: [],
		},
		users: [],
		user_count: 0,
	},
};

describe('Test SlackV2, userGroup => enable', () => {
	nock('https://slack.com').post('/api/usergroups.enable').reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['enable.workflow.json'],
	});
});
