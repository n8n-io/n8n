import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const invoice = { InvoiceID: 'INV-0042', Reference: 'PO-77' };
const contact = { ContactID: 'c0ffee00-1111-4222-8333-444455556666', Name: 'Acme Corp' };

describe('Xero > Workflows', () => {
	const credentials = {
		xeroOAuth2Api: {
			oauthTokenData: { access_token: 'fake-access-token' },
		},
	};

	beforeAll(() => {
		const api = nock('https://api.xero.com/api.xro/2.0').matchHeader(
			'xero-tenant-id',
			'b1c2d3e4-0000-4000-8000-000000000001',
		);
		api.get('/Invoices/INV-0042').reply(200, { Invoices: [invoice] });
		api.post('/Invoices/INV-0042').reply(200, { Invoices: [invoice] });
		api.get('/Invoices').reply(200, { Invoices: [invoice] });
		api.post('/Contacts').reply(200, { Contacts: [contact] });
		api.get('/Contacts/c0ffee00-1111-4222-8333-444455556666').reply(200, { Contacts: [contact] });
		api.post('/Contacts/c0ffee00-1111-4222-8333-444455556666').reply(200, { Contacts: [contact] });
		api.get('/Contacts').reply(200, { Contacts: [contact] });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
