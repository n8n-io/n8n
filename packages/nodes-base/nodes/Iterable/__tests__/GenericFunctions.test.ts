import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { iterableApiRequest } from '../GenericFunctions';

describe('iterableApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			apiKey: 'fake-api-key',
			region: 'https://api.iterable.com',
		});
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({});

		await iterableApiRequest.call(
			context,
			'DELETE',
			requestPath`/users/byUserId/${'usr-1001/lists'}`,
		);

		expect(String(context.helpers.httpRequestWithAuthentication.mock.calls[0][1].url)).toBe(
			'https://api.iterable.com/api/users/byUserId/usr-1001%2Flists',
		);
	});
});
