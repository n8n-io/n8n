import type { IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { jenkinsApiRequest } from '../GenericFunctions';

describe('jenkinsApiRequest', () => {
	it('removes a trailing slash from the credential base URL', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			username: 'user',
			apiKey: 'key',
			baseUrl: 'https://jenkins.example.com/',
		});

		await jenkinsApiRequest.call(executeFunctions, 'GET', '/api/json');

		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({ uri: 'https://jenkins.example.com/api/json' }),
		);
	});
});
