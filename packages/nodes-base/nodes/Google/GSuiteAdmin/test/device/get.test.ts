import { equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = ['nodes/Google/GSuiteAdmin/test/device/get.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	describe('should get device', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://www.googleapis.com/admin',
				mocks: [
					{
						method: 'get',
						path: '/directory/v1/customer/my_customer/devices/chromeos/9999ffff-7aa7-4444-8555-f7de48484b4a?projection=basic',
						statusCode: 200,
						responseBody: {
							kind: 'admin#directory#chromeosdevice',
							etag: '"example"',
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
				],
			};
			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
