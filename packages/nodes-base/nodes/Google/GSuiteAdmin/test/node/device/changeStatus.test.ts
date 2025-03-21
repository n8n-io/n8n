import { type INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (
		method === 'POST' &&
		resource ===
			'/directory/v1/customer/my_customer/devices/chromeos/9140fcff-7ba7-4324-8552-f7de68481b4c/action'
	) {
		return {
			kind: 'admin#directory#chromeosdeviceAction',
			action: 'reenable',
			status: 'SUCCESS',
		};
	}
});

describe('Google Workspace Admin - Change Device Status', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/node/device/changeStatus.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#chromeosdeviceAction',
					action: 'reenable',
					status: 'SUCCESS',
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([expectedOutput]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'POST',
			'/directory/v1/customer/my_customer/devices/chromeos/9140fcff-7ba7-4324-8552-f7de68481b4c/action',
			expect.objectContaining({
				action: 'reenable',
			}),
		);
		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
