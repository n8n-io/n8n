import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (method === 'PUT' && resource === '/directory/v1/users/109459372679230452528') {
		return {
			kind: 'admin#directory#user',
			id: '109459372679230452528',
			etag: '"sssPvLCfb9kD8ZWWJ2SmiAAGttWx4uxgdgOjgAg0/AvS6MdzbMMMOMBMu0pnCUFh_RRR"',
			primaryEmail: 'one@example.com',
			name: {
				givenName: 'test',
				familyName: 'new',
			},
			isAdmin: true,
			isDelegatedAdmin: false,
			creationTime: '2024-09-06T11:48:38.000Z',
			suspended: false,
			archived: true,
			phones: [
				{
					type: 'assistant',
					value: '123',
					primary: true,
				},
			],
			emails: [
				{
					type: 'home',
					address: 'newone@example.com',
				},
			],
		};
	}
});

describe('Google Workspace Admin - Update User', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/user/update.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#user',
					id: '109459372679230452528',
					etag: '"sssPvLCfb9kD8ZWWJ2SmiAAGttWx4uxgdgOjgAg0/AvS6MdzbMMMOMBMu0pnCUFh_RRR"',
					primaryEmail: 'one@example.com',
					name: {
						givenName: 'test',
						familyName: 'new',
					},
					isAdmin: true,
					isDelegatedAdmin: false,
					creationTime: '2024-09-06T11:48:38.000Z',
					suspended: false,
					archived: true,
					phones: [
						{
							type: 'assistant',
							value: '123',
							primary: true,
						},
					],
					emails: [
						{
							type: 'home',
							address: 'newone@example.com',
						},
					],
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([expectedOutput]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'PUT',
			'/directory/v1/users/109459372679230452528',
			expect.objectContaining({
				name: { givenName: 'test', familyName: 'new' },
				primaryEmail: 'one@example.com',
				phones: [
					{
						type: 'assistant',
						value: '123',
						primary: true,
					},
				],
				emails: [
					{
						type: 'home',
						address: 'newone@example.com',
					},
				],
			}),
			expect.any(Object),
		);
		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
