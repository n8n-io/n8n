import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../../v2/transport';

const microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequestAllItems');

microsoftApiRequestSpy.mockImplementation(async (_, method: string) => {
	if (method === 'GET') {
		return [
			{
				id: '42:aaabbbccc.tacv2',
				createdDateTime: '2022-03-26T17:18:33Z',
				displayName: 'Sales West',
				description: 'Description of Sales West',
				isFavoriteByDefault: null,
				email: null,
				tenantId: 'tenantId-111-222-333',
				webUrl:
					'https://teams.microsoft.com/l/channel/threadId/Sales%20West?groupId=1111-2222-3333&tenantId=tenantId-111-222-333&allowXTenantAccess=False',
				membershipType: 'standard',
			},
			{
				id: '19:8662cdf2d8ff49eabdcf6364bc0fe3a2@thread.tacv2',
				createdDateTime: '2022-03-26T17:18:30Z',
				displayName: 'Sales East',
				description: 'Description of Sales West',
				isFavoriteByDefault: null,
				email: null,
				tenantId: 'tenantId-111-222-333',
				webUrl:
					'https://teams.microsoft.com/l/channel/19%3A8662cdf2d8ff49eabdcf6364bc0fe3a2%40thread.tacv2/Sales%20East?groupId=1111-2222-3333&tenantId=tenantId-111-222-333&allowXTenantAccess=False',
				membershipType: 'standard',
			},
			{
				id: '19:a95209ede91f4d5595ac944aeb172124@thread.tacv2',
				createdDateTime: '2022-03-26T17:18:16Z',
				displayName: 'General',
				description: 'Description of U.S. Sales',
				isFavoriteByDefault: null,
				email: 'U.S.Sales@5w1hb7.onmicrosoft.com',
				tenantId: 'tenantId-111-222-333',
				webUrl:
					'https://teams.microsoft.com/l/channel/19%3Aa95209ede91f4d5595ac944aeb172124%40thread.tacv2/U.S.%20Sales?groupId=1111-2222-3333&tenantId=tenantId-111-222-333&allowXTenantAccess=False',
				membershipType: 'standard',
			},
		];
	}
});

describe('Test MicrosoftTeamsV2, channel => getAll', () => {
	const workflows = ['nodes/Microsoft/Teams/test/v2/node/channel/getAll.workflow.json'];
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
			'value',
			'GET',
			'/v1.0/teams/1111-2222-3333/channels',
			{},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
