import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	ok: true,
	channels: [
		{
			id: 'C0362BX17TM',
			name: 'general',
			is_channel: true,
			is_group: false,
			is_im: false,
			is_mpim: false,
			is_private: false,
			created: 1646724991,
			is_archived: false,
			is_general: true,
			unlinked: 0,
			name_normalized: 'general',
			is_shared: false,
			is_org_shared: false,
			is_pending_ext_shared: false,
			pending_shared: [],
			context_team_id: 'T0364MSFHV2',
			updated: 1734075560630,
			parent_conversation: null,
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
				value:
					'This is the one channel that will always include everyone. It’s a great spot for announcements and team-wide conversations.',
				creator: 'U0362BXQYJW',
				last_set: 1646724991,
			},
			properties: {
				use_case: 'welcome',
			},
			previous_names: [],
			num_members: 1,
		},
		{
			id: 'C0362BXRZQA',
			name: 'random',
			is_channel: true,
			is_group: false,
			is_im: false,
			is_mpim: false,
			is_private: false,
			created: 1646724991,
			is_archived: false,
			is_general: false,
			unlinked: 0,
			name_normalized: 'random',
			is_shared: false,
			is_org_shared: false,
			is_pending_ext_shared: false,
			pending_shared: [],
			context_team_id: 'T0364MSFHV2',
			updated: 1725415586388,
			parent_conversation: null,
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
				value:
					'This channel is for... well, everything else. It’s a place for team jokes, spur-of-the-moment ideas, and funny GIFs. Go wild!',
				creator: 'U0362BXQYJW',
				last_set: 1646724991,
			},
			properties: {
				tabs: [
					{
						id: 'files',
						label: '',
						type: 'files',
					},
				],
				tabz: [
					{
						type: 'files',
					},
				],
				use_case: 'random',
			},
			previous_names: [],
			num_members: 2,
		},
	],
	response_metadata: {
		next_cursor: 'dGVhbTpDMDM2MkMyM1RSOA==',
	},
};

describe('Test SlackV2, channel => getAll', () => {
	nock('https://slack.com')
		.get(
			'/api/conversations.list?types=public_channel%2Cprivate_channel%2Cim%2Cmpim&exclude_archived=true&limit=2',
		)
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
