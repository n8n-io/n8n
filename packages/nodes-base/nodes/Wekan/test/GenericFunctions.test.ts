import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { apiRequest } from '../GenericFunctions';

describe('apiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ url: 'https://wekan.example.com/' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const boardId = 'Kd3RgEJ6qXzM7ZnBQ/users?x=1';
		await apiRequest.call(context, 'GET', requestPath`boards/${boardId}`, {});

		const options = context.helpers.requestWithAuthentication.mock.calls[0][1] as IRequestOptions;
		expect(String(options.uri)).toBe(
			'https://wekan.example.com/api/boards/Kd3RgEJ6qXzM7ZnBQ%2Fusers%3Fx=1',
		);
	});
});
