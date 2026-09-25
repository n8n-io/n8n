import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { WHATSAPP_BASE_URL } from '../../GenericFunctions';
import { WhatsApp } from '../../WhatsApp.node';

describe('WhatsApp Business Cloud load options', () => {
	it('loads and sorts templates from all pages', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getCredentials.mockResolvedValue({ businessAccountId: 'business-account-id' });
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce({
				data: [{ name: 'status_update', language: 'en_US' }],
				paging: {
					cursors: { after: 'next-page' },
					next: 'https://graph.facebook.com/next-page',
				},
			})
			.mockResolvedValueOnce({
				data: [{ name: 'appointment_reminder', language: 'de_DE' }],
				paging: { cursors: { after: 'last-page' } },
			});

		const result = await new WhatsApp().methods.loadOptions.getTemplates.call(context);

		expect(result.map(({ name, value }) => [name, value])).toEqual([
			['appointment_reminder - de_DE', 'appointment_reminder|de_DE'],
			['status_update - en_US', 'status_update|en_US'],
		]);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'whatsAppApi',
			{
				baseURL: WHATSAPP_BASE_URL,
				url: 'business-account-id/message_templates',
				method: 'GET',
				qs: {},
			},
		);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'whatsAppApi',
			{
				baseURL: WHATSAPP_BASE_URL,
				url: 'business-account-id/message_templates',
				method: 'GET',
				qs: { after: 'next-page' },
			},
		);
	});
});
