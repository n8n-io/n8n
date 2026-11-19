import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	getResponseApi: {
		apiKey: 'fake-api-key',
	},
};

describe('GetResponse > Request URLs', () => {
	beforeAll(() => {
		const mock = nock('https://api.getresponse.com/v3');
		mock.post('/contacts').reply(202);
		mock.delete('/contacts/pV3r').query(true).reply(204);
		mock
			.get('/contacts/pV3r')
			.query(true)
			.reply(200, { contactId: 'pV3r', email: 'nathan@example.com' });
		mock
			.get('/contacts')
			.query(true)
			.reply(200, [{ contactId: 'pV3r', email: 'nathan@example.com' }]);
		mock
			.get('/contacts')
			.query(true)
			.reply(200, [{ contactId: 'pV3r', email: 'nathan@example.com' }]);
		mock.post('/contacts/pV3r').reply(200, { contactId: 'pV3r', email: 'nathan@example.com' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
