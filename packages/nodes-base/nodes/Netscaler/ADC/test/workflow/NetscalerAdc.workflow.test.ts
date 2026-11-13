import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Netscaler ADC > Workflows', () => {
	const credentials = {
		citrixAdcApi: {
			url: 'https://adc.example.com/',
			username: 'nsroot',
			password: 'fake-password',
		},
	};

	beforeAll(() => {
		const api = nock('https://adc.example.com/nitro/v1');

		api
			.delete('/config/systemfile')
			.query({ args: 'filename:server.crt,filelocation:/nsconfig/ssl/' })
			.reply(200, {});
		api
			.get('/config/systemfile')
			.query({ args: 'filename:server.key,filelocation:/nsconfig/ssl/' })
			.reply(200, {
				systemfile: [
					{ filename: 'server.key', filecontent: 'aGVsbG8=', filelocation: '/nsconfig/ssl' },
				],
			});
		api
			.post('/config/sslcert', {
				sslcert: {
					reqfile: 'root.csr',
					certfile: 'root.crt',
					certform: 'PEM',
					certType: 'ROOT_CERT',
					keyfile: 'root.key',
				},
			})
			.query({ action: 'create' })
			.reply(200, {});
		api
			.post('/config/sslcertkey', {
				sslcertkey: { cert: 'web.crt', certkey: 'web-cert', key: 'web.key', inform: 'DER' },
			})
			.reply(200, {});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
