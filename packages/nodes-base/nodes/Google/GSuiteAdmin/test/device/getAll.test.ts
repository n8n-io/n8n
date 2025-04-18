import nock from 'nock';

import { initBinaryDataService, testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('getAll.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

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

	testWorkflows(workflows);
});
