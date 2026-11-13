import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { vonageApiRequest } from '../GenericFunctions';

describe('vonageApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'key', apiSecret: 'secret' });
		context.helpers.request.mockResolvedValue({});

		const value = 'json/account?x=1';
		await vonageApiRequest.call(context, 'POST', requestPath`/sms/${value}`, {});

		const options = context.helpers.request.mock.calls[0][0] as IRequestOptions;
		expect(String(options.uri)).toBe('https://rest.nexmo.com/sms/json%2Faccount%3Fx=1');
	});
});
