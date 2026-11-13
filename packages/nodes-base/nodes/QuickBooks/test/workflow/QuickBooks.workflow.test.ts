import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const ids = {
	bill: '145',
	customer: '58',
	employee: '55',
	estimate: '101',
	invoice: '130',
	item: '19',
	payment: '163',
	purchase: '252',
	vendor: '56',
};

type Resource = keyof typeof ids;

const capitalize = (resource: Resource) => resource.charAt(0).toUpperCase() + resource.slice(1);

const entity = (resource: Resource) => ({
	[capitalize(resource)]: {
		Id: ids[resource],
		SyncToken: '2',
		VendorRef: { name: 'Acme Supplies', value: '56' },
		CustomerRef: { name: 'Amy Lauterbach', value: '58' },
	},
});

const getCalls: Record<Resource, number> = {
	bill: 3,
	customer: 2,
	employee: 2,
	estimate: 3,
	invoice: 4,
	item: 1,
	payment: 4,
	purchase: 1,
	vendor: 2,
};

describe('QuickBooks > Workflows', () => {
	const credentials = {
		quickBooksOAuth2Api: {
			environment: 'production',
			oauthTokenData: {
				access_token: 'fake-access-token',
				callbackQueryString: { realmId: '9130357766900000' },
			},
		},
	};

	beforeAll(() => {
		const api = nock('https://quickbooks.api.intuit.com/v3/company/9130357766900000').matchHeader(
			'authorization',
			'Bearer fake-access-token',
		);

		for (const resource of Object.keys(ids) as Resource[]) {
			const id = ids[resource];
			api.get(`/${resource}/${id}`).times(getCalls[resource]).reply(200, entity(resource));
			api
				.get('/query')
				.query({ query: `SELECT * FROM ${resource} MAXRESULTS 1` })
				.reply(200, { QueryResponse: { [capitalize(resource)]: [{ Id: id }] } });
		}

		for (const resource of [
			'bill',
			'customer',
			'employee',
			'estimate',
			'invoice',
			'payment',
			'vendor',
		] as const) {
			api.post(`/${resource}`).times(2).reply(200, entity(resource));
		}

		for (const resource of ['bill', 'estimate', 'invoice', 'payment'] as const) {
			api.post(`/${resource}`).query({ operation: 'delete' }).reply(200, entity(resource));
		}

		for (const resource of ['estimate', 'invoice', 'payment'] as const) {
			api
				.post(`/${resource}/${ids[resource]}/send`)
				.query({ sendTo: 'amy@example.com' })
				.reply(200, entity(resource));
		}

		for (const resource of ['invoice', 'payment'] as const) {
			api
				.post(`/${resource}`)
				.query({ Id: ids[resource], SyncToken: '2', operation: 'void' })
				.reply(200, entity(resource));
		}

		api.get('/invoice/130/pdf').reply(200, Buffer.from('%PDF-1.4'));
		api.get('/reports/TransactionList').reply(200, {
			Columns: { Column: [{ ColType: 'tx_date' }, { ColType: 'txn_type' }] },
			Rows: { Row: [{ ColData: [{ value: '2024-01-05' }, { value: 'Invoice' }] }] },
		});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
