import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

type RpcBody = { params: { service: string; method: string; args: unknown[] } };

const contact = { id: 42, name: 'Nathan Smith' };
const lead = { id: 7, name: 'New office chairs' };

const rpcReply = (_uri: string, body: RpcBody) => {
	const { service, method, args } = body.params;
	if (service === 'common' && method === 'login' && args[0] === 'acme') return { result: 5 };
	if (service === 'object' && args[3] === 'res.partner' && args[4] === 'read') {
		return { result: [contact] };
	}
	return { error: { data: { message: 'Unexpected request' } } };
};

describe('Odoo > Workflows', () => {
	const credentials = {
		odooApi: {
			url: 'https://acme.odoo.com/',
			username: 'nathan@example.com',
			password: 'fake-password',
			db: '',
		},
		odooApiKeyApi: {
			url: 'https://erp.example.com/odoo',
			db: 'erp',
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		nock('https://acme.odoo.com')
			.post('/jsonrpc')
			.times(4)
			.reply(200, rpcReply, {
				'Content-Length': (_req, _res, body) => String(Buffer.byteLength(JSON.stringify(body))),
			});

		const json2 = nock('https://erp.example.com/odoo').matchHeader('x-odoo-database', 'erp');
		json2.post('/json/2/res.partner/read', { ids: [42], fields: [] }).reply(200, [contact]);
		json2.post('/json/2/crm.lead/read', { ids: [7], fields: [] }).reply(200, [lead]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
