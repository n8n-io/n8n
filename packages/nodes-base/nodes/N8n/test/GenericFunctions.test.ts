import { mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { apiRequest } from '../GenericFunctions';

describe('apiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getCredentials.mockResolvedValue({
			apiKey: 'key123',
			baseUrl: 'https://test.app.n8n.cloud/api/v1',
		});
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const workflowId = 'abc/def?x=1';
		await apiRequest.call(context, 'GET', requestPath`workflows/${workflowId}`, {});

		const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
		expect(String(options.uri)).toBe('https://test.app.n8n.cloud/api/v1/workflows/abc%2Fdef%3Fx=1');
	});
});
