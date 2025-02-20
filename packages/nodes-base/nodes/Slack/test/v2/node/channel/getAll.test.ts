import type { IHttpRequestMethods, INodeTypes, WorkflowTestData } from 'n8n-workflow';

import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';

import { executeWorkflow } from '../../../../../../test/nodes/ExecuteWorkflow';
import * as genericFunctions from '../../../../V2/GenericFunctions';

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

jest.mock('../../../../V2/GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../../V2/GenericFunctions');
	return {
		...originalModule,
		slackApiRequest: jest.fn(async function (method: IHttpRequestMethods) {
			if (method === 'GET') {
				return API_RESPONSE;
			}
		}),
	};
});

describe('Test SlackV2, channel => getAll', () => {
	const workflows = ['nodes/Slack/test/v2/node/channel/getAll.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(genericFunctions.slackApiRequest).toHaveBeenCalledTimes(1);
		expect(genericFunctions.slackApiRequest).toHaveBeenCalledWith(
			'GET',
			'/conversations.list',
			{},
			{ exclude_archived: true, limit: 2, types: 'public_channel,private_channel,im,mpim' },
		);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
