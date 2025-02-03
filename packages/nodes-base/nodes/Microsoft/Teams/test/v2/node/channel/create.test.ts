import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../../v2/transport';

const microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequest');

microsoftApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'POST') {
		return {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#teams('1644e7fe-547e-4223-a24f-922395865343')/channels/$entity",
			id: '19:16259efabba44a66916d91dd91862a6f@thread.tacv2',
			createdDateTime: '2023-10-26T05:37:43.4798824Z',
			displayName: 'New Channel',
			description: 'new channel description',
			isFavoriteByDefault: null,
			email: '',
			webUrl:
				'https://teams.microsoft.com/l/channel/19%3a16259efabba44a66916d91dd91862a6f%40thread.tacv2/New+Channel?groupId=1644e7fe-547e-4223-a24f-922395865343&tenantId=tenantId-111-222-333',
			membershipType: 'private',
		};
	}
});

describe('Test MicrosoftTeamsV2, channel => create', () => {
	const workflows = ['nodes/Microsoft/Teams/test/v2/node/channel/create.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(microsoftApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
			'POST',
			'/v1.0/teams/1644e7fe-547e-4223-a24f-922395865343/channels',
			{
				description: 'new channel description',
				displayName: 'New Channel',
				membershipType: 'private',
			},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
