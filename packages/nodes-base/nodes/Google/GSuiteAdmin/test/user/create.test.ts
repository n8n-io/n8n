import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (method === 'POST' && resource === '/directory/v1/users') {
		return {
			kind: 'admin#directory#user',
			id: '112507770188715525288',
			etag: '"vj4PppCfb9kD888SS3SnlhIiBAGttWx4xxxxiOjzAg0/KbHNNPdlcsbJEOg5pn__iQss8dQ"',
			primaryEmail: 'new@example.com',
			name: {
				givenName: 'NewOne',
				familyName: 'User',
			},
			isAdmin: false,
			isDelegatedAdmin: false,
			creationTime: '2024-12-20T20:48:53.000Z',
			customerId: 'C4444hnz2',
			orgUnitPath: '/',
			isMailboxSetup: false,
		};
	}
});

describe('Google Workspace Admin - Create User', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/user/create.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#user',
					id: '112507770188715525288',
					etag: '"vj4PppCfb9kD888SS3SnlhIiBAGttWx4xxxxiOjzAg0/KbHNNPdlcsbJEOg5pn__iQss8dQ"',
					primaryEmail: 'new@example.com',
					name: {
						givenName: 'NewOne',
						familyName: 'User',
					},
					isAdmin: false,
					isDelegatedAdmin: false,
					creationTime: '2024-12-20T20:48:53.000Z',
					customerId: 'C4444hnz2',
					orgUnitPath: '/',
					isMailboxSetup: false,
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([expectedOutput]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'POST',
			'/directory/v1/users',
			expect.objectContaining({
				name: { givenName: 'NewOne', familyName: 'User' },
				password: '12345678',
				primaryEmail: 'new@example.com',
			}),
			expect.any(Object),
		);
		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
