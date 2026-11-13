import { mockDeep } from 'vitest-mock-extended';
import type { IHookFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { formIoApiRequest } from '../GenericFunctions';

describe('formIoApiRequest', () => {
	it('should encode path values and join them with the credentials domain', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getCredentials.mockResolvedValue({ domain: 'https://forms.example.com/' });
		context.helpers.httpRequestWithAuthentication.mockResolvedValue([]);

		const projectId = 'p1/form?x=1';
		await formIoApiRequest.call(context, 'GET', requestPath`/project/${projectId}/form`);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'formIoApi',
			expect.objectContaining({
				url: expect.objectContaining({
					value: 'https://forms.example.com/project/p1%2Fform%3Fx=1/form',
				}),
			}),
		);
	});
});
