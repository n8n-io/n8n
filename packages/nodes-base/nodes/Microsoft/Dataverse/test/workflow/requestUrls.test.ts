import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Microsoft Dataverse, request URLs', () => {
	const baseUrl = 'https://acme.crm.dynamics.com';
	const recordId = '5f2a6c1e-8b3d-4e7a-9c10-2d4b6f8a0c11';
	const nextLink = `${baseUrl}/api/data/v9.2/accounts?$skiptoken=%3Ccookie%20pagenumber=%222%22%20/%3E`;

	const credentials = {
		microsoftDataverseOAuth2Api: {
			environmentUrl: baseUrl,
			grantType: 'authorizationCode',
			scope: `${baseUrl}/.default offline_access`,
			oauthTokenData: { access_token: 'ACCESSTOKEN' },
		},
	};

	beforeAll(() => {
		const api = nock(`${baseUrl}/api/data/v9.2`);

		api.get('/accounts').reply(200, {
			value: [{ accountid: 'a1', name: 'First' }],
			'@odata.nextLink': nextLink,
		});
		api
			.get('/accounts')
			.query({ $skiptoken: '<cookie pagenumber="2" />' })
			.reply(200, { value: [{ accountid: 'a2', name: 'Second' }] });

		api.get(`/accounts(${recordId})`).reply(200, { accountid: recordId, name: 'Acme Corp' });

		api
			.get('/EntityDefinitions')
			.query({ $select: 'LogicalName', $filter: "EntitySetName eq 'accounts'" })
			.reply(200, { value: [{ LogicalName: 'account' }] });
		api
			.get("/EntityDefinitions(LogicalName='account')/ManyToOneRelationships")
			.query({
				$select: 'ReferencingAttribute,ReferencingEntityNavigationPropertyName,ReferencedEntity',
			})
			.reply(200, { value: [] });
		api
			.post('/accounts', { name: 'Acme Corp' })
			.reply(201, { accountid: recordId, name: 'Acme Corp' });

		api
			.patch(`/accounts(${recordId})`, { revenue: 1000 })
			.reply(200, { accountid: recordId, revenue: 1000 });

		api
			.patch("/accounts(accountnumber='ACC-001')", { revenue: 5 })
			.reply(200, { accountid: recordId, revenue: 5 });

		api.delete(`/accounts(${recordId})`).reply(204);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requestUrls.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
