import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const ticket = { id: 77, subject: 'Printer is broken', status: 2 };
const ticket2 = { id: 78, subject: 'Screen is broken', status: 2 };
const contact = { id: 501, name: 'Nathan', email: 'nathan@example.com' };

describe('Freshdesk > Workflows', () => {
	const credentials = {
		freshdeskApi: {
			apiKey: 'fake-api-key',
			domain: 'acme',
		},
	};

	beforeAll(() => {
		const mock = nock('https://acme.freshdesk.com/api/v2').matchHeader(
			'authorization',
			Buffer.from('fake-api-key:X').toString('base64'),
		);
		mock.post('/tickets').reply(200, ticket);
		mock.put('/tickets/77', { status: 3 }).reply(200, ticket);
		mock.get('/tickets/77').reply(200, ticket);
		mock.get('/tickets').query({ per_page: 2 }).reply(200, [ticket]);
		mock.get('/tickets').query({ per_page: 100 }).reply(200, [ticket], {
			link: '<https://acme.freshdesk.com/api/v2/tickets?page=2&per_page=100>; rel="next"',
		});
		mock
			.get('/tickets')
			.query({ page: 2, per_page: [100, 100] })
			.reply(200, [ticket2]);
		mock.delete('/tickets/77').reply(204);
		mock.post('/contacts', { name: 'Nathan', email: 'nathan@example.com' }).reply(200, contact);
		mock.get('/contacts/501').reply(200, contact);
		mock.get('/contacts').reply(200, [contact]);
		mock.put('/contacts/501', { job_title: 'Engineer' }).reply(200, contact);
		mock.delete('/contacts/501').reply(204);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
