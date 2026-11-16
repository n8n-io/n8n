import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const first = { Guid: '{7d6ab2c8-1f4b-4a4f-8e0c-ecbd28a9d3f2}', Name: 'www.example.com' };
const second = { Guid: '{a3f1c2d4-5b6e-4f70-8a9b-0c1d2e3f4a5b}', Name: 'api.example.com' };

describe('Venafi TLS Protect Datacenter > Workflows', () => {
	const credentials = {
		venafiTlsProtectDatacenterApi: {
			domain: 'https://tpp.example.com',
			clientId: 'n8n',
			username: 'nathan',
			password: 'fake-password',
			allowUnauthorizedCerts: false,
			token: 'fake-token',
			scope: 'certificate:manage',
		},
	};

	beforeAll(() => {
		const mock = nock('https://tpp.example.com');
		mock.get('/vedsdk/Certificates/%7B7d6ab2c8-1f4b-4a4f-8e0c-ecbd28a9d3f2%7D').reply(200, first);
		mock.delete('/vedsdk/Certificates/%7B7d6ab2c8-1f4b-4a4f-8e0c-ecbd28a9d3f2%7D').reply(200, {
			Success: true,
		});
		mock.get('/vedsdk/Certificates').reply(200, {
			Certificates: [first],
			_links: [{ Next: '/vedsdk/certificates/?limit=1&offset=1' }],
		});
		mock
			.get('/vedsdk/certificates/')
			.query({ limit: 1, offset: 1 })
			.reply(200, { Certificates: [second], _links: [{}] });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
