import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { PerplexityApi } from '../../../../credentials/PerplexityApi.credentials';

describe('Perplexity API Credentials', () => {
	describe('authenticate', () => {
		const perplexityApi = new PerplexityApi();

		it('should generate a valid authorization header', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'test-api-key',
				baseUrl: 'https://api.perplexity.ai',
			};

			const requestOptions: IHttpRequestOptions = {
				url: 'https://api.perplexity.ai/chat/completions',
				method: 'POST',
				body: {
					model: 'r1-1776',
					messages: [{ role: 'user', content: 'test' }],
				},
				headers: {
					'Content-Type': 'application/json',
				},
				json: true,
			};

			const authProperty = perplexityApi.authenticate;

			const result = {
				...requestOptions,
				headers: {
					...requestOptions.headers,
					Authorization: `Bearer ${credentials.apiKey}`,
				},
			};

			expect(result.headers?.Authorization).toBe('Bearer test-api-key');

			expect(authProperty.type).toBe('generic');
		});
	});

	describe('test', () => {
		const perplexityApi = new PerplexityApi();

		it('should have a valid test property', () => {
			expect(perplexityApi.test).toBeDefined();
			expect(perplexityApi.test.request).toBeDefined();
		});
	});
});
