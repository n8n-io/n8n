import { type INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string) => {
	if (
		method === 'GET' &&
		resource.startsWith('/directory/v1/customer/my_customer/devices/chromeos')
	) {
		return {
			kind: 'admin#directory#chromeosdevice',
			etag: '"6aJ8FaadqGNnNxXYrlQq-KK55AttR_AihQSbYcusikU/4cn5DGy7Rq3p932xo9lUxrwisdk"',
			deviceId: '9999ffff-7aa7-4444-8555-f7de48484b4a',
			serialNumber: '5DD1155DD44',
			status: 'DISABLED',
			lastSync: '2025-02-12T07:17:16.950Z',
			annotatedUser: 'my user',
			annotatedLocation: 'test',
			annotatedAssetId: '1234567788',
			notes: 'test',
			orgUnitPath: '/',
			orgUnitId: '00pp8a2z1uu85pp',
			extendedSupportEligible: false,
			chromeOsType: 'chromeOs',
			diskSpaceUsage: {
				capacityBytes: '549755813888',
				usedBytes: '549755813888',
			},
		};
	}
});

describe('Google Workspace Admin - Get Device', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/node/device/get.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#chromeosdevice',
					etag: '"6aJ8FaadqGNnNxXYrlQq-KK55AttR_AihQSbYcusikU/4cn5DGy7Rq3p932xo9lUxrwisdk"',
					deviceId: '9999ffff-7aa7-4444-8555-f7de48484b4a',
					serialNumber: '5DD1155DD44',
					status: 'DISABLED',
					lastSync: '2025-02-12T07:17:16.950Z',
					annotatedUser: 'my user',
					annotatedLocation: 'test',
					annotatedAssetId: '1234567788',
					notes: 'test',
					orgUnitPath: '/',
					orgUnitId: '00pp8a2z1uu85pp',
					extendedSupportEligible: false,
					chromeOsType: 'chromeOs',
					diskSpaceUsage: {
						capacityBytes: '549755813888',
						usedBytes: '549755813888',
					},
				},
			},
		];

		resultNodeData.forEach(({ resultData }) => {
			expect(resultData).toEqual([expectedOutput]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/directory/v1/customer/my_customer/devices/chromeos/9999ffff-7aa7-4444-8555-f7de48484b4a?projection=basic',
			{},
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
