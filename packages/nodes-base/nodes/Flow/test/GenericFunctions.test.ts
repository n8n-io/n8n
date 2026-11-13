import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { flowApiRequest } from '../GenericFunctions';

describe('flowApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ organizationId: 9, accessToken: 'fake-token' });
		context.helpers.request.mockResolvedValue({ task: {} });

		const taskId = '123/delete?x=1';
		await flowApiRequest.call(context, 'GET', requestPath`/tasks/${taskId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.getflow.com/v2/tasks/123%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
