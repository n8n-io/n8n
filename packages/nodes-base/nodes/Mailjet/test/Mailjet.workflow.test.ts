import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Mailjet', () => {
	const credentials = {
		mailjetEmailApi: {
			apiKey: 'test-api-key',
			secretKey: 'test-secret-key',
			sandboxMode: false,
		},
		mailjetSmsApi: {
			token: 'test-token',
		},
	};

	describe('Run workflow', () => {
		beforeAll(() => {
			const mock = nock('https://api.mailjet.com');

			mock
				.post('/v3.1/send', (body) => body.Messages[0].Subject === 'Test Email')
				.reply(200, {
					Messages: [{ Status: 'success', To: [{ Email: 'recipient@example.com' }] }],
				});
			mock
				.post('/v3.1/send', (body) => body.Messages[0].TemplateID === 4812345)
				.reply(200, {
					Messages: [{ Status: 'success', To: [{ Email: 'recipient@example.com' }] }],
				});
			mock
				.post('/v4/sms-send', { From: 'n8n', To: '+15555550100', Text: 'Test SMS' })
				.reply(200, { From: 'n8n', To: '+15555550100', Status: { Code: 2 } });
		});

		afterAll(() => {
			expect(nock.isDone()).toBe(true);
		});

		new NodeTestHarness().setupTests({ credentials });
	});
});
