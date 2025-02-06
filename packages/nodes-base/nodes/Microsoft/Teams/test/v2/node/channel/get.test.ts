import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../../v2/transport';

const microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequest');

microsoftApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'GET') {
		return {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#teams('e25bae35-7bcc-4fb7-b4f2-0d5caef251fd')/channels/$entity",
			id: '19:dff84a49e5124cc89dff0192c621ea0f@thread.tacv2',
			createdDateTime: '2022-03-26T17:16:51Z',
			displayName: 'General',
			description: 'Description of Retail',
			isFavoriteByDefault: null,
			email: 'Retail@5w1hb7.onmicrosoft.com',
			tenantId: 'tenantId-111-222-333',
			webUrl:
				'https://teams.microsoft.com/l/channel/19%3Adff84a49e5124cc89dff0192c621ea0f%40thread.tacv2/General?groupId=e25bae35-7bcc-4fb7-b4f2-0d5caef251fd&tenantId=tenantId-111-222-333&allowXTenantAccess=True',
			membershipType: 'standard',
		};
	}
});

describe('Test MicrosoftTeamsV2, channel => get', () => {
	const workflows = ['nodes/Microsoft/Teams/test/v2/node/channel/get.workflow.json'];
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
			'GET',
			'/v1.0/teams/e25bae35-7bcc-4fb7-b4f2-0d5caef251fd/channels/19:dff84a49e5124cc89dff0192c621ea0f@thread.tacv2',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
