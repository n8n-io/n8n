import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { raindropApiRequest } from '../GenericFunctions';

describe('raindropApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestOAuth2.mockResolvedValue({});

		const bookmarkId = '123456/delete?x=1';
		await raindropApiRequest.call(context, 'GET', requestPath`/raindrop/${bookmarkId}`, {}, {});

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'raindropOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://api.raindrop.io/rest/v1/raindrop/123456%2Fdelete%3Fx=1`,
			}),
			{ includeCredentialsOnRefreshOnBody: true },
		);
	});
});
