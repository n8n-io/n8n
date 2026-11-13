import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { upleadApiRequest } from '../GenericFunctions';

describe('upleadApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		const id = '1234/delete?x=1';
		await upleadApiRequest.call(context, 'GET', requestPath`/person-search/${id}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.uplead.com/v2/person-search/1234%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
