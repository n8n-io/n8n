import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequestAllItems');

googleApiRequestSpy.mockImplementation(
	async (_propertyName: string, method: string, endpoint: string) => {
		if (method === 'GET' && endpoint === '/directory/v1/groups') {
			return [
				{
					kind: 'admin#directory#group',
					id: '01302m922pmp3e4',
					etag: '"6888FoxdqGNyNxXYrlQh-KP52AygR_AaaaSbYcusikU/ylsF-zssssssi_N647777sSGHETw"',
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
				{
					kind: 'admin#directory#group',
					id: '01x0gk37352528',
					etag: '"7hJ8FoxdqGNaaaaaaaaa-KP52AygR_AihQSbYcusikU/wcHUUl5DBsuBkBI15tT1EPJpiGy00"',
					email: 'newoness@example.com',
					name: 'NewOness',
					directMembersCount: '1',
					description: 'test',
					adminCreated: true,
					nonEditableAliases: ['NewOness@example.com.test-google-a.com'],
				},
			];
		}
	},
);

describe('Google Workspace Admin - Get Many Groups', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/group/getAll.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#group',
					id: '01302m922pmp3e4',
					etag: '"6888FoxdqGNyNxXYrlQh-KP52AygR_AaaaSbYcusikU/ylsF-zssssssi_N647777sSGHETw"',
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
			{
				json: {
					kind: 'admin#directory#group',
					id: '01x0gk37352528',
					etag: '"7hJ8FoxdqGNaaaaaaaaa-KP52AygR_AihQSbYcusikU/wcHUUl5DBsuBkBI15tT1EPJpiGy00"',
					email: 'newoness@example.com',
					name: 'NewOness',
					directMembersCount: '1',
					description: 'test',
					adminCreated: true,
					nonEditableAliases: ['NewOness@example.com.test-google-a.com'],
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			const flattenedResultData = resultData.flat();
			expect(flattenedResultData).toEqual(expectedOutput);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'groups',
			'GET',
			'/directory/v1/groups',
			{},
			{ customer: 'my_customer' },
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
