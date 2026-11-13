import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

type RpcBody = { params: { service: string; method: string; args: unknown[] } };

const contact = { id: 42, name: 'Nathan Smith' };

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
	};

	beforeAll(() => {
		nock('https://acme.odoo.com')
			.post('/jsonrpc')
			.times(2)
			.reply(200, rpcReply, {
				'Content-Length': (_req, _res, body) => String(Buffer.byteLength(JSON.stringify(body))),
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
