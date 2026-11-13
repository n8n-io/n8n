import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { taigaApiRequest } from '../GenericFunctions';

describe('taigaApiRequest', () => {
	it('should encode path values and join them with the credentials URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			username: 'nathan',
			password: 'fake-password',
			environment: 'selfHosted',
			url: 'https://taiga.example.com',
		});
		context.helpers.request.mockResolvedValue({ auth_token: 'fake-token' });

		const epicId = '101/102?x=1';
		await taigaApiRequest.call(context, 'GET', requestPath`/epics/${epicId}`);

		expect(
			context.helpers.request.mock.calls.map(([options]) =>
				String((options as IRequestOptions).uri),
			),
		).toEqual([
			'https://taiga.example.com/api/v1/auth',
			'https://taiga.example.com/api/v1/epics/101%2F102%3Fx=1',
		]);
	});
});
