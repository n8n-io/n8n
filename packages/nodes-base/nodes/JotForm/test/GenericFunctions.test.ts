import { mockDeep } from 'jest-mock-extended';
import type { IHookFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { jotformApiRequest } from '../GenericFunctions';

describe('jotformApiRequest', () => {
	it('should encode path values and join them with the API domain', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getCredentials.mockResolvedValue({
			apiKey: 'fake-api-key',
			apiDomain: 'hipaa-api.jotform.com',
		});
		context.helpers.request.mockResolvedValue({});

		const formId = '251234567890123/webhooks?x=1';
		await jotformApiRequest.call(context, 'GET', requestPath`/form/${formId}/questions`);

		const [options] = context.helpers.request.mock.calls[0] as [IRequestOptions];
		expect(String(options.uri)).toBe(
			'https://hipaa-api.jotform.com/form/251234567890123%2Fwebhooks%3Fx=1/questions',
		);
	});
});
