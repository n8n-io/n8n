import { type INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../GenericFunctions';

const googleApiRequestSpy = jest.spyOn(transport, 'googleApiRequest');

googleApiRequestSpy.mockImplementation(async (method: string, resource: string, body?: object) => {
	if (
		method === 'PUT' &&
		resource ===
			'/directory/v1/customer/my_customer/devices/chromeos/9990fpff-8ba8-4444-8555-f7ee88881b4c'
	) {
		return {
			kind: 'admin#directory#chromeosdevice',
			deviceId: '9990fpff-8ba8-4444-8555-f7ee88881b4c',
			serialNumber: '5CC115NN33',
			status: 'DISABLED',
			lastSync: '2025-02-12T07:17:16.950Z',
			annotatedUser: 'my user',
			annotatedLocation: 'test',
			annotatedAssetId: '1234567788',
			notes: 'test',
			model: 'Test Model',
			osVersion: '129.0.6668.99',
			platformVersion: '16002.51.0 (Official Build) stable-channel reven',
			firmwareVersion: 'FirmwareNotParsed',
			macAddress: '666c8888ffccf',
			lastEnrollmentTime: '2025-02-10T17:03:10.324Z',
			firstEnrollmentTime: '2025-02-10T17:03:10.324Z',
			orgUnitPath: '/',
			orgUnitId: '00pp88a2z2uu88pp',
			recentUsers: [{ type: 'USER_TYPE_MANAGED', email: 'admin-google@example.com' }],
			activeTimeRanges: [
				{ date: '2025-02-10', activeTime: 300000 },
				{ date: '2025-02-11', activeTime: 1920025 },
			],
			systemRamTotal: '16089374720',
			diskSpaceUsage: { capacityBytes: '549755813888', usedBytes: '85613068288' },
		};
	}
});

describe('Google Workspace Admin - Update Device', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/node/device/update.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);
		const resultNodeData = getResultNodeData(result, testData);

		const expectedOutput = [
			{
				json: {
					kind: 'admin#directory#chromeosdevice',
					deviceId: '9990fpff-8ba8-4444-8555-f7ee88881b4c',
					serialNumber: '5CC115NN33',
					status: 'DISABLED',
					lastSync: '2025-02-12T07:17:16.950Z',
					annotatedUser: 'my user',
					annotatedLocation: 'test',
					annotatedAssetId: '1234567788',
					notes: 'test',
					model: 'Test Model',
					osVersion: '129.0.6668.99',
					platformVersion: '16002.51.0 (Official Build) stable-channel reven',
					firmwareVersion: 'FirmwareNotParsed',
					macAddress: '666c8888ffccf',
					lastEnrollmentTime: '2025-02-10T17:03:10.324Z',
					firstEnrollmentTime: '2025-02-10T17:03:10.324Z',
					orgUnitPath: '/',
					orgUnitId: '00pp88a2z2uu88pp',
					recentUsers: [{ type: 'USER_TYPE_MANAGED', email: 'admin-google@example.com' }],
					activeTimeRanges: [
						{ date: '2025-02-10', activeTime: 300000 },
						{ date: '2025-02-11', activeTime: 1920025 },
					],
					systemRamTotal: '16089374720',
					diskSpaceUsage: { capacityBytes: '549755813888', usedBytes: '85613068288' },
				},
			},
		];

		resultNodeData.forEach(({ nodeName, resultData }) => {
			expect(resultData).toEqual([expectedOutput]);
		});

		expect(googleApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(googleApiRequestSpy).toHaveBeenCalledWith(
			'PUT',
			'/directory/v1/customer/my_customer/devices/chromeos/9990fpff-8ba8-4444-8555-f7ee88881b4c',
			expect.objectContaining({
				notes: 'test',
			}),
		);
		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
