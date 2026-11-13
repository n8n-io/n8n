import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const profileId = 1001;
const accountId = 2001;
const transferId = 50500593;
const quoteId = 'bd244a95-dcf8-4c31-aac8-bf5e2f3e54c0';

describe('Wise > Workflows', () => {
	const credentials = {
		wiseApi: {
			apiToken: 'fake-api-token',
			environment: 'test',
		},
	};

	beforeAll(() => {
		const api = nock('https://api.sandbox.transferwise.tech').matchHeader(
			'authorization',
			'Bearer fake-api-token',
		);

		api
			.get('/v1/borderless-accounts')
			.query({ profileId })
			.reply(200, [{ id: accountId }]);
		api.get('/v1/borderless-accounts/balance-currencies').reply(200, [{ code: 'EUR' }]);
		api
			.get(`/v3/profiles/${profileId}/borderless-accounts/${accountId}/statement.json`)
			.query(true)
			.reply(200, { accountHolder: { type: 'PERSONAL' } });
		api
			.get('/v1/rates')
			.query(true)
			.reply(200, [{ rate: 1.08 }]);
		api.get(`/v1/profiles/${profileId}`).reply(200, { id: profileId, type: 'personal' });
		api.get('/v1/profiles').reply(200, [{ id: profileId, type: 'personal' }]);
		api.get('/v1/accounts').reply(200, [{ id: 3001 }]);
		api.post('/v2/quotes').reply(200, { id: quoteId });
		api.get(`/v2/quotes/${quoteId}`).reply(200, { id: quoteId });
		api.post('/v1/transfers').reply(200, { id: transferId });
		api
			.put(`/v1/transfers/${transferId}/cancel`)
			.reply(200, { id: transferId, status: 'cancelled' });
		api
			.post(`/v3/profiles/${profileId}/transfers/${transferId}/payments`, { type: 'BALANCE' })
			.reply(200, { type: 'BALANCE', status: 'COMPLETED' });
		for (const step of ['processing', 'funds_converted', 'outgoing_payment_sent']) {
			api.get(`/v1/simulation/transfers/${transferId}/${step}`).reply(200, {});
		}
		api.get(`/v1/transfers/${transferId}`).reply(200, { id: transferId });
		api.get(`/v1/transfers/${transferId}/receipt.pdf`).reply(200, Buffer.from('%PDF-1.4'));
		api
			.get('/v1/transfers')
			.query(true)
			.reply(200, [{ id: transferId }]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
