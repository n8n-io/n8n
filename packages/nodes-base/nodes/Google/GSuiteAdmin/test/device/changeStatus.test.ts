import nock from 'nock';

import { initBinaryDataService, testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('changeStatus.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

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

	testWorkflows(workflows);
});
