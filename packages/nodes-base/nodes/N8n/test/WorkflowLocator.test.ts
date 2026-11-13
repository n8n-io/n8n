import { mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchWorkflows } from '../WorkflowLocator';

describe('searchWorkflows', () => {
	it('should request the workflows from the credentials base URL', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getCredentials.mockResolvedValue({
			apiKey: 'key123',
			baseUrl: 'https://test.app.n8n.cloud/api/v1/',
		});
		context.helpers.requestWithAuthentication.mockResolvedValue({
			data: [{ id: 7, name: 'Daily Report' }],
		});

		const result = await searchWorkflows.call(context);

		expect(result.results).toEqual([{ name: 'Daily Report (#7)', value: 7 }]);
		const [credentialType, options] = context.helpers.requestWithAuthentication.mock.calls[0];
		expect(credentialType).toBe('n8nApi');
		expect(String(options.uri)).toBe('https://test.app.n8n.cloud/api/v1/workflows');
	});
});
