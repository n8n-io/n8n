import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import balance from './fixtures/balance.json';
import smsLogs from './fixtures/smsLogs.json';
import smsSend from './fixtures/smsSend.json';
import whatsAppTemplate from './fixtures/whatsAppTemplate.json';
import whatsAppText from './fixtures/whatsAppText.json';

describe('Infobip Node', () => {
	const credentials = {
		infobipApi: {
			baseUrl: 'https://test.api.infobip.com/',
			apiKey: 'API-KEY',
		},
	};

	const infobipNock = nock('https://test.api.infobip.com');

	beforeAll(() => {
		infobipNock
			.post('/sms/3/messages', {
				messages: [
					{
						sender: 'InfoSMS',
						destinations: [{ to: '41793026727' }],
						content: { text: 'Hello from n8n' },
					},
				],
			})
			.reply(200, smsSend);

		infobipNock
			.get('/sms/3/logs')
			.query({ limit: 10, bulkId: 'bulk-1', generalStatus: 'DELIVERED' })
			.reply(200, smsLogs);

		infobipNock
			.post('/whatsapp/1/message/template', {
				messages: [
					{
						from: '441134960000',
						to: '441134960001',
						content: {
							templateName: 'order_update',
							language: 'en',
							templateData: { body: { placeholders: ['Ada', '#1234'] } },
						},
					},
				],
			})
			.reply(200, whatsAppTemplate);

		infobipNock
			.post('/whatsapp/1/message/text', {
				from: '441134960000',
				to: '441134960001',
				content: { text: 'See https://n8n.io', previewUrl: true },
			})
			.reply(200, whatsAppText);

		infobipNock.get('/account/1/balance').reply(200, balance);
	});

	afterAll(() => infobipNock.done());

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['infobip.workflow.json'],
	});
});
