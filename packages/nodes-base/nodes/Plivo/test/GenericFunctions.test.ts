import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { plivoApiRequest } from '../GenericFunctions';

describe('plivoApiRequest', () => {
	it('should encode an Auth ID that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ authId: 'MA1/MA2', authToken: 'token' });
		context.helpers.request.mockResolvedValue({});

		await plivoApiRequest.call(context, 'POST', requestPath`/Message`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: requestUrl`https://api.plivo.com/v1/Account/MA1%2FMA2/Message/`,
			}),
		);
	});

	it('should reject an Auth ID with a dot segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ authId: 'MA1/../MA2', authToken: 'token' });
		context.helpers.request.mockResolvedValue({});

		await expect(plivoApiRequest.call(context, 'POST', requestPath`/Message`)).rejects.toThrow(
			'Invalid identifier',
		);

		expect(context.helpers.request).not.toHaveBeenCalled();
	});
});
