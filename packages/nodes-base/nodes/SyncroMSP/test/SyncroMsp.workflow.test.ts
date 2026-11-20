import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const contact = { id: 1234567, name: 'Nathan' };
const customer = { id: 2345678, business_name: 'Acme Corp' };
const alert = { id: 3456789, status: 'active' };
const ticket = { id: 4567890, subject: 'Printer is broken' };
const ok = { message: 'ok' };

describe('SyncroMSP > Workflows', () => {
	const credentials = { syncroMspApi: { subdomain: 'acme', apiKey: 'fake-api-key' } };

	beforeAll(() => {
		const mock = nock('https://acme.syncromsp.com/api/v1');
		const query = { api_key: 'fake-api-key' };
		mock.get('/contacts/1234567').query(query).reply(200, contact);
		mock
			.get('/contacts')
			.query(query)
			.reply(200, { contacts: [contact] });
		mock.put('/contacts/1234567').query(query).reply(200, contact);
		mock.delete('/contacts/1234567').query(query).reply(200, ok);
		mock.get('/customers/2345678').query(query).reply(200, { customer });
		mock.put('/customers/2345678').query(query).reply(200, { customer });
		mock.delete('/customers/2345678').query(query).reply(200, ok);
		mock.get('/rmm_alerts/3456789').query(query).reply(200, { rmm_alert: alert });
		mock
			.post('/rmm_alerts/3456789/mute', { id: '3456789', mute_for: '1-hour' })
			.query(query)
			.reply(200, ok);
		mock.delete('/rmm_alerts/3456789').query(query).reply(200, ok);
		mock.get('/tickets/4567890').query(query).reply(200, { ticket });
		mock
			.put('/tickets/4567890', { subject: 'Printer is broken' })
			.query(query)
			.reply(200, { ticket });
		mock.delete('/tickets/4567890').query(query).reply(200, ok);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
