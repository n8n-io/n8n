import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { pushcutApiRequest } from '../GenericFunctions';

describe('pushcutApiRequest', () => {
	it('should encode path values as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		const notificationName = 'Door Bell/devices?x=1';
		await pushcutApiRequest.call(context, 'POST', requestPath`/notifications/${notificationName}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.pushcut.io/v1/notifications/Door%20Bell%2Fdevices%3Fx=1',
				}),
			}),
		);
	});
});
