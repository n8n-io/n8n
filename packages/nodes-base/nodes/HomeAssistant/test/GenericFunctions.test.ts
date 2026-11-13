import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { homeAssistantApiRequest } from '../GenericFunctions';

describe('homeAssistantApiRequest', () => {
	it('should encode path values and join them with the credentials host and port', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			host: '192.168.1.10',
			port: 8123,
			ssl: true,
			accessToken: 'fake-access-token',
		});
		context.helpers.request.mockResolvedValue({});

		const entityId = 'light.kitchen/config?x=1';
		await homeAssistantApiRequest.call(context, 'GET', requestPath`/states/${entityId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://192.168.1.10:8123/api/states/light.kitchen%2Fconfig%3Fx=1',
				}),
			}),
		);
	});
});
