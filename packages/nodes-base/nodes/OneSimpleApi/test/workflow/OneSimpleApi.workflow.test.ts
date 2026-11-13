import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('OneSimpleApi > Workflows', () => {
	const credentials = {
		oneSimpleApi: {
			apiToken: 'fake-api-token',
		},
	};

	const auth = { token: 'fake-api-token', output: 'json' };

	beforeAll(() => {
		const api = nock('https://onesimpleapi.com');

		api
			.get('/api/pdf')
			.query({ ...auth, url: 'https://n8n.io', force: 'no' })
			.reply(200, { url: 'https://onesimpleapi.com/files/a1b2c3.pdf' });
		api.get('/files/a1b2c3.pdf').reply(200, Buffer.from('pdf'));
		api
			.get('/api/screenshot')
			.query({ ...auth, url: 'https://n8n.io', fullpage: 'no', force: 'no' })
			.reply(200, { url: 'https://onesimpleapi.com/files/d4e5f6.png' });
		api
			.get('/api/page_info')
			.query({ ...auth, url: 'https://n8n.io' })
			.reply(200, { title: 'n8n' });
		api
			.get('/api/instagram_profile')
			.query({ ...auth, profile: 'n8n.io' })
			.reply(200, { username: 'n8n.io' });
		api
			.get('/api/spotify_profile')
			.query({ ...auth, profile: 'Daft Punk' })
			.reply(200, { name: 'Daft Punk' });
		api
			.get('/api/exchange_rate')
			.query({ ...auth, from_currency: 'EUR', to_currency: 'USD', from_value: '10' })
			.reply(200, { value: 10.9 });
		api
			.get('/api/image_info')
			.query({ ...auth, url: 'https://n8n.io/logo.png', raw: 'true' })
			.reply(200, { width: 200 });
		api
			.get('/api/email')
			.query({ ...auth, email: 'hello@n8n.io' })
			.reply(200, { deliverable: true });
		api
			.get('/api/unshorten')
			.query({ ...auth, url: 'https://bit.ly/3abcd' })
			.reply(200, { url: 'https://n8n.io' });
		api
			.get('/api/qr_code')
			.query({ ...auth, message: 'Hello' })
			.reply(200, { url: 'https://onesimpleapi.com/files/qr.png' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
