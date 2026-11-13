import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const modules = [
	'accounts',
	'contacts',
	'deals',
	'invoices',
	'leads',
	'products',
	'purchase_orders',
	'quotes',
	'sales_orders',
	'vendors',
];

describe('Zoho CRM > Workflows', () => {
	const credentials = {
		zohoOAuth2Api: {
			oauthTokenData: {
				access_token: 'fake-access-token',
				api_domain: 'https://www.zohoapis.com',
			},
		},
	};

	beforeAll(() => {
		const api = nock('https://www.zohoapis.com/crm/v2');
		modules.forEach((module, index) => {
			const id = String(4876876000000624001n + BigInt(index));
			const details = { data: [{ status: 'success', details: { id } }] };
			api.get(`/${module}/${id}`).reply(200, { data: [{ id }] });
			api.put(`/${module}/${id}`).reply(200, details);
			api.delete(`/${module}/${id}`).reply(200, details);
		});
		api
			.get('/accounts')
			.query({ per_page: 200, page: 1 })
			.reply(200, { data: [{ id: '1' }], info: { more_records: false } });
		api
			.get('/settings/fields')
			.query({ module: 'leads' })
			.reply(200, { fields: [{ api_name: 'Email' }] });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
