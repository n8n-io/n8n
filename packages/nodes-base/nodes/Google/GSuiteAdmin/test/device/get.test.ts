import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.get(
				'/directory/v1/customer/my_customer/devices/chromeos/9999ffff-7aa7-4444-8555-f7de48484b4a?projection=basic',
			)
			.reply(200, {
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
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['get.workflow.json'],
	});
});
