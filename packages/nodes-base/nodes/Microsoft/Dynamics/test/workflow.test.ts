import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Microsoft Dynamics CRM > Workflows', () => {
	const credentials = {
		microsoftDynamicsOAuth2Api: {
			subdomain: 'org',
			region: 'crm.dynamics.com',
			oauthTokenData: { access_token: 'test-access-token' },
		},
	};

	const accountId = '7c6a8b3e-1f2d-4e5a-9b0c-123456789abc';
	const acme = { accountid: accountId, name: 'Acme Corp' };
	const globex = { accountid: '2d4f6a8c-3e5b-4c7d-8e9f-abcdef012345', name: 'Globex' };

	beforeAll(() => {
		nock('https://org.crm.dynamics.com/api/data/v9.2')
			.post('/accounts', { name: 'Acme Corp' })
			.query({ $select: 'accountid' })
			.reply(201, { accountid: accountId })
			.get(`/accounts(${accountId})`)
			.reply(200, acme)
			.patch(`/accounts(${accountId})`, { telephone1: '555-0100' })
			.query({ $select: 'accountid' })
			.reply(200, { accountid: accountId })
			.delete(`/accounts(${accountId})`)
			.reply(204)
			.get('/accounts')
			.query({ $top: 100 })
			.reply(200, {
				value: [acme],
				'@odata.nextLink': 'https://org.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=page2',
			})
			.get('/accounts')
			.query({ $skiptoken: 'page2', $top: 100 })
			.reply(200, { value: [globex] })
			.get('/accounts')
			.query({ $top: 2 })
			.reply(200, { value: [acme, globex] });
	});

	new NodeTestHarness().setupTests({ credentials, workflowFiles: ['workflow.json'] });

	it('should send every mocked request', () => {
		expect(nock.pendingMocks()).toEqual([]);
	});
});
