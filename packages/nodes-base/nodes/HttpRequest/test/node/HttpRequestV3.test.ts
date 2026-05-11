import type { IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';

import { HttpRequestV3 } from '../../V3/HttpRequestV3.node';

describe('HttpRequestV3', () => {
	let node: HttpRequestV3;
	let executeFunctions: IExecuteFunctions;

	const baseUrl = 'http://example.com';
	const options = {
		redirect: '',
		batching: { batch: { batchSize: 1, batchInterval: 1 } },
		proxy: '',
		timeout: '',
		allowUnauthoridCerts: '',
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
		node = new HttpRequestV3(baseDescription);
		executeFunctions = {
			getInputData: jest.fn(),
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => {
				return {
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 3,
				};
			}),
			getCredentials: jest.fn(),
			helpers: {
				request: jest.fn(),
				requestOAuth1: jest.fn(
					async () =>
						await Promise.resolve({
							statusCode: 200,
							headers: { 'content-type': 'application/json' },
							body: Buffer.from(JSON.stringify({ success: true })),
						}),
				),
				requestOAuth2: jest.fn(
					async () =>
						await Promise.resolve({
							statusCode: 200,
							headers: { 'content-type': 'application/json' },
							body: Buffer.from(JSON.stringify({ success: true })),
						}),
				),
				requestWithAuthentication: jest.fn(),
				requestWithAuthenticationPaginated: jest.fn(),
				assertBinaryData: jest.fn(),
				getBinaryStream: jest.fn(),
				getBinaryMetadata: jest.fn(),
				binaryToString: jest.fn((buffer: Buffer) => {
					return buffer.toString();
				}),
				prepareBinaryData: jest.fn(),
			},
			getContext: jest.fn(),
			sendMessageToUI: jest.fn(),
			continueOnFail: jest.fn(),
			getMode: jest.fn(),
		} as unknown as IExecuteFunctions;
	});

	it('should make a GET request', async () => {
		(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
		(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'method':
					return 'GET';
				case 'url':
					return baseUrl;
				case 'authentication':
					return 'none';
				case 'options':
					return options;
				default:
					return undefined;
			}
		});
		const response = {
			headers: { 'content-type': 'application/json' },
			body: Buffer.from(JSON.stringify({ success: true })),
		};

		(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

		const result = await node.execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
	});

	it('should handle authentication', async () => {
		(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
		(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'method':
					return 'GET';
				case 'url':
					return baseUrl;
				case 'authentication':
					return 'genericCredentialType';
				case 'genericAuthType':
					return 'httpBasicAuth';
				case 'options':
					return options;
				default:
					return undefined;
			}
		});
		(executeFunctions.getCredentials as jest.Mock).mockResolvedValue({
			user: 'username',
			password: 'password',
		});
		const response = {
			headers: { 'content-type': 'application/json' },
			body: Buffer.from(JSON.stringify({ success: true })),
		};
		(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

		const result = await node.execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
		expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				auth: {
					user: 'username',
					pass: 'password',
				},
			}),
		);
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
				(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
				(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
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
						default:
							return undefined;
					}
				});

				(executeFunctions.getCredentials as jest.Mock).mockResolvedValue(credentials);
				const response = {
					headers: { 'content-type': 'application/json' },
					body: Buffer.from(JSON.stringify({ success: true })),
				};
				(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

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
		it('should throw error when URL is undefined', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return undefined;
					case 'authentication':
						return 'none';
					case 'options':
						return options;
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'URL parameter must be a string, got undefined',
			);
		});

		it('should throw error when URL is null', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return null;
					case 'authentication':
						return 'none';
					case 'options':
						return options;
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'URL parameter must be a string, got null',
			);
		});

		it('should throw error when URL is a number', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return 42;
					case 'authentication':
						return 'none';
					case 'options':
						return options;
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'URL parameter must be a string, got number',
			);
		});
	});

	describe('JSON Parameter Validation', () => {
		it.each([
			{
				field: 'body',
				params: {
					sendBody: true,
					specifyBody: 'json',
					jsonBody: '{"valid": true}',
					'bodyParameters.parameters': [],
				},
			},
			{
				field: 'query',
				params: {
					sendQuery: true,
					specifyQuery: 'json',
					jsonQuery: '{"key": "value"}',
					'queryParameters.parameters': [],
				},
			},
			{
				field: 'headers',
				params: {
					sendHeaders: true,
					specifyHeaders: 'json',
					jsonHeaders: '{"X-Custom": "header"}',
					'headerParameters.parameters': [],
				},
			},
		])('should accept valid JSON in $field parameter', async ({ params }) => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'POST';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'none';
					case 'options':
						return options;
					default:
						return params[paramName as keyof typeof params] ?? undefined;
				}
			});
			const response = {
				headers: { 'content-type': 'application/json' },
				body: Buffer.from(JSON.stringify({ success: true })),
			};
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);

			expect(result).toBeDefined();
		});

		it.each([
			{
				field: 'body',
				fieldName: 'JSON Body',
				params: {
					sendBody: true,
					specifyBody: 'json',
					jsonBody: '{"invalid: json}',
					'bodyParameters.parameters': [],
				},
			},
			{
				field: 'query',
				fieldName: 'JSON Query Parameters',
				params: {
					sendQuery: true,
					specifyQuery: 'json',
					jsonQuery: '{not valid}',
					'queryParameters.parameters': [],
				},
			},
			{
				field: 'headers',
				fieldName: 'JSON Headers',
				params: {
					sendHeaders: true,
					specifyHeaders: 'json',
					jsonHeaders: 'not json at all',
					'headerParameters.parameters': [],
				},
			},
		])(
			'should throw descriptive error for invalid JSON in $field parameter',
			async ({ fieldName, params }) => {
				(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
				(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
					switch (paramName) {
						case 'method':
							return 'POST';
						case 'url':
							return baseUrl;
						case 'authentication':
							return 'none';
						case 'options':
							return options;
						default:
							return params[paramName as keyof typeof params] ?? undefined;
					}
				});
				const response = {
					headers: { 'content-type': 'application/json' },
					body: Buffer.from(JSON.stringify({ success: true })),
				};
				(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

				await expect(node.execute.call(executeFunctions)).rejects.toThrow(
					`The value in the "${fieldName}" field is not valid JSON`,
				);
			},
		);
	});

	describe('Response parsing', () => {
		it('should return empty object for autodetect JSON response with empty body', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'none';
					case 'options':
						return options;
					default:
						return undefined;
				}
			});
			const response = {
				headers: { 'content-type': 'application/json', 'content-length': '0' },
				body: Buffer.from(''),
			};
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);

			expect(result).toEqual([[{ json: {}, pairedItem: { item: 0 } }]]);
		});

		it('should return empty object for JSON response format with empty body', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'none';
					case 'options':
						return {
							...options,
							response: {
								response: {
									responseFormat: 'json',
								},
							},
						};
					case 'options.response.response.responseFormat':
						return 'json';
					default:
						return undefined;
				}
			});
			const response = {
				headers: { 'content-type': 'application/json', 'content-length': '0' },
				body: '',
			};
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);

			expect(result).toEqual([[{ json: {}, pairedItem: { item: 0 } }]]);
		});
	});

	describe('Cross-Origin Redirects', () => {
		it('should pass sendCredentialsOnCrossOriginRedirect = true to the request by default for node versions < 4.4', async () => {
			(executeFunctions.getNode as jest.Mock).mockReturnValue({
				typeVersion: 4.3,
			});
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'genericCredentialType';
					case 'genericAuthType':
						return 'httpBasicAuth';
					case 'options':
						return options;
					default:
						return undefined;
				}
			});
			(executeFunctions.getCredentials as jest.Mock).mockResolvedValue({
				user: 'username',
				password: 'password',
			});
			const response = {
				headers: { 'content-type': 'application/json' },
				body: Buffer.from(JSON.stringify({ success: true })),
			};
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
			expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					sendCredentialsOnCrossOriginRedirect: true,
				}),
			);
		});

		it('should pass sendCredentialsOnCrossOriginRedirect = false to the request by default for node versions >= 4.4', async () => {
			(executeFunctions.getNode as jest.Mock).mockReturnValue({
				typeVersion: 4.4,
			});
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'genericCredentialType';
					case 'genericAuthType':
						return 'httpBasicAuth';
					case 'options':
						return options;
					default:
						return undefined;
				}
			});
			(executeFunctions.getCredentials as jest.Mock).mockResolvedValue({
				user: 'username',
				password: 'password',
			});
			const response = {
				headers: { 'content-type': 'application/json' },
				body: Buffer.from(JSON.stringify({ success: true })),
			};
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
			expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					sendCredentialsOnCrossOriginRedirect: false,
				}),
			);
		});

		it('should use the sendCredentialsOnCrossOriginRedirect parameter to the request if provided', async () => {
			(executeFunctions.getNode as jest.Mock).mockReturnValue({
				typeVersion: 4.4,
			});
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'genericCredentialType';
					case 'genericAuthType':
						return 'httpBasicAuth';
					case 'options':
						return { ...options, sendCredentialsOnCrossOriginRedirect: true };
					default:
						return undefined;
				}
			});
			(executeFunctions.getCredentials as jest.Mock).mockResolvedValue({
				user: 'username',
				password: 'password',
			});
			const response = {
				headers: { 'content-type': 'application/json' },
				body: Buffer.from(JSON.stringify({ success: true })),
			};
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
			expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					sendCredentialsOnCrossOriginRedirect: true,
				}),
			);
		});
	});
});
