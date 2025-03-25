import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (method === 'GET' && resource === '/directory/v1/users') {
		return {
			kind: 'admin#directory#users',
			users: [
				{
					kind: 'admin#directory#user',
					id: '112507770188715252055',
					primaryEmail: 'new@example.com',
					name: {
						givenName: 'NewOne',
						familyName: 'User',
						fullName: 'NewOne User',
					},
					isAdmin: false,
					lastLoginTime: '1970-01-01T00:00:00.000Z',
					creationTime: '2024-12-20T20:48:53.000Z',
					suspended: true,
				},
				{
					kind: 'admin#directory#user',
					id: '222459372679230452528',
					primaryEmail: 'test33@example.com',
					name: {
						givenName: 'New',
						familyName: 'Test',
						fullName: 'New Test',
					},
					isAdmin: true,
					lastLoginTime: '2024-12-19T08:39:56.000Z',
					creationTime: '2024-09-06T11:48:38.000Z',
					suspended: false,
				},
			],
		};
	}
});

describe('Google Workspace Admin - Get Many Users', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/user/getAll.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#user',
					id: '112507770188715252055',
					primaryEmail: 'new@example.com',
					name: {
						givenName: 'NewOne',
						familyName: 'User',
						fullName: 'NewOne User',
					},
					isAdmin: false,
					lastLoginTime: '1970-01-01T00:00:00.000Z',
					creationTime: '2024-12-20T20:48:53.000Z',
					suspended: true,
				},
			},
			{
				json: {
					kind: 'admin#directory#user',
					id: '222459372679230452528',
					primaryEmail: 'test33@example.com',
					name: {
						givenName: 'New',
						familyName: 'Test',
						fullName: 'New Test',
					},
					isAdmin: true,
					lastLoginTime: '2024-12-19T08:39:56.000Z',
					creationTime: '2024-09-06T11:48:38.000Z',
					suspended: false,
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([[...expectedOutput]]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/directory/v1/users',
			{},
			{
				customer: 'my_customer',
				maxResults: 100,
				projection: 'basic',
			},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
