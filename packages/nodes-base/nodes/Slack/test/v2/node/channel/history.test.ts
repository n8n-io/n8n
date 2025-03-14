import type { IHttpRequestMethods, INodeTypes, WorkflowTestData } from 'n8n-workflow';

import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';

import { executeWorkflow } from '../../../../../../test/nodes/ExecuteWorkflow';
import * as genericFunctions from '../../../../V2/GenericFunctions';

const API_RESPONSE = [
	{
		user: 'U0362BXQYJW',
		type: 'message',
		ts: '1734322597.935429',
		bot_id: 'B0382SHFM46',
		app_id: 'A037UTP0Z39',
		text: 'test message\n_Automated with this <http://localhost:5678/workflow/qJdEfiBgYLdfYOTs?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.slack_be251a83c052a9862eeac953816fbb1464f89dfbf79d7ac490a8e336a8cc8bfd|n8n workflow>_',
		team: 'T0364MSFHV2',
		bot_profile: {
			id: 'B0382SHFM46',
			deleted: false,
			name: 'blocks-test',
			updated: 1648028754,
			app_id: 'A037UTP0Z39',
			icons: {
				image_36: 'https://a.slack-edge.com/80588/img/plugins/app/bot_36.png',
				image_48: 'https://a.slack-edge.com/80588/img/plugins/app/bot_48.png',
				image_72: 'https://a.slack-edge.com/80588/img/plugins/app/service_72.png',
			},
			team_id: 'T0364MSFHV2',
		},
		blocks: [
			{
				type: 'rich_text',
				block_id: 'piR',
				elements: [
					{
						type: 'rich_text_section',
						elements: [
							{
								type: 'text',
								text: 'test message\n',
							},
							{
								type: 'text',
								text: 'Automated with this ',
								style: {
									italic: true,
								},
							},
							{
								type: 'link',
								url: 'http://localhost:5678/workflow/qJdEfiBgYLdfYOTs?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.slack_be251a83c052a9862eeac953816fbb1464f89dfbf79d7ac490a8e336a8cc8bfd',
								text: 'n8n workflow',
								style: {
									italic: true,
								},
							},
						],
					},
				],
			},
		],
	},
	{
		user: 'U0362BXQYJW',
		type: 'message',
		ts: '1734322341.161179',
		bot_id: 'B0382SHFM46',
		app_id: 'A037UTP0Z39',
		text: 'test message\n_Automated with this <http://localhost:5678/workflow/qJdEfiBgYLdfYOTs?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.slack_be251a83c052a9862eeac953816fbb1464f89dfbf79d7ac490a8e336a8cc8bfd|n8n workflow>_',
		team: 'T0364MSFHV2',
		bot_profile: {
			id: 'B0382SHFM46',
			app_id: 'A037UTP0Z39',
			name: 'blocks-test',
			icons: {
				image_36: 'https://a.slack-edge.com/80588/img/plugins/app/bot_36.png',
				image_48: 'https://a.slack-edge.com/80588/img/plugins/app/bot_48.png',
				image_72: 'https://a.slack-edge.com/80588/img/plugins/app/service_72.png',
			},
			deleted: false,
			updated: 1648028754,
			team_id: 'T0364MSFHV2',
		},
		blocks: [
			{
				type: 'rich_text',
				block_id: '2BN',
				elements: [
					{
						type: 'rich_text_section',
						elements: [
							{
								type: 'text',
								text: 'test message\n',
							},
							{
								type: 'text',
								text: 'Automated with this ',
								style: {
									italic: true,
								},
							},
							{
								type: 'link',
								url: 'http://localhost:5678/workflow/qJdEfiBgYLdfYOTs?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.slack_be251a83c052a9862eeac953816fbb1464f89dfbf79d7ac490a8e336a8cc8bfd',
								text: 'n8n workflow',
								style: {
									italic: true,
								},
							},
						],
					},
				],
			},
		],
	},
	{
		user: 'U0362BXQYJW',
		type: 'message',
		ts: '1734321960.507649',
		edited: {
			user: 'B0382SHFM46',
			ts: '1734324905.000000',
		},
		bot_id: 'B0382SHFM46',
		app_id: 'A037UTP0Z39',
		text: 'updated message',
		team: 'T0364MSFHV2',
		bot_profile: {
			id: 'B0382SHFM46',
			app_id: 'A037UTP0Z39',
			name: 'blocks-test',
			icons: {
				image_36: 'https://a.slack-edge.com/80588/img/plugins/app/bot_36.png',
				image_48: 'https://a.slack-edge.com/80588/img/plugins/app/bot_48.png',
				image_72: 'https://a.slack-edge.com/80588/img/plugins/app/service_72.png',
			},
			deleted: false,
			updated: 1648028754,
			team_id: 'T0364MSFHV2',
		},
		blocks: [
			{
				type: 'rich_text',
				block_id: 'wR+',
				elements: [
					{
						type: 'rich_text_section',
						elements: [
							{
								type: 'text',
								text: 'updated message',
							},
						],
					},
				],
			},
		],
	},
	{
		subtype: 'channel_join',
		user: 'U0362BXQYJW',
		text: '<@U0362BXQYJW> has joined the channel',
		type: 'message',
		ts: '1734321942.689159',
	},
];

jest.mock('../../../../V2/GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../../V2/GenericFunctions');
	return {
		...originalModule,
		slackApiRequestAllItems: jest.fn(async function (_: string, method: IHttpRequestMethods) {
			if (method === 'GET') {
				return API_RESPONSE;
			}
		}),
	};
});

describe('Test SlackV2, channel => history', () => {
	const workflows = ['nodes/Slack/test/v2/node/channel/history.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(genericFunctions.slackApiRequestAllItems).toHaveBeenCalledTimes(1);
		expect(genericFunctions.slackApiRequestAllItems).toHaveBeenCalledWith(
			'messages',
			'GET',
			'/conversations.history',
			{},
			{ channel: 'C08514ZPKB8', inclusive: true },
		);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
