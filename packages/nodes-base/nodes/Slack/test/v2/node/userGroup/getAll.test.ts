import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	ok: true,
	usergroups: [
		{
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
			users: ['U1234567890', 'U0987654321'],
			user_count: 2,
		},
		{
			id: 'S08YYYYYY',
			team_id: 'T1234567890',
			is_usergroup: true,
			is_subteam: true,
			name: 'Engineering Team',
			description: 'Engineering department user group',
			handle: 'engineering',
			is_external: false,
			date_create: 1734322600,
			date_update: 1734322600,
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
			users: ['U1111111111', 'U2222222222', 'U3333333333'],
			user_count: 3,
		},
	],
};

describe('Test SlackV2, userGroup => getAll', () => {
	nock('https://slack.com')
		.get('/api/usergroups.list')
		.query({ include_count: 'true', include_disabled: 'true', include_users: 'true' })
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
