import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { msg91ApiRequest } from '../GenericFunctions';

describe('msg91ApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ authkey: 'fake-authkey' });
		context.helpers.request.mockResolvedValue('request-id');

		const script = 'sendhttp.php/x?y=1';
		await msg91ApiRequest.call(context, 'GET', requestPath`/${script}`, {});

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.msg91.com/api/sendhttp.php%2Fx%3Fy=1',
				}),
			}),
		);
	});
});
