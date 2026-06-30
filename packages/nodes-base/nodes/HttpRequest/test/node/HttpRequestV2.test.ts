import type { IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';

import { HttpRequestV2 } from '../../V2/HttpRequestV2.node';
import type { Mock } from 'vitest';

describe('HttpRequestV2', () => {
	let node: HttpRequestV2;
	let executeFunctions: IExecuteFunctions;

	const baseUrl = 'http://example.com';
	const options = {
		redirect: '',
		batching: { batch: { batchSize: 1, batchInterval: 1 } },
		proxy: '',
		timeout: '',
		allowUnauthorizedCerts: '',
		queryParameterArrays: '',
		response: '',
		lowercaseHeaders: '',
	};

	beforeEach(() => {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'HTTP Request',
			name: 'httpRequest',
			description: 'Makes an HTTP request and returns the response data',
			group: [],
		};
		node = new HttpRequestV2(baseDescription);
		executeFunctions = {
			getInputData: vi.fn(),
			getNodeParameter: vi.fn(),
			getNode: vi.fn(() => {
				return {
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 2,
				};
			}),
			getCredentials: vi.fn(),
			helpers: {
				request: vi.fn(),
				requestOAuth1: vi.fn(
					async () =>
						await Promise.resolve({
							success: true,
						}),
				),
				requestOAuth2: vi.fn(
					async () =>
						await Promise.resolve({
							success: true,
						}),
				),
				requestWithAuthentication: vi.fn(),
				requestWithAuthenticationPaginated: vi.fn(),
				assertBinaryData: vi.fn(),
				getBinaryStream: vi.fn(),
				getBinaryMetadata: vi.fn(),
				binaryToString: vi.fn((buffer: Buffer) => {
					return buffer.toString();
				}),
				prepareBinaryData: vi.fn(),
			},
			getContext: vi.fn(),
			sendMessageToUI: vi.fn(),
			continueOnFail: vi.fn(),
			getMode: vi.fn(),
		} as unknown as IExecuteFunctions;
	});

	describe('Authentication Handling', () => {
		const authenticationTypes = [
			{
				genericCredentialType: 'httpBasicAuth',
				credentials: { user: 'username', password: 'password' },
				authField: 'auth',
				authValue: { user: 'username', pass: 'password' },
			},
			{
				genericCredentialType: 'httpBearerAuth',
				credentials: { token: 'bearerToken123' },
				authField: 'headers',
				authValue: { Authorization: 'Bearer bearerToken123' },
			},
			{
				genericCredentialType: 'httpDigestAuth',
				credentials: { user: 'username', password: 'password' },
				authField: 'auth',
				authValue: { user: 'username', pass: 'password', sendImmediately: false },
			},
			{
				genericCredentialType: 'httpHeaderAuth',
				credentials: { name: 'Authorization', value: 'Bearer token' },
				authField: 'headers',
				authValue: { Authorization: 'Bearer token' },
			},
			{
				genericCredentialType: 'httpQueryAuth',
				credentials: { name: 'Token', value: 'secretToken' },
				authField: 'qs',
				authValue: { Token: 'secretToken' },
			},
			{
				genericCredentialType: 'oAuth1Api',
				credentials: { oauth_token: 'token', oauth_token_secret: 'secret' },
				authField: 'oauth',
				authValue: { oauth_token: 'token', oauth_token_secret: 'secret' },
			},
			{
				genericCredentialType: 'oAuth2Api',
				credentials: { access_token: 'accessToken' },
				authField: 'auth',
				authValue: { bearer: 'accessToken' },
			},
		];

		it.each(authenticationTypes)(
			'should handle $genericCredentialType authentication',
			async ({ genericCredentialType, credentials, authField, authValue }) => {
				(executeFunctions.getInputData as Mock).mockReturnValue([{ json: {} }]);
				(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
					switch (paramName) {
						case 'method':
							return 'GET';
						case 'url':
							return baseUrl;
						case 'authentication':
							return 'genericCredentialType';
						case 'genericAuthType':
							return genericCredentialType;
						case 'options':
							return options;
						case 'bodyParametersUi':
						case 'headerParametersUi':
						case 'queryParametersUi':
							return { parameter: [] };
						default:
							return undefined;
					}
				});

				(executeFunctions.getCredentials as Mock).mockResolvedValue(credentials);
				const response = {
					success: true,
				};
				(executeFunctions.helpers.request as Mock).mockResolvedValue(response);

				const result = await node.execute.call(executeFunctions);
				expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
				if (genericCredentialType === 'oAuth1Api') {
					expect(executeFunctions.helpers.requestOAuth1).toHaveBeenCalled();
				} else if (genericCredentialType === 'oAuth2Api') {
					expect(executeFunctions.helpers.requestOAuth2).toHaveBeenCalled();
				} else {
					expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
						expect.objectContaining({
							[authField]: expect.objectContaining(authValue),
						}),
					);
				}
			},
		);
	});

	describe('URL Parameter Validation', () => {
		it('should throw error when URL is only whitespace', async () => {
			(executeFunctions.getInputData as Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'responseFormat':
						return 'json';
					case 'requestMethod':
						return 'GET';
					case 'url':
						return '   ';
					case 'authentication':
						return 'none';
					case 'jsonParameters':
						return false;
					case 'options':
						return options;
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'URL parameter cannot be empty',
			);
		});

		it('should trim whitespace from valid URL', async () => {
			(executeFunctions.getInputData as Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'responseFormat':
						return 'json';
					case 'requestMethod':
						return 'GET';
					case 'url':
						return '  http://example.com  ';
					case 'authentication':
						return 'none';
					case 'jsonParameters':
						return false;
					case 'options':
						return options;
					case 'bodyParametersUi':
					case 'headerParametersUi':
					case 'queryParametersUi':
						return { parameter: [] };
					default:
						return undefined;
				}
			});
			const response = {
				success: true,
			};
			(executeFunctions.helpers.request as Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);
			expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(1);
			const requestArgs = (executeFunctions.helpers.request as Mock).mock.calls[0][0];
			expect(requestArgs.uri ?? requestArgs.url).toBe('http://example.com');
		});

		it.each([
			{ url: undefined, expectedType: 'undefined' },
			{ url: null, expectedType: 'null' },
			{ url: 42, expectedType: 'number' },
		])('should throw error when URL is $expectedType', async ({ url, expectedType }) => {
			(executeFunctions.getInputData as Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'responseFormat':
						return 'json';
					case 'requestMethod':
						return 'GET';
					case 'url':
						return url;
					case 'authentication':
						return 'none';
					case 'jsonParameters':
						return false;
					case 'options':
						return options;
					case 'bodyParametersUi':
					case 'headerParametersUi':
					case 'queryParametersUi':
						return { parameter: [] };
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				`URL parameter must be a string, got ${expectedType}`,
			);
		});
	});
});
