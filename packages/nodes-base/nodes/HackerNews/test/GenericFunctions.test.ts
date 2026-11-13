import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { hackerNewsApiRequest } from '../GenericFunctions';

describe('hackerNewsApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.request.mockResolvedValue({});

		const username = 'pg/items/1?x=1';
		await hackerNewsApiRequest.call(context, 'GET', requestPath`users/${username}`, {});

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'http://hn.algolia.com/api/v1/users/pg%2Fitems%2F1%3Fx=1',
				}),
			}),
		);
	});
});
