import type { IHttpRequestMethods, INodeTypes, WorkflowTestData } from 'n8n-workflow';

import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';

import { executeWorkflow } from '../../../../../../test/nodes/ExecuteWorkflow';
import * as genericFunctions from '../../../../V2/GenericFunctions';

const API_RESPONSE = {
	ok: true,
	channel: 'C08514ZPKB8',
	text: 'updated message',
	message: {
		user: 'U0362BXQYJW',
		type: 'message',
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
				block_id: 'Akc',
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
	message_timestamp: '1734321960.507649',
};

jest.mock('../../../../V2/GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../../V2/GenericFunctions');
	return {
		...originalModule,
		slackApiRequest: jest.fn(async function (method: IHttpRequestMethods) {
			if (method === 'POST') {
				return API_RESPONSE;
			}
		}),
	};
});

describe('Test SlackV2, message => update', () => {
	const workflows = ['nodes/Slack/test/v2/node/message/update.workflow.json'];
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
			'POST',
			'/chat.update',
			{
				channel: 'C08514ZPKB8',
				link_names: true,
				parse: 'none',
				text: 'updated message',
				ts: '1734321960.507649',
			},
			{},
		);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
