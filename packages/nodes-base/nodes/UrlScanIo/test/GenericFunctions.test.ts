import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { urlScanIoApiRequest } from '../GenericFunctions';

describe('urlScanIoApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const id = '1234/delete?x=1';
		await urlScanIoApiRequest.call(context, 'GET', requestPath`/result/${id}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'urlScanIoApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://urlscan.io/api/v1/result/1234%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
