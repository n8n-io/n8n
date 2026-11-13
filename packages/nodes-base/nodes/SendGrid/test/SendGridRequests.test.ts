import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('SendGrid > Request URLs', () => {
	const credentials = {
		sendGridApi: {
			apiKey: 'test-api-key',
		},
	};
	const contactId = 'ab12cd34-5678-90ef-1234-567890abcdef';
	const listId = 'f1e2d3c4-b5a6-4789-9012-3456789abcde';

	beforeAll(() => {
		const mock = nock('https://api.sendgrid.com/v3');
		mock.get('/marketing/contacts').reply(200, { result: [{ id: contactId }], _metadata: {} });
		mock
			.post('/marketing/contacts/search')
			.reply(200, { result: [{ id: contactId }], _metadata: {} });
		mock.get(`/marketing/contacts/${contactId}`).reply(200, { id: contactId });
		mock.put('/marketing/contacts').reply(202, { job_id: 'job-1' });
		mock.delete('/marketing/contacts').query({ ids: contactId }).reply(202, { job_id: 'job-2' });
		mock.get('/marketing/lists').reply(200, { result: [{ id: listId }], _metadata: {} });
		mock
			.get(`/marketing/lists/${listId}`)
			.query({ contact_sample: false })
			.reply(200, { id: listId });
		mock.post('/marketing/lists').reply(201, { id: listId });
		mock.delete(`/marketing/lists/${listId}`).query({ delete_contacts: false }).reply(204);
		mock.patch(`/marketing/lists/${listId}`).reply(200, { id: listId });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
