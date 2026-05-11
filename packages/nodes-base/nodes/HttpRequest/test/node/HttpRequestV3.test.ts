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

	describe('Binary Data Resource ID Validation', () => {
		const setupBinaryBodyParams = (binaryDataId: unknown) => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'POST';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'none';
					case 'sendBody':
						return true;
					case 'contentType':
						return 'binaryData';
					case 'specifyBody':
						return '';
					case 'bodyParameters.parameters':
						return [];
					case 'inputDataFieldName':
						return 'data';
					case 'options':
						return options;
					default:
						return undefined;
				}
			});
			(executeFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue({
				id: binaryDataId,
				mimeType: 'image/png',
				fileName: 'test.png',
			});
		};

		it('should throw NodeOperationError for non-string resource ID in binaryData body', async () => {
			setupBinaryBodyParams(12345);
			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'Invalid resource ID for binary data',
			);
		});

		it('should throw NodeOperationError for object resource ID in binaryData body', async () => {
			setupBinaryBodyParams({ nested: 'object' });
			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'Invalid resource ID for binary data',
			);
		});

		it('should succeed with valid string resource ID in binaryData body', async () => {
			setupBinaryBodyParams('valid-resource-id');
			(executeFunctions.helpers.getBinaryStream as jest.Mock).mockResolvedValue(
				Buffer.from('file-content'),
			);
			(executeFunctions.helpers.getBinaryMetadata as jest.Mock).mockResolvedValue({
				fileSize: 12,
				mimeType: 'image/png',
			});
			const response = {
				headers: { 'content-type': 'application/json' },
				body: Buffer.from(JSON.stringify({ success: true })),
			};
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);
			expect(executeFunctions.helpers.getBinaryStream).toHaveBeenCalledWith('valid-resource-id');
			expect(result).toBeDefined();
		});

		it('should throw NodeOperationError for non-string resource ID in formBinaryData parameter', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'POST';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'none';
					case 'sendBody':
						return true;
					case 'contentType':
						return 'multipart-form-data';
					case 'specifyBody':
						return 'keypair';
					case 'bodyParameters.parameters':
						return [{ parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'data' }];
					case 'options':
						return options;
					default:
						return undefined;
				}
			});
			(executeFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue({
				id: { invalid: 'object' },
				mimeType: 'image/png',
			});

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'Invalid resource ID for binary data',
			);
		});

		it('should succeed with valid string resource ID in formBinaryData parameter', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'POST';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'none';
					case 'sendBody':
						return true;
					case 'contentType':
						return 'multipart-form-data';
					case 'specifyBody':
						return 'keypair';
					case 'bodyParameters.parameters':
						return [{ parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'data' }];
					case 'options':
						return options;
					default:
						return undefined;
				}
			});
			(executeFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue({
				id: 'valid-stream-id',
				mimeType: 'application/pdf',
				fileName: 'document.pdf',
			});
			(executeFunctions.helpers.getBinaryStream as jest.Mock).mockResolvedValue(
				Buffer.from('pdf-content'),
			);
			(executeFunctions.helpers.getBinaryMetadata as jest.Mock).mockResolvedValue({
				fileSize: 11,
				mimeType: 'application/pdf',
			});
			const response = {
				headers: { 'content-type': 'application/json' },
				body: Buffer.from(JSON.stringify({ success: true })),
			};
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);
			expect(executeFunctions.helpers.getBinaryStream).toHaveBeenCalledWith('valid-stream-id');
			expect(result).toBeDefined();
		});
	});

	describe('Header Parameter Filtering', () => {
		it('should filter null, undefined, and nameless header entries', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'none';
					case 'sendHeaders':
						return true;
					case 'specifyHeaders':
						return 'keypair';
					case 'headerParameters.parameters':
						return [
							{ name: 'X-Custom-Header', value: 'custom-value' },
							null,
							undefined,
							{ name: '', value: 'empty-name-entry' },
						];
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
			expect(result).toBeDefined();
			expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({ 'X-Custom-Header': 'custom-value' }),
				}),
			);
		});

		it('should include all valid headers and exclude invalid ones', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'method':
						return 'GET';
					case 'url':
						return baseUrl;
					case 'authentication':
						return 'none';
					case 'sendHeaders':
						return true;
					case 'specifyHeaders':
						return 'keypair';
					case 'headerParameters.parameters':
						return [
							{ name: 'X-First', value: 'first-value' },
							null,
							{ name: 'X-Second', value: 'second-value' },
							{ name: '', value: 'skipped' },
						];
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

			await node.execute.call(executeFunctions);
			expect(executeFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({
						'X-First': 'first-value',
						'X-Second': 'second-value',
					}),
				}),
			);
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
