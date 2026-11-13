import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { twakeApiRequest } from '../GenericFunctions';

describe('twakeApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const id = 'abc/delete?x=1';
		await twakeApiRequest.call(context, 'POST', requestPath`/channel/${id}`, {});

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'twakeCloudApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://plugins.twake.app/plugins/n8n/channel/abc%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
