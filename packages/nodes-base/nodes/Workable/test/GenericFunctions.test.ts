import type { IHookFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { workableApiRequest } from '../GenericFunctions';

describe('workableApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getCredentials.mockResolvedValue({ accessToken: 'token', subdomain: 'acme' });
		context.helpers.request.mockResolvedValue({});

		const webhookId = '5f7c1a2b/jobs?x=1';
		await workableApiRequest.call(context, 'DELETE', requestPath`/subscriptions/${webhookId}`);

		const options = context.helpers.request.mock.calls[0][0] as IRequestOptions;
		expect(String(options.uri)).toBe(
			'https://acme.workable.com/spi/v3/subscriptions/5f7c1a2b%2Fjobs%3Fx=1',
		);
	});
});
