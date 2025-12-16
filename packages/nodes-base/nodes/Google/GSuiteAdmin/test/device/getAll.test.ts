import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.get('/directory/v1/customer/my_customer/devices/chromeos/')
			.query({
				customer: 'my_customer',
				includeChildOrgunits: false,
				maxResults: 100,
				orderBy: 'notes',
				orgUnitPath: '/admin-google Testing OU/Child OU',
				projection: 'basic',
			})
			.reply(200, [
				{
					kind: 'admin#directory#chromeosdevices',
					etag: '"example"',
				},
			]);
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
