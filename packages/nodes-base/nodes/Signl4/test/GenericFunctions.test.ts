import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { SIGNL4ApiRequest } from '../GenericFunctions';

describe('SIGNL4ApiRequest', () => {
	it('should encode the team secret in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ teamSecret: 'a1b2/c3?x=1' });
		context.helpers.request.mockResolvedValue({ eventId: '1' });

		await SIGNL4ApiRequest.call(context, 'POST', '', {}, { formData: { message: 'Hi' } });

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://connect.signl4.com/webhook/a1b2%2Fc3%3Fx=1',
				}),
			}),
		);
	});

	it('should reject a team secret with a dot segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ teamSecret: 'a1b2/../c3?x=1' });

		await expect(
			SIGNL4ApiRequest.call(context, 'POST', '', {}, { formData: { message: 'Hi' } }),
		).rejects.toThrow('Invalid identifier');
		expect(context.helpers.request).not.toHaveBeenCalled();
	});
});
