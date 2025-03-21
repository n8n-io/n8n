import { type INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (method === 'GET' && resource === '/directory/v1/customer/my_customer/devices/chromeos/') {
		return {
			kind: 'admin#directory#chromeosdevices',
			etag: '"6gJ8FoxdqGNyNxXYrlQh-KP52AygR_AihQSbYcusikU/oMWMqbsluP5m2PCo8Y7WmWeHGP4"',
		};
	}
});

describe('Google Workspace Admin - Get Many Devices', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/node/device/getAll.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#chromeosdevices',
					etag: '"6gJ8FoxdqGNyNxXYrlQh-KP52AygR_AihQSbYcusikU/oMWMqbsluP5m2PCo8Y7WmWeHGP4"',
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([expectedOutput]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/directory/v1/customer/my_customer/devices/chromeos/',
			{},
			{
				customer: 'my_customer',
				includeChildOrgunits: false,
				maxResults: 100,
				orderBy: 'notes',
				orgUnitPath: '/admin-google Testing OU/Child OU',
				projection: 'basic',
			},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
