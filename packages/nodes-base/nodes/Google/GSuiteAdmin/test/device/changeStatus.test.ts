import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.post(
				'/directory/v1/customer/my_customer/devices/chromeos/9140fcff-7ba7-4324-8552-f7de68481b4c/action',
				{
					action: 'reenable',
				},
			)
			.reply(200, {
				kind: 'admin#directory#chromeosdeviceAction',
				action: 'reenable',
				status: 'SUCCESS',
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['changeStatus.workflow.json'],
	});
});
