import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { twilioApiRequest, twilioTriggerApiRequest } from '../GenericFunctions';

describe('Twilio GenericFunctions', () => {
	it('should encode the account SID from the credentials', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ accountSid: 'AC123/Calls.json?x=1' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		await twilioApiRequest.call(context, 'POST', requestPath`/Messages.json`, {});

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'twilioApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value:
						'https://api.twilio.com/2010-04-01/Accounts/AC123%2FCalls.json%3Fx=1/Messages.json',
				}),
			}),
		);
	});

	it('should encode path values in trigger requests', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const sinkId = 'DG123/delete?x=1';
		await twilioTriggerApiRequest.call(context, 'DELETE', requestPath`Sinks/${sinkId}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'twilioApi',
			expect.objectContaining({
				url: expect.objectContaining({
					value: 'https://events.twilio.com/v1/Sinks/DG123%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
