import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { searchWorkflows } from '../../shared/WorkflowLocator';

describe('n8n workflow list search', () => {
	it.each([
		{
			baseUrl: 'http://localhost:5678/api/v1',
			expectedUrl: 'http://localhost:5678/api/v1/workflows',
		},
		{
			baseUrl: 'http://localhost:5678//api/v1',
			expectedUrl: 'http://localhost:5678/api/v1/workflows',
		},
		{
			baseUrl: 'http://localhost:5678/api/v1/',
			expectedUrl: 'http://localhost:5678/api/v1/workflows',
		},
		{
			baseUrl: 'http://localhost:5678/api/v1///',
			expectedUrl: 'http://localhost:5678/api/v1/workflows',
		},
		{
			baseUrl: 'http://localhost:5678//api//v1///',
			expectedUrl: 'http://localhost:5678/api/v1/workflows',
		},
		{
			baseUrl: 'https://example.com/n8n//api/v1///',
			expectedUrl: 'https://example.com/n8n/api/v1/workflows',
		},
		{
			baseUrl: 'http://[::1]:5678//api/v1///',
			expectedUrl: 'http://[::1]:5678/api/v1/workflows',
		},
		{
			baseUrl: 'https://example.com/n8n%2Ftest//api/v1///',
			expectedUrl: 'https://example.com/n8n%2Ftest/api/v1/workflows',
		},
	])('should request workflows from $baseUrl', async ({ baseUrl, expectedUrl }) => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'test-api-key', baseUrl });
		context.helpers.requestWithAuthentication.mockResolvedValue({
			data: [{ id: 1, name: 'Example Workflow' }],
		});

		const result = await searchWorkflows.call(context);

		expect(context.getCredentials).toHaveBeenCalledWith('n8nApi');
		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledExactlyOnceWith(
			'n8nApi',
			expect.objectContaining({ method: 'GET', uri: expectedUrl }),
		);
		expect(result.results).toEqual([{ name: 'Example Workflow (#1)', value: 1 }]);
	});
});
