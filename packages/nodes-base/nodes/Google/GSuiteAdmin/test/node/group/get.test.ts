import { type INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (method === 'GET' && resource === '/directory/v1/groups/52528m922pmp3e4') {
		return {
			kind: 'admin#directory#group',
			id: '52528m922pmp3e4',
			etag: '"6gJ8FoxdqGNyMmMMrlQh-KP52AaaR_AihQSbYaaU/6TkH1J8VWq3gG4DMvrAUFMUM1VU"',
			email: 'new3@example.com',
			name: 'new2',
			directMembersCount: '2',
			description: 'new1',
			adminCreated: true,
			aliases: ['new2@example.com', 'new@example.com', 'NewOnes@example.com'],
			nonEditableAliases: [
				'NewOnes@example.com.test-google-a.com',
				'new@example.com.test-google-a.com',
				'new2@example.com.test-google-a.com',
				'new3@example.com.test-google-a.com',
			],
		};
	}
});

describe('Google Workspace Admin - Get Group', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/node/group/get.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#group',
					id: '52528m922pmp3e4',
					etag: '"6gJ8FoxdqGNyMmMMrlQh-KP52AaaR_AihQSbYaaU/6TkH1J8VWq3gG4DMvrAUFMUM1VU"',
					email: 'new3@example.com',
					name: 'new2',
					directMembersCount: '2',
					description: 'new1',
					adminCreated: true,
					aliases: ['new2@example.com', 'new@example.com', 'NewOnes@example.com'],
					nonEditableAliases: [
						'NewOnes@example.com.test-google-a.com',
						'new@example.com.test-google-a.com',
						'new2@example.com.test-google-a.com',
						'new3@example.com.test-google-a.com',
					],
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([expectedOutput]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/directory/v1/groups/52528m922pmp3e4',
			{},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
