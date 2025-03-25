import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import type { INodeTypes } from 'n8n-workflow';

import * as transport from '../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (method === 'GET' && resource === '/directory/v1/users/112507770188715252528') {
		return {
			kind: 'admin#directory#user',
			id: '112507770188715252528',
			primaryEmail: 'new@example.com',
			name: {
				givenName: 'New One',
				familyName: 'User',
				fullName: 'New One User',
			},
			isAdmin: false,
			lastLoginTime: '1970-01-01T00:00:00.000Z',
			creationTime: '2024-12-20T20:48:53.000Z',
			suspended: true,
		};
	}
});

describe('Google Workspace Admin - Get User', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/user/get.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#user',
					id: '112507770188715252528',
					primaryEmail: 'new@example.com',
					name: {
						givenName: 'New One',
						familyName: 'User',
						fullName: 'New One User',
					},
					isAdmin: false,
					lastLoginTime: '1970-01-01T00:00:00.000Z',
					creationTime: '2024-12-20T20:48:53.000Z',
					suspended: true,
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([expectedOutput]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/directory/v1/users/112507770188715252528',
			{},
			{ projection: 'basic' },
		);
		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
