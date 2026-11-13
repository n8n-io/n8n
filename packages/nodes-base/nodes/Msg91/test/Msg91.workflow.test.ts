import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Msg91 > Workflows', () => {
	const credentials = {
		msg91Api: { authkey: 'fake-authkey' },
	};

	beforeAll(() => {
		nock('https://api.msg91.com/api')
			.get('/sendhttp.php')
			.query({
				route: 4,
				country: 0,
				sender: 'ACMECO',
				mobiles: '919999999999',
				message: 'Hello',
				authkey: 'fake-authkey',
			})
			.reply(200, '3763646c3058373530393138');
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
