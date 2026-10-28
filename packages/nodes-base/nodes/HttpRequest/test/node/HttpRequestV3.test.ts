import { IncomingMessage } from 'http';
import type { IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import { Socket } from 'net';

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

		it('should pass a redacted request snapshot to the paginated helper for a generic header credential', async () => {
			const headerName = 'x-owner-domain-secret';
			const headerValue = 'super-secret-value';

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
							return 'genericCredentialType';
						case 'genericAuthType':
							return 'httpHeaderAuth';
						case 'options':
							return paginationTestOptions;
						case 'options.pagination.pagination':
							return {
								paginationMode: 'responseContainsNextURL',
								nextURL: `={{ $request.headers['${headerName}'] }}`,
								paginationCompleteWhen: 'receiveSpecificStatusCodes',
								statusCodesWhenComplete: '200',
								completeExpression: '',
								limitPagesFetched: true,
								maxRequests: 1,
								requestInterval: 0,
							};
						default:
							return defaultValue;
					}
				},
			);
			(executeFunctions.getCredentials as jest.Mock).mockResolvedValue({
				name: headerName,
				value: headerValue,
			});
			(executeFunctions.helpers.requestWithAuthenticationPaginated as jest.Mock).mockResolvedValue([
				{
					headers: { 'content-type': 'application/json' },
					body: { success: true },
					statusCode: 200,
				},
			]);

			await node.execute.call(executeFunctions);

			expect(executeFunctions.helpers.requestWithAuthenticationPaginated).toHaveBeenCalledTimes(1);

			// The live request options (1st arg) keep the credential header so the
			// actual outgoing requests stay authenticated.
			const liveRequest = (executeFunctions.helpers.requestWithAuthenticationPaginated as jest.Mock)
				.mock.calls[0][0] as { headers: Record<string, unknown> };
			expect(liveRequest.headers[headerName]).toBe(headerValue);

			// The sanitized snapshot (6th arg) exposed to pagination expressions has
			// the credential-derived header redacted.
			const sanitizedRequest = (
				executeFunctions.helpers.requestWithAuthenticationPaginated as jest.Mock
			).mock.calls[0][5] as { headers: Record<string, unknown> };
			expect(sanitizedRequest.headers[headerName]).toBe('**hidden**');
		});
	});

	describe('Node context on manual runs', () => {
		const REQUEST_HEADER = 'X-Custom-Header: custom-value';

		// A response stream references its socket, and the socket references the raw request headers.
		const createStreamWithRequestHeaders = () => {
			const socket = new Socket();
			Object.assign(socket, {
				_httpMessage: { _header: `GET /photo/1 HTTP/1.1\r\n${REQUEST_HEADER}\r\n` },
			});
			return new IncomingMessage(socket);
		};

		let nodeContext: Record<string, unknown>;

		const paginationOptions = {
			paginationMode: 'responseContainsNextURL',
			nextURL: '={{ $response.body.next }}',
			paginationCompleteWhen: 'responseIsEmpty',
			statusCodesWhenComplete: '',
			completeExpression: '',
			limitPagesFetched: false,
			maxRequests: 10,
			requestInterval: 0,
		};

		const setup = (responseOptions: Record<string, unknown>, pagination?: unknown) => {
			nodeContext = {};
			(executeFunctions.getMode as jest.Mock).mockReturnValue('manual');
			(executeFunctions.getContext as jest.Mock).mockReturnValue(nodeContext);
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback: unknown) => {
					switch (paramName) {
						case 'url':
							return baseUrl;
						case 'method':
							return 'GET';
						case 'authentication':
							return 'none';
						case 'options':
							return { ...options, response: { response: responseOptions } };
						case 'options.pagination.pagination':
							return pagination ?? fallback;
						case 'options.response.response.responseFormat':
							return responseOptions.responseFormat ?? fallback;
						case 'options.response.response.fullResponse':
							return responseOptions.fullResponse ?? fallback;
						default:
							return fallback;
					}
				},
			);
			(executeFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: '',
				mimeType: 'image/png',
			});
		};

		it.each([false, true])(
			'should not keep the response stream in the context for file format (fullResponse: %s)',
			async (fullResponse) => {
				setup({ responseFormat: 'file', fullResponse });
				(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
					statusCode: 200,
					statusMessage: 'OK',
					headers: { 'content-type': 'image/png' },
					body: createStreamWithRequestHeaders(),
				});

				await node.execute.call(executeFunctions);

				expect(nodeContext.response).toEqual({
					statusCode: 200,
					statusMessage: 'OK',
					headers: { 'content-type': 'image/png' },
					body: expect.any(String),
				});
				expect(JSON.stringify(nodeContext)).not.toContain(REQUEST_HEADER);
			},
		);

		it('should not keep the response stream in the context for an autodetected binary response', async () => {
			setup({});
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': 'image/png' },
				body: createStreamWithRequestHeaders(),
			});

			await node.execute.call(executeFunctions);

			expect(JSON.stringify(nodeContext)).not.toContain(REQUEST_HEADER);
		});

		it('should keep the resolved body in the context for an autodetected JSON response', async () => {
			setup({});
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': 'application/json' },
				body: Buffer.from(JSON.stringify({ next: 'page-2' })),
			});

			await node.execute.call(executeFunctions);

			expect(nodeContext.response).toMatchObject({
				statusCode: 200,
				headers: { 'content-type': 'application/json' },
				body: { next: 'page-2' },
			});
		});

		it('should keep only the first page in the context for paginated requests', async () => {
			setup({ responseFormat: 'json' }, paginationOptions);
			const pages = [
				{ statusCode: 200, headers: { 'content-type': 'application/json' }, body: { next: 'p2' } },
				{ statusCode: 200, headers: { 'content-type': 'application/json' }, body: { next: '' } },
			];
			(executeFunctions.helpers.requestWithAuthenticationPaginated as jest.Mock).mockResolvedValue(
				pages,
			);

			await node.execute.call(executeFunctions);

			expect(Array.isArray(nodeContext.response)).toBe(false);
			expect(nodeContext.response).toMatchObject(pages[0]);
		});

		it('should not keep the response stream in the context for paginated file requests', async () => {
			setup({ responseFormat: 'file' }, paginationOptions);
			(executeFunctions.helpers.requestWithAuthenticationPaginated as jest.Mock).mockResolvedValue([
				{
					statusCode: 200,
					headers: { 'content-type': 'image/png' },
					body: createStreamWithRequestHeaders(),
				},
			]);

			await node.execute.call(executeFunctions);

			expect(nodeContext.response).toMatchObject({ statusCode: 200, body: expect.any(String) });
			expect(JSON.stringify(nodeContext)).not.toContain(REQUEST_HEADER);
		});

		it('should not write to the context outside of manual runs', async () => {
			setup({ responseFormat: 'file' });
			(executeFunctions.getMode as jest.Mock).mockReturnValue('trigger');
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': 'image/png' },
				body: createStreamWithRequestHeaders(),
			});

			await node.execute.call(executeFunctions);

			expect(nodeContext).toEqual({});
		});
	});

	describe('Raw request body', () => {
		const REQUEST_HEADER = 'X-Custom-Header: custom-value';

		// A response stream references its socket, and the socket references the raw request headers.
		const createStream = (content: string) => {
			const socket = new Socket();
			Object.assign(socket, {
				_httpMessage: { _header: `POST / HTTP/1.1\r\n${REQUEST_HEADER}\r\n` },
			});
			const message = new IncomingMessage(socket);
			message.push(content);
			message.push(null);
			return message;
		};

		const paginationOptions = {
			paginationMode: 'responseContainsNextURL',
			nextURL: '={{ $response.body.next }}',
			paginationCompleteWhen: 'responseIsEmpty',
			statusCodesWhenComplete: '',
			completeExpression: '',
			limitPagesFetched: false,
			maxRequests: 10,
			requestInterval: 0,
		};

		beforeEach(() => {
			Object.assign(executeFunctions.helpers, {
				binaryToBuffer: jest.fn(async (stream: AsyncIterable<Buffer | string>) => {
					const chunks: Buffer[] = [];
					for await (const chunk of stream) chunks.push(Buffer.from(chunk));
					return Buffer.concat(chunks);
				}),
				detectBinaryEncoding: jest.fn(() => 'utf-8'),
			});
		});

		const setupRawBody = (responseFormat?: string, fullResponse = false, pagination?: unknown) => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex: number, fallback: unknown) => {
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
							return 'raw';
						case 'rawContentType':
							return 'application/json';
						case 'body':
							return '{"a":1}';
						case 'options':
							return { ...options, response: { response: { responseFormat, fullResponse } } };
						case 'options.pagination.pagination':
							return pagination ?? fallback;
						case 'options.response.response.responseFormat':
							return responseFormat ?? fallback;
						case 'options.response.response.fullResponse':
							return fullResponse;
						default:
							return fallback;
					}
				},
			);
		};

		const mockResponse = (body: unknown, contentType = 'application/json') => {
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': contentType },
				body,
			});
		};

		it.each(['json', 'text', undefined, 'file'])(
			'should request a stream for the %s response format',
			async (responseFormat) => {
				setupRawBody(responseFormat);
				mockResponse(createStream('{"a":1}'));
				(executeFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
					data: '',
					mimeType: 'application/json',
				});

				await node.execute.call(executeFunctions);

				const requestOptions = (executeFunctions.helpers.request as jest.Mock).mock.calls[0][0] as {
					useStream?: boolean;
				};
				expect(requestOptions.useStream).toBe(true);
			},
		);

		it('should return the parsed body for the json response format', async () => {
			setupRawBody('json');
			mockResponse(createStream('{"a":1}'));

			const result = await node.execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { a: 1 }, pairedItem: { item: 0 } }]]);
			expect(JSON.stringify(result)).not.toContain(REQUEST_HEADER);
		});

		it('should return the parsed body for the json response format with full response', async () => {
			setupRawBody('json', true);
			mockResponse(createStream('{"a":1}'));

			const result = await node.execute.call(executeFunctions);

			expect(result[0][0].json.body).toEqual({ a: 1 });
			expect(JSON.stringify(result)).not.toContain(REQUEST_HEADER);
		});

		it('should throw for the json response format with a body that is not json', async () => {
			setupRawBody('json');
			mockResponse(createStream('not json'));

			await expect(node.execute.call(executeFunctions)).rejects.toThrow('not valid JSON');
		});

		it.each([false, true])(
			'should return the body as text for the text response format (fullResponse: %s)',
			async (fullResponse) => {
				setupRawBody('text', fullResponse);
				mockResponse(createStream('{"a":1}'));

				const result = await node.execute.call(executeFunctions);

				expect(result[0][0].json.data).toBe('{"a":1}');
				expect(JSON.stringify(result)).not.toContain(REQUEST_HEADER);
			},
		);

		it('should keep the body that the pagination helper resolved', async () => {
			setupRawBody('json', false, paginationOptions);
			(executeFunctions.helpers.requestWithAuthenticationPaginated as jest.Mock).mockResolvedValue([
				{
					statusCode: 200,
					headers: { 'content-type': 'application/json' },
					body: { a: 1 },
					__bodyResolved: true,
				},
			]);

			const result = await node.execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { a: 1 }, pairedItem: { item: 0 } }]]);
			const paginatedRequestOptions = (
				executeFunctions.helpers.requestWithAuthenticationPaginated as jest.Mock
			).mock.calls[0][0] as { useStream?: boolean };
			expect(paginatedRequestOptions.useStream).toBe(true);
			expect(executeFunctions.helpers.binaryToBuffer).not.toHaveBeenCalled();
		});

		it('should keep the response stream for the file response format', async () => {
			setupRawBody('file');
			const stream = createStream('data');
			mockResponse(stream, 'image/png');
			(executeFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: '',
				mimeType: 'image/png',
			});

			await node.execute.call(executeFunctions);

			expect(executeFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
				stream,
				undefined,
				'image/png',
			);
			expect(executeFunctions.helpers.binaryToBuffer).not.toHaveBeenCalled();
		});
	});
});
