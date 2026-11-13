import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	microsoftOAuth2Api: {
		oauthTokenData: {
			access_token: 'test-access-token',
		},
		graphApiBaseUrl: 'https://graph.microsoft.com',
	},
};

const site =
	'/v1.0/sites/contoso.sharepoint.com,2c712a40-7a5b-4f3c-b8f8-1a0c9b6d8e21,6d0e4c55-3a7b-4d1e-9f2c-8b5a1e7d3c40';
const drive = `${site}/drives/b!QCpxLFt6PE-4-BoMm22OIVVMDm17Ox5NnyyLqh59PEA`;
const workbook = `${drive}/items/01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I/workbook`;
const sheet = `${workbook}/worksheets/%7BA0883CFE-D27E-4ECC-B94B-981830AAD55B%7D`;
const table = `${workbook}/tables/%7B317CA469-7D1C-4A5D-9B0B-424444BF0336%7D`;
const columns = { value: [{ name: 'Name' }, { name: 'Email' }] };

describe('Microsoft Excel (SharePoint) - request URLs', () => {
	beforeAll(() => {
		const graph = nock('https://graph.microsoft.com');

		graph
			.post(`${table}/convertToRange`)
			.reply(200, { address: 'Sheet1!A1:B3' })
			.delete(table)
			.reply(204);

		graph.get(`${table}/columns`).query({ $top: 2 }).reply(200, columns);

		graph
			.get(`${table}/rows`)
			.query({ $top: 100 })
			.reply(200, {
				value: [
					{ values: [['Frank', 'frank@contoso.com']] },
					{ values: [['Jon', 'jon@contoso.com']] },
				],
			})
			.get(`${table}/columns`)
			.query({ $select: 'name', $top: 100 })
			.reply(200, columns);

		const values = [
			['Name', 'Email'],
			['Frank', 'frank@contoso.com'],
			['Jon', 'jon@contoso.com'],
		];
		graph
			.get(`${sheet}/range(address='A1:B3')`)
			.reply(200, { address: 'Sheet1!A1:B3', values })
			.patch(`${sheet}/range(address='A1:B3')`)
			.reply(200, {
				address: 'Sheet1!A1:B3',
				values: [values[0], ['Frank', 'frank@fabrikam.com'], values[2]],
			});

		graph
			.get('/v1.0/sites/contoso.sharepoint.com:/sites/Finance%20Team')
			.query({ $select: 'id' })
			.reply(200, {
				id: 'contoso.sharepoint.com,2c712a40-7a5b-4f3c-b8f8-1a0c9b6d8e21,6d0e4c55-3a7b-4d1e-9f2c-8b5a1e7d3c40',
			})
			.get(`${drive}/root/search(q='Budget')`)
			.query({ $top: 10 })
			.reply(200, {
				value: [{ id: '01FUWX3BQ4ATCOZNR265GLA6IJEZDQUE4I', name: 'Budget.xlsx', file: {} }],
			});
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requestUrls.workflow.json'],
	});
});
