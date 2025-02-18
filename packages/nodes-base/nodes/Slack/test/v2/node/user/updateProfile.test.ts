import type { INodeTypes, WorkflowTestData } from 'n8n-workflow';

import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';

import { executeWorkflow } from '../../../../../../test/nodes/ExecuteWorkflow';
import * as genericFunctions from '../../../../V2/GenericFunctions';

const API_RESPONSE = { profile: { test: 'OK' } };

jest.mock('../../../../V2/GenericFunctions', () => {
	const originalModule = jest.requireActual('../../../../V2/GenericFunctions');
	return {
		...originalModule,
		slackApiRequest: jest.fn(async function () {
			return API_RESPONSE;
		}),
	};
});

describe('Test SlackV2, user => updateProfile', () => {
	const workflows = ['nodes/Slack/test/v2/node/user/updateProfile.workflow.json'];
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
			'/users.profile.set',
			{
				profile: {
					customFieldUi: {
						customFieldValues: [{ alt: '', id: 'Xf05SGHVUDKM', value: 'TEST title' }],
					},
					email: 'some@email.com',
					fields: { Xf05SGHVUDKM: { alt: '', value: 'TEST title' } },
					first_name: 'first',
					last_name: 'last',
					status_emoji: '👶',
					status_expiration: 1734670800,
					status_text: 'test status',
				},
				user: 'id-new',
			},
			{},
		);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
