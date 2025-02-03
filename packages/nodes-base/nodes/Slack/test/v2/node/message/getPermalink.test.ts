import type { IHttpRequestMethods, INodeTypes, WorkflowTestData } from 'n8n-workflow';

import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';

import { executeWorkflow } from '../../../../../../test/nodes/ExecuteWorkflow';
import * as genericFunctions from '../../../../V2/GenericFunctions';

const API_RESPONSE = {
	ok: true,
	permalink: 'https://myspace-qhg7381.slack.com/archives/C08514ZPKB8/p1734322671726339',
	channel: 'C08514ZPKB8',
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

describe('Test SlackV2, message => getPermalink', () => {
	const workflows = ['nodes/Slack/test/v2/node/message/getPermalink.workflow.json'];
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
			'/chat.getPermalink',
			{},
			{ channel: 'C08514ZPKB8', message_ts: '1734322671.726339' },
		);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
