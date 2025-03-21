import { type INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (method === 'PUT' && resource === '/directory/v1/groups/01302m922p525286') {
		return {
			kind: 'admin#directory#group',
			id: '01302m922p525286',
			etag: '"DfV-pPPVZc7PJf2fSsHJTl4434ddGbO8iFIk3L4uBsQ/j-sWTPmbX5555RNjrFdaXXXk"',
			email: 'new3@example.com',
			name: 'new2',
			description: 'new1',
			adminCreated: true,
			aliases: ['new@example.com', 'NewOnes@example.com', 'new2@example.com'],
			nonEditableAliases: [
				'NewOnes@example.com.test-google-a.com',
				'new@example.com.test-google-a.com',
			],
		};
	}
});

describe('Google Workspace Admin - Update Group', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/node/group/update.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#group',
					id: '01302m922p525286',
					etag: '"DfV-pPPVZc7PJf2fSsHJTl4434ddGbO8iFIk3L4uBsQ/j-sWTPmbX5555RNjrFdaXXXk"',
					email: 'new3@example.com',
					name: 'new2',
					description: 'new1',
					adminCreated: true,
					aliases: ['new@example.com', 'NewOnes@example.com', 'new2@example.com'],
					nonEditableAliases: [
						'NewOnes@example.com.test-google-a.com',
						'new@example.com.test-google-a.com',
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
			'/directory/v1/groups/01302m922p525286',
			expect.objectContaining({
				email: 'new3@example.com',
				name: 'new2',
				description: 'new1',
			}),
		);
		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
