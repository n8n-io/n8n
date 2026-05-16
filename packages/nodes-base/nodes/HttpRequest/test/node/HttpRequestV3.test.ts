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

	describe('Pagination parameter validation', () => {
		it('should keep valid pagination parameters and ignore invalid parameter names', async () => {
			const paginationTestOptions = {
				...options,
				response: {
					response: {
						neverError: false,
						responseFormat: 'json',
						fullResponse: false,
						outputPropertyName: 'data',
					},
				},
			};
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, defaultValue: unknown) => {
					switch (paramName) {
						case 'method':
							return 'GET';
						case 'url':
							return baseUrl;
						case 'authentication':
							return 'none';
						case 'options':
							return paginationTestOptions;
						case 'options.pagination.pagination':
							return {
								paginationMode: 'updateAParameterInEachRequest',
								parameters: {
									parameters: [
										{
											type: 'qs',
											// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
											name: 'page',
											value: '1',
										},
										{
											type: 'qs',
											name: 'constructor',
											value: 'ignored',
										},
									],
								},
								paginationCompleteWhen: 'responseIsEmpty',
								statusCodesWhenComplete: '',
								completeExpression: '',
								limitPagesFetched: false,
								maxRequests: 10,
								requestInterval: 0,
							};
						case 'options.response.response.responseFormat':
							return 'json';
						default:
							return defaultValue;
					}
				},
			);
			(executeFunctions.helpers.requestWithAuthenticationPaginated as jest.Mock).mockResolvedValue([
				{
					headers: { 'content-type': 'application/json' },
					body: { success: true },
					statusCode: 200,
				},
			]);

			const result = await node.execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
			expect(executeFunctions.helpers.requestWithAuthenticationPaginated).toHaveBeenCalledTimes(1);
			const paginationData = (
				executeFunctions.helpers.requestWithAuthenticationPaginated as jest.Mock
			).mock.calls[0][2] as {
				request: {
					qs: Record<string, unknown>;
				};
			};
			expect(paginationData.request.qs).toEqual({ page: '1' });
			expect(Object.prototype.hasOwnProperty.call(paginationData.request.qs, 'constructor')).toBe(
				false,
			);
		});

		it('should reject invalid pagination parameter type values', async () => {
			const paginationTestOptions = {
				...options,
				response: {
					response: {
						neverError: false,
						responseFormat: 'json',
						fullResponse: false,
						outputPropertyName: 'data',
					},
				},
			};

			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.helpers.requestWithAuthenticationPaginated as jest.Mock).mockResolvedValue([
				{
					headers: { 'content-type': 'application/json' },
					body: { success: true },
					statusCode: 200,
				},
			]);
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				headers: { 'content-type': 'application/json' },
				body: Buffer.from(JSON.stringify({ success: true })),
			});

			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, defaultValue: unknown) => {
					switch (paramName) {
						case 'method':
							return 'GET';
						case 'url':
							return baseUrl;
						case 'authentication':
							return 'none';
						case 'options':
							return paginationTestOptions;
						case 'options.pagination.pagination':
							return {
								paginationMode: 'updateAParameterInEachRequest',
								parameters: {
									parameters: [
										{
											type: '__proto__' as unknown as 'qs',
											// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
											name: 'page',
											value: '1',
										},
									],
								},
								paginationCompleteWhen: 'responseIsEmpty',
								statusCodesWhenComplete: '',
								completeExpression: '',
								limitPagesFetched: false,
								maxRequests: 10,
								requestInterval: 0,
							};
						default:
							return defaultValue;
					}
				},
			);

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'Parameter type must be one of: body, headers, qs for parameter [1] in pagination settings',
			);
			expect(executeFunctions.helpers.requestWithAuthenticationPaginated).not.toHaveBeenCalled();
		});
	});

	describe('Parallel item scoping fixes', () => {
		// Build the nested options object the node reads via getNodeParameter('options', itemIndex)
		const makeOptions = (item: Record<string, unknown>) => ({
			batching: { batch: { batchSize: 1, batchInterval: 0 } },
			redirect: '',
			proxy: '',
			timeout: '',
			allowUnauthorizedCerts: false,
			queryParameterArrays: '',
			lowercaseHeaders: true,
			response: {
				response: {
					responseFormat: item.responseFormat ?? 'autodetect',
					outputPropertyName: item.outputPropertyName ?? 'data',
					fullResponse: item.fullResponse ?? false,
					neverError: item.neverError ?? false,
				},
			},
		});

		// Configures getInputData and getNodeParameter for multiple items.
		// Per-item values (url, responseFormat, outputPropertyName, fullResponse, neverError)
		// are stored in each item's json and returned based on itemIndex.
		const setupItems = (items: Array<{ json: Record<string, unknown> }>) => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue(items);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, itemIndex: number, fallback: unknown) => {
					const item = items[itemIndex]?.json ?? {};
					switch (paramName) {
						case 'url':
							return item.url;
						case 'method':
							return 'GET';
						case 'authentication':
							return 'none';
						case 'options':
							return makeOptions(item);
						case 'options.response.response.responseFormat':
							return item.responseFormat ?? fallback;
						case 'options.response.response.fullResponse':
							return item.fullResponse ?? fallback;
						case 'options.response.response.neverError':
							return item.neverError ?? fallback;
						case 'options.response.response.outputPropertyName':
							return item.outputPropertyName ?? fallback;
						default:
							return fallback;
					}
				},
			);
		};

		// Mimics prepareBinaryData: derives fileExtension from mimeType but does NOT set fileName.
		// This lets setFilename() derive the name from requestOptions.uri or responseFileName.
		const mimeToExt: Record<string, string> = {
			'image/png': 'png',
			'text/plain': 'txt',
			'application/pdf': 'pdf',
		};

		beforeEach(() => {
			(executeFunctions.helpers.prepareBinaryData as jest.Mock).mockImplementation(
				async (buffer: Buffer, _filePath?: string, mimeType?: string) => {
					const fileExtension = mimeType ? mimeToExt[mimeType] : undefined;
					const bin: Record<string, unknown> = { data: buffer.toString('base64'), mimeType };
					if (fileExtension) bin.fileExtension = fileExtension;
					return bin;
				},
			);
		});

		it('should derive filename from the original request URI when no Content-Disposition is present', async () => {
			setupItems([
				{
					json: {
						url: 'http://example.com/file1.png',
						responseFormat: 'file',
						outputPropertyName: 'data',
					},
				},
				{
					json: {
						url: 'http://example.com/file2.png',
						responseFormat: 'file',
						outputPropertyName: 'data',
					},
				},
			]);
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': 'image/png' },
				body: Buffer.from('img'),
			});

			const result = await node.execute.call(executeFunctions);
			// setFilename: fileExtension='png', uri ends with 'png' → uri.split('/').pop()
			expect(result[0][0].binary?.data.fileName).toBe('file1.png');
			expect(result[0][1].binary?.data.fileName).toBe('file2.png');
		});

		it('should use per-item original request URI (not redirect target) as filename fallback', async () => {
			setupItems([
				{
					json: {
						url: 'http://example.com/fileA.txt',
						responseFormat: 'file',
						outputPropertyName: 'data',
					},
				},
				{
					json: {
						url: 'http://example.com/fileB.txt',
						responseFormat: 'file',
						outputPropertyName: 'data',
					},
				},
			]);
			// Both redirect to same URL; requests[itemIndex].options.uri stays as the original
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': 'text/plain' },
				body: Buffer.from('txt'),
			});

			const result = await node.execute.call(executeFunctions);
			expect(result[0][0].binary?.data.fileName).toBe('fileA.txt');
			expect(result[0][1].binary?.data.fileName).toBe('fileB.txt');
		});

		it('should use per-item outputPropertyName as the binary data key', async () => {
			setupItems([
				{
					json: {
						url: 'http://example.com/img',
						responseFormat: 'file',
						outputPropertyName: 'alpha',
					},
				},
				{
					json: {
						url: 'http://example.com/img',
						responseFormat: 'file',
						outputPropertyName: 'beta',
					},
				},
			]);
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': 'image/png' },
				body: Buffer.from('img'),
			});

			const result = await node.execute.call(executeFunctions);
			expect(result[0][0].binary?.alpha).toBeDefined();
			expect(result[0][0].binary?.beta).toBeUndefined();
			expect(result[0][1].binary?.beta).toBeDefined();
			expect(result[0][1].binary?.alpha).toBeUndefined();
		});

		it('should apply per-item responseFormat (file vs text)', async () => {
			setupItems([
				{
					json: {
						url: 'http://example.com/img',
						responseFormat: 'file',
						outputPropertyName: 'data',
					},
				},
				{
					json: {
						url: 'http://example.com/txt',
						responseFormat: 'text',
						outputPropertyName: 'data',
					},
				},
			]);
			(executeFunctions.helpers.request as jest.Mock).mockImplementation(async (opts) => {
				if ((opts.uri as string).includes('/img')) {
					return {
						statusCode: 200,
						headers: { 'content-type': 'image/png' },
						body: Buffer.from('img'),
					};
				}
				// responseFormat='text' → requestOptions.json=true, HTTP lib returns text as string
				return { statusCode: 200, headers: { 'content-type': 'text/plain' }, body: 'hello text' };
			});

			const result = await node.execute.call(executeFunctions);
			// Item 0: file → binary output
			expect(result[0][0].binary?.data).toBeDefined();
			expect(result[0][0].json.data).toBeUndefined();
			// Item 1: text → json output
			expect(result[0][1].binary).toBeUndefined();
			expect(result[0][1].json.data).toBe('hello text');
		});

		it('should apply per-item fullResponse (include or exclude response metadata)', async () => {
			setupItems([
				{ json: { url: 'http://example.com/a', responseFormat: 'json', fullResponse: true } },
				{ json: { url: 'http://example.com/b', responseFormat: 'json', fullResponse: false } },
			]);
			(executeFunctions.helpers.request as jest.Mock).mockImplementation(async (opts) => {
				return {
					statusCode: 200,
					headers: { 'content-type': 'application/json' },
					body: (opts.uri as string).includes('/a') ? { id: 1 } : { id: 2 },
				};
			});

			const result = await node.execute.call(executeFunctions);
			// fullResponse=true → output includes statusCode and body wrapper
			expect(result[0][0].json.statusCode).toBe(200);
			expect((result[0][0].json.body as Record<string, unknown>).id).toBe(1);
			// fullResponse=false → output is just the body
			expect(result[0][1].json.statusCode).toBeUndefined();
			expect(result[0][1].json.id).toBe(2);
		});

		it('should use per-item outputPropertyName as fallback filename when URI has no file segment', async () => {
			setupItems([
				{
					json: {
						url: 'http://example.com/',
						responseFormat: 'file',
						outputPropertyName: 'report',
					},
				},
				{
					json: {
						url: 'http://example.com/',
						responseFormat: 'file',
						outputPropertyName: 'invoice',
					},
				},
			]);
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': 'application/pdf' },
				body: Buffer.from('pdf'),
			});

			const result = await node.execute.call(executeFunctions);
			// uri='http://example.com/' doesn't end with 'pdf' → setFilename fallback: `${responseFileName}.pdf`
			// responseFileName is stored per-item in requests[] as outputPropertyName
			expect(result[0][0].binary?.report.fileName).toBe('report.pdf');
			expect(result[0][1].binary?.invoice.fileName).toBe('invoice.pdf');
		});

		it('should preserve a fileName already set by prepareBinaryData (regression: Content-Disposition)', async () => {
			setupItems([
				{
					json: {
						url: 'http://example.com/download',
						responseFormat: 'file',
						outputPropertyName: 'data',
					},
				},
			]);
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': 'application/octet-stream' },
				body: Buffer.from('data'),
			});
			// Simulate prepareBinaryData parsing Content-Disposition and setting fileName directly
			(executeFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValueOnce({
				data: 'ZGF0YQ==',
				mimeType: 'application/octet-stream',
				fileName: 'custom.txt',
			});

			const result = await node.execute.call(executeFunctions);
			// setFilename returns preparedBinaryData.fileName unchanged when already set
			expect(result[0][0].binary?.data.fileName).toBe('custom.txt');
		});

		it('should apply per-item neverError when autodetecting an invalid-JSON response body', async () => {
			// Item 0: neverError=true  → invalid JSON falls back to {}
			// Item 1: neverError=false → invalid JSON surfaces as a continueOnFail error
			// Regression: the old code read neverError with itemIndex=0 for every item, so
			// item 1 would silently borrow item 0's neverError=true and return {} instead of erroring.
			setupItems([
				{
					json: {
						url: 'http://example.com/a',
						responseFormat: 'autodetect',
						neverError: true,
					},
				},
				{
					json: {
						url: 'http://example.com/b',
						responseFormat: 'autodetect',
						neverError: false,
					},
				},
			]);
			(executeFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

			// Both items return a response with content-type: application/json but an invalid body.
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 422,
				headers: { 'content-type': 'application/json' },
				body: Buffer.from('not valid json'),
			});

			const result = await node.execute.call(executeFunctions);

			// Item 0 (neverError=true): invalid JSON falls back to {} — no error key
			expect(result[0][0].json.error).toBeUndefined();
			expect(result[0][0].json).toEqual({});

			// Item 1 (neverError=false): invalid JSON surfaces as an error via continueOnFail
			expect(result[0][1].json.error).toBeDefined();
		});

		it('should not crash when an earlier item fails with continueOnFail (requests[] alignment)', async () => {
			// Item 0 has an invalid URL → fails in request-build loop → continueOnFail
			// Item 1 has a valid URL → must still be processed correctly
			// Without the requests[] placeholder fix, requests[1] === undefined → TypeError
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }, { json: {} }]);
			(executeFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, itemIndex: number, fallback: unknown) => {
					if (paramName === 'url') {
						// Item 0 → null URL (triggers NodeOperationError in build loop)
						// Item 1 → valid URL
						return itemIndex === 0 ? null : 'http://example.com/ok';
					}
					if (paramName === 'method') return 'GET';
					if (paramName === 'authentication') return 'none';
					if (paramName === 'options') {
						return {
							batching: { batch: { batchSize: 1, batchInterval: 0 } },
							redirect: '',
							proxy: '',
							timeout: '',
							allowUnauthorizedCerts: false,
							queryParameterArrays: '',
							lowercaseHeaders: true,
							response: {
								response: {
									responseFormat: 'json',
									outputPropertyName: 'data',
									fullResponse: false,
									neverError: false,
								},
							},
						};
					}
					if (paramName === 'options.response.response.responseFormat') return 'json';
					if (paramName === 'options.response.response.fullResponse') return false;
					if (paramName === 'options.response.response.neverError') return false;
					if (paramName === 'options.response.response.outputPropertyName') return 'data';
					return fallback;
				},
			);

			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': 'application/json' },
				body: { ok: true },
			});

			const result = await node.execute.call(executeFunctions);

			// Item 0 → error output (continueOnFail)
			expect(result[0][0].json.error).toBeDefined();
			// Item 1 → valid response, no crash
			expect(result[0][1].json.ok).toBe(true);
		});
	});
});
