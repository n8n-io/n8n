import jwt from 'jsonwebtoken';
import { ApplicationError, type IWebhookFunctions } from 'n8n-workflow';

import type { WebhookParameters } from '../utils';
import {
	checkResponseModeConfiguration,
	configuredOutputs,
	getResponseCode,
	getResponseData,
	isIpWhitelisted,
	redactSensitiveHeaders,
	setupOutputConnection,
	validateWebhookAuthentication,
} from '../utils';

jest.mock('jsonwebtoken', () => ({
	verify: jest.fn(),
}));

describe('Webhook Utils', () => {
	describe('getResponseCode', () => {
		it('should return the response code if it exists', () => {
			const parameters: WebhookParameters = {
				responseCode: 404,
				httpMethod: '',
				responseMode: '',
				responseData: '',
			};
			const responseCode = getResponseCode(parameters);
			expect(responseCode).toBe(404);
		});

		it('should return the custom response code if it exists', () => {
			const parameters: WebhookParameters = {
				options: {
					responseCode: {
						values: {
							responseCode: 200,
							customCode: 201,
						},
					},
				},
				httpMethod: '',
				responseMode: '',
				responseData: '',
			};
			const responseCode = getResponseCode(parameters);
			expect(responseCode).toBe(201);
		});

		it('should return the default response code if no response code is provided', () => {
			const parameters: WebhookParameters = {
				httpMethod: '',
				responseMode: '',
				responseData: '',
			};
			const responseCode = getResponseCode(parameters);
			expect(responseCode).toBe(200);
		});
	});

	describe('getResponseData', () => {
		it('should return the response data if it exists', () => {
			const parameters: WebhookParameters = {
				responseData: 'Hello World',
				httpMethod: '',
				responseMode: '',
			};
			const responseData = getResponseData(parameters);
			expect(responseData).toBe('Hello World');
		});

		it('should return the options response data if response mode is "onReceived"', () => {
			const parameters: WebhookParameters = {
				responseMode: 'onReceived',
				options: {
					responseData: 'Hello World',
				},
				httpMethod: '',
				responseData: '',
			};
			const responseData = getResponseData(parameters);
			expect(responseData).toBe('Hello World');
		});

		it('should return "noData" if options noResponseBody is true', () => {
			const parameters: WebhookParameters = {
				responseMode: 'onReceived',
				options: {
					noResponseBody: true,
				},
				httpMethod: '',
				responseData: '',
			};
			const responseData = getResponseData(parameters);
			expect(responseData).toBe('noData');
		});

		it('should return undefined if no response data is provided', () => {
			const parameters: WebhookParameters = {
				responseMode: 'onReceived',
				httpMethod: '',
				responseData: '',
			};
			const responseData = getResponseData(parameters);
			expect(responseData).toBeUndefined();
		});
	});

	describe('configuredOutputs', () => {
		it('should return an array with a single output if httpMethod is not an array', () => {
			const parameters: WebhookParameters = {
				httpMethod: 'GET',
				responseMode: '',
				responseData: '',
			};
			const outputs = configuredOutputs(parameters);
			expect(outputs).toEqual([
				{
					type: 'main',
					displayName: 'GET',
				},
			]);
		});

		it('should return an array of outputs if httpMethod is an array', () => {
			const parameters: WebhookParameters = {
				httpMethod: ['GET', 'POST'],
				responseMode: '',
				responseData: '',
			};
			const outputs = configuredOutputs(parameters);
			expect(outputs).toEqual([
				{
					type: 'main',
					displayName: 'GET',
				},
				{
					type: 'main',
					displayName: 'POST',
				},
			]);
		});
	});

	describe('setupOutputConnection', () => {
		it('should return a function that sets the webhookUrl and executionMode in the output data', () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('GET'),
				getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook/'),
				getMode: jest.fn().mockReturnValue('manual'),
			};
			const method = 'GET';
			const additionalData = {
				nodeVersion: 2.1,
				options: {},
				jwtPayload: {
					userId: '123',
				},
			};
			const outputData = {
				json: {},
			};
			const setupOutput = setupOutputConnection(ctx as IWebhookFunctions, method, additionalData);
			const result = setupOutput(outputData);
			expect(result).toEqual([
				[
					{
						json: {
							webhookUrl: 'https://example.com/webhook-test/',
							executionMode: 'test',
							jwtPayload: { userId: '123' },
						},
					},
				],
			]);
		});

		it('should return a function that sets the webhookUrl and executionMode in the output data for multiple methods', () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue(['GET', 'POST']),
				getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook/'),
				getMode: jest.fn().mockReturnValue('manual'),
			};
			const method = 'POST';
			const additionalData = {
				nodeVersion: 2.1,
				options: {},
				jwtPayload: {
					userId: '123',
				},
			};
			const outputData = {
				json: {},
			};
			const setupOutput = setupOutputConnection(ctx as IWebhookFunctions, method, additionalData);
			const result = setupOutput(outputData);
			expect(result).toEqual([
				[],
				[
					{
						json: {
							webhookUrl: 'https://example.com/webhook-test/',
							executionMode: 'test',
							jwtPayload: { userId: '123' },
						},
					},
				],
			]);
		});

		it('should use custom reductedHeaders when provided in options', () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('GET'),
				getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook/'),
				getMode: jest.fn().mockReturnValue('manual'),
			};
			const method = 'GET';
			const additionalData = {
				nodeVersion: 2.2,
				options: {
					reductedHeaders: 'custom-header, another-header',
					binaryData: false,
					ignoreBots: false,
					rawBody: false,
				},
			};
			const outputData = {
				json: {
					headers: {
						'custom-header': 'secret-value',
						'another-header': 'another-secret',
						'content-type': 'application/json',
					},
				},
			};
			const setupOutput = setupOutputConnection(ctx as IWebhookFunctions, method, additionalData);
			const result = setupOutput(outputData);
			expect(result[0][0].json.headers).toEqual({
				'custom-header': '**hidden**',
				'another-header': '**hidden**',
				'content-type': 'application/json',
			});
		});

		it('should use DEFAULT_REDACTED_HEADERS when nodeVersion >= 2.2 and no reductedHeaders provided', () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('GET'),
				getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook/'),
				getMode: jest.fn().mockReturnValue('manual'),
			};
			const method = 'GET';
			const additionalData = {
				nodeVersion: 2.2,
				options: {
					binaryData: false,
					ignoreBots: false,
					rawBody: false,
				},
			};
			const outputData = {
				json: {
					headers: {
						authorization: 'Bearer secret-token',
						'x-api-key': 'secret-key',
						'content-type': 'application/json',
					},
				},
			};
			const setupOutput = setupOutputConnection(ctx as IWebhookFunctions, method, additionalData);
			const result = setupOutput(outputData);
			expect(result[0][0].json.headers).toEqual({
				authorization: '**hidden**',
				'x-api-key': '**hidden**',
				'content-type': 'application/json',
			});
		});

		it('should use DEFAULT_REDACTED_HEADERS when nodeVersion >= 2.2 and options is undefined', () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('GET'),
				getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook/'),
				getMode: jest.fn().mockReturnValue('manual'),
			};
			const method = 'GET';
			const additionalData = {
				nodeVersion: 2.2,
				options: {},
			};
			const outputData = {
				json: {
					headers: {
						authorization: 'Bearer secret-token',
						'x-api-key': 'secret-key',
						'content-type': 'application/json',
					},
				},
			};
			const setupOutput = setupOutputConnection(ctx as IWebhookFunctions, method, additionalData);
			const result = setupOutput(outputData);
			expect(result[0][0].json.headers).toEqual({
				authorization: '**hidden**',
				'x-api-key': '**hidden**',
				'content-type': 'application/json',
			});
		});

		it('should not redact headers when nodeVersion < 2.2 and no reductedHeaders provided', () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('GET'),
				getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook/'),
				getMode: jest.fn().mockReturnValue('manual'),
			};
			const method = 'GET';
			const additionalData = {
				nodeVersion: 2.1,
				options: {
					binaryData: false,
					ignoreBots: false,
					rawBody: false,
				},
			};
			const outputData = {
				json: {
					headers: {
						authorization: 'Bearer secret-token',
						'x-api-key': 'secret-key',
						'content-type': 'application/json',
					},
				},
			};
			const setupOutput = setupOutputConnection(ctx as IWebhookFunctions, method, additionalData);
			const result = setupOutput(outputData);
			expect(result[0][0].json.headers).toEqual({
				authorization: 'Bearer secret-token',
				'x-api-key': 'secret-key',
				'content-type': 'application/json',
			});
		});

		it('should not redact headers when nodeVersion = 2.1 and options is undefined', () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('GET'),
				getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook/'),
				getMode: jest.fn().mockReturnValue('manual'),
			};
			const method = 'GET';
			const additionalData = {
				nodeVersion: 2.1,
				options: {},
			};
			const outputData = {
				json: {
					headers: {
						authorization: 'Bearer secret-token',
						'x-api-key': 'secret-key',
						'content-type': 'application/json',
					},
				},
			};
			const setupOutput = setupOutputConnection(ctx as IWebhookFunctions, method, additionalData);
			const result = setupOutput(outputData);
			expect(result[0][0].json.headers).toEqual({
				authorization: 'Bearer secret-token',
				'x-api-key': 'secret-key',
				'content-type': 'application/json',
			});
		});

		it('should handle multiple methods with header redaction for nodeVersion >= 2.2', () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue(['GET', 'POST']),
				getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook/'),
				getMode: jest.fn().mockReturnValue('manual'),
			};
			const method = 'POST';
			const additionalData = {
				nodeVersion: 2.2,
				options: {},
			};
			const outputData = {
				json: {
					headers: {
						authorization: 'Bearer secret-token',
						cookie: 'session=abc123',
						'content-type': 'application/json',
					},
				},
			};
			const setupOutput = setupOutputConnection(ctx as IWebhookFunctions, method, additionalData);
			const result = setupOutput(outputData);
			expect(result).toEqual([
				[],
				[
					{
						json: {
							headers: {
								authorization: '**hidden**',
								cookie: '**hidden**',
								'content-type': 'application/json',
							},
							webhookUrl: 'https://example.com/webhook-test/',
							executionMode: 'test',
						},
					},
				],
			]);
		});

		it('should not redact headers when nodeVersion >= 2.2 and reductedHeaders is empty string', () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('GET'),
				getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook/'),
				getMode: jest.fn().mockReturnValue('manual'),
			};
			const method = 'GET';
			const additionalData = {
				nodeVersion: 2.2,
				options: {
					reductedHeaders: '',
					binaryData: false,
					ignoreBots: false,
					rawBody: false,
				},
			};
			const outputData = {
				json: {
					headers: {
						authorization: 'Bearer secret-token',
						'x-api-key': 'secret-key',
						'content-type': 'application/json',
					},
				},
			};
			const setupOutput = setupOutputConnection(ctx as IWebhookFunctions, method, additionalData);
			const result = setupOutput(outputData);
			expect(result[0][0].json.headers).toEqual({
				authorization: 'Bearer secret-token',
				'x-api-key': 'secret-key',
				'content-type': 'application/json',
			});
		});
	});

	describe('isIpWhitelisted', () => {
		it('should return true if whitelist is undefined', () => {
			expect(isIpWhitelisted(undefined, ['192.168.1.1'], '192.168.1.1')).toBe(true);
		});

		it('should return true if whitelist is an empty string', () => {
			expect(isIpWhitelisted('', ['192.168.1.1'], '192.168.1.1')).toBe(true);
		});

		it('should return true if ip is in the whitelist', () => {
			expect(isIpWhitelisted('192.168.1.1', ['192.168.1.2'], '192.168.1.1')).toBe(true);
		});

		it('should return true if any ip in ips is in the whitelist', () => {
			expect(isIpWhitelisted('192.168.1.1', ['192.168.1.1', '192.168.1.2'])).toBe(true);
		});

		it('should return false if ip and ips are not in the whitelist', () => {
			expect(isIpWhitelisted('192.168.1.3', ['192.168.1.1', '192.168.1.2'], '192.168.1.4')).toBe(
				false,
			);
		});

		it('should return true if any ip in ips matches any address in the whitelist array', () => {
			expect(isIpWhitelisted(['192.168.1.1', '192.168.1.2'], ['192.168.1.2', '192.168.1.3'])).toBe(
				true,
			);
		});

		it('should return true if ip matches any address in the whitelist array', () => {
			expect(isIpWhitelisted(['192.168.1.1', '192.168.1.2'], ['192.168.1.3'], '192.168.1.2')).toBe(
				true,
			);
		});

		it('should return false if ip and ips do not match any address in the whitelist array', () => {
			expect(
				isIpWhitelisted(
					['192.168.1.4', '192.168.1.5'],
					['192.168.1.1', '192.168.1.2'],
					'192.168.1.3',
				),
			).toBe(false);
		});

		it('should handle comma-separated whitelist string', () => {
			expect(isIpWhitelisted('192.168.1.1, 192.168.1.2', ['192.168.1.3'], '192.168.1.2')).toBe(
				true,
			);
		});

		it('should trim whitespace in comma-separated whitelist string', () => {
			expect(isIpWhitelisted(' 192.168.1.1 , 192.168.1.2 ', ['192.168.1.3'], '192.168.1.2')).toBe(
				true,
			);
		});
	});

	describe('checkResponseModeConfiguration', () => {
		it('should throw an error if response mode is "responseNode" but no Respond to Webhook node is found', () => {
			const context: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('responseNode'),
				getChildNodes: jest.fn().mockReturnValue([]),
				getNode: jest.fn().mockReturnValue({ name: 'Webhook' }),
			};
			expect(() => {
				checkResponseModeConfiguration(context as IWebhookFunctions);
			}).toThrowError('No Respond to Webhook node found in the workflow');
		});

		it('should throw an error if response mode is not "responseNode" but a Respond to Webhook node is found', () => {
			const context: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('onReceived'),
				getChildNodes: jest.fn().mockReturnValue([{ type: 'n8n-nodes-base.respondToWebhook' }]),
				getNode: jest.fn().mockReturnValue({ name: 'Webhook' }),
			};
			expect(() => {
				checkResponseModeConfiguration(context as IWebhookFunctions);
			}).toThrowError('Unused Respond to Webhook node found in the workflow');
		});
	});

	describe('validateWebhookAuthentication', () => {
		it('should return early if authentication is "none"', async () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('none'),
			};
			const authPropertyName = 'authentication';
			const result = await validateWebhookAuthentication(
				ctx as IWebhookFunctions,
				authPropertyName,
			);
			expect(result).toBeUndefined();
		});

		it('should throw an error if basicAuth is enabled but no authentication data is defined on the node', async () => {
			const headers = {
				authorization: 'Basic some-token',
			};
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('basicAuth'),
				getCredentials: jest.fn().mockRejectedValue(new Error()),
				getRequestObject: jest.fn().mockReturnValue({
					headers,
				}),
				getHeaderData: jest.fn().mockReturnValue(headers),
			};
			const authPropertyName = 'authentication';
			await expect(
				validateWebhookAuthentication(ctx as IWebhookFunctions, authPropertyName),
			).rejects.toThrowError('No authentication data defined on node!');
		});

		it('should throw an error if basicAuth is enabled but the provided authentication data is wrong', async () => {
			const headers = {
				authorization: 'Basic some-token',
			};
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('basicAuth'),
				getCredentials: jest.fn().mockResolvedValue({
					user: 'admin',
					password: 'password',
				}),
				getRequestObject: jest.fn().mockReturnValue({
					headers,
				}),
				getHeaderData: jest.fn().mockReturnValue(headers),
			};
			const authPropertyName = 'authentication';
			await expect(
				validateWebhookAuthentication(ctx as IWebhookFunctions, authPropertyName),
			).rejects.toThrowError('Authorization is required!');
		});

		it('should throw an error if headerAuth is enabled but no authentication data is defined on the node', async () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('headerAuth'),
				getCredentials: jest
					.fn()
					.mockRejectedValue(new Error('No authentication data defined on node!')),
				getRequestObject: jest.fn().mockReturnValue({
					headers: {},
				}),
				getHeaderData: jest.fn().mockReturnValue({}),
			};
			const authPropertyName = 'authentication';
			await expect(
				validateWebhookAuthentication(ctx as IWebhookFunctions, authPropertyName),
			).rejects.toThrowError('No authentication data defined on node!');
		});

		it('should throw an error if headerAuth is enabled but the provided authentication data is wrong', async () => {
			const headers = {
				authorization: 'Bearer invalid-token',
			};
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('headerAuth'),
				getCredentials: jest.fn().mockResolvedValue({
					name: 'Authorization',
					value: 'Bearer token',
				}),
				getRequestObject: jest.fn().mockReturnValue({
					headers,
				}),
				getHeaderData: jest.fn().mockReturnValue(headers),
			};
			const authPropertyName = 'authentication';
			await expect(
				validateWebhookAuthentication(ctx as IWebhookFunctions, authPropertyName),
			).rejects.toThrowError('Authorization data is wrong!');
		});

		it('should throw an error if jwtAuth is enabled but no authentication data is defined on the node', async () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('jwtAuth'),
				getCredentials: jest
					.fn()
					.mockRejectedValue(new Error('No authentication data defined on node!')),
				getRequestObject: jest.fn().mockReturnValue({}),
				getHeaderData: jest.fn().mockReturnValue({}),
			};
			const authPropertyName = 'authentication';
			await expect(
				validateWebhookAuthentication(ctx as IWebhookFunctions, authPropertyName),
			).rejects.toThrowError('No authentication data defined on node!');
		});

		it('should throw an error if jwtAuth is enabled but no token is provided', async () => {
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('jwtAuth'),
				getCredentials: jest.fn().mockResolvedValue({
					keyType: 'passphrase',
					publicKey: '',
					secret: 'secret',
					algorithm: 'HS256',
				}),
				getRequestObject: jest.fn().mockReturnValue({
					headers: {},
				}),
				getHeaderData: jest.fn().mockReturnValue({}),
			};
			const authPropertyName = 'authentication';
			await expect(
				validateWebhookAuthentication(ctx as IWebhookFunctions, authPropertyName),
			).rejects.toThrowError('No token provided');
		});

		it('should throw an error if jwtAuth is enabled but the provided token is invalid', async () => {
			const headers = {
				authorization: 'Bearer invalid-token',
			};
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('jwtAuth'),
				getCredentials: jest.fn().mockResolvedValue({
					keyType: 'passphrase',
					publicKey: '',
					secret: 'secret',
					algorithm: 'HS256',
				}),
				getRequestObject: jest.fn().mockReturnValue({
					headers,
				}),
				getHeaderData: jest.fn().mockReturnValue(headers),
			};
			(jwt.verify as jest.Mock).mockImplementationOnce(() => {
				throw new ApplicationError('jwt malformed');
			});
			const authPropertyName = 'authentication';
			await expect(
				validateWebhookAuthentication(ctx as IWebhookFunctions, authPropertyName),
			).rejects.toThrowError('jwt malformed');
		});

		it('should return the decoded JWT payload if jwtAuth is enabled and the token is valid', async () => {
			const decodedPayload = {
				sub: '1234567890',
				name: 'John Doe',
				iat: 1516239022,
			};
			(jwt.verify as jest.Mock).mockReturnValue(decodedPayload);
			const headers = {
				authorization:
					'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
			};
			const ctx: Partial<IWebhookFunctions> = {
				getNodeParameter: jest.fn().mockReturnValue('jwtAuth'),
				getCredentials: jest.fn().mockResolvedValue({
					keyType: 'passphrase',
					publicKey: '',
					secret: 'secret',
					algorithm: 'HS256',
				}),
				getRequestObject: jest.fn().mockReturnValue({
					headers,
				}),
				getHeaderData: jest.fn().mockReturnValue(headers),
			};
			const authPropertyName = 'authentication';

			const result = await validateWebhookAuthentication(
				ctx as IWebhookFunctions,
				authPropertyName,
			);
			expect(result).toEqual(decodedPayload);
		});
	});

	describe('redactSensitiveHeaders', () => {
		it('should redact authorization header', () => {
			const headers = {
				authorization: 'Bearer some-token',
				'content-type': 'application/json',
			};
			const result = redactSensitiveHeaders(headers, 'authorization');
			expect(result).toEqual({
				authorization: '**hidden**',
				'content-type': 'application/json',
			});
		});

		it('should redact x-api-key header', () => {
			const headers = {
				'x-api-key': 'secret-api-key',
				'user-agent': 'Mozilla/5.0',
			};
			const result = redactSensitiveHeaders(headers, 'x-api-key');
			expect(result).toEqual({
				'x-api-key': '**hidden**',
				'user-agent': 'Mozilla/5.0',
			});
		});

		it('should redact x-auth-token header', () => {
			const headers = {
				'x-auth-token': 'secret-token',
				accept: 'application/json',
			};
			const result = redactSensitiveHeaders(headers, 'x-auth-token');
			expect(result).toEqual({
				'x-auth-token': '**hidden**',
				accept: 'application/json',
			});
		});

		it('should redact cookie header', () => {
			const headers = {
				cookie: 'session=abc123; auth=secret',
				'content-length': '100',
			};
			const result = redactSensitiveHeaders(headers, 'cookie');
			expect(result).toEqual({
				cookie: '**hidden**',
				'content-length': '100',
			});
		});

		it('should redact proxy-authorization header', () => {
			const headers = {
				'proxy-authorization': 'Basic dXNlcjpwYXNz',
				host: 'example.com',
			};
			const result = redactSensitiveHeaders(headers, 'proxy-authorization');
			expect(result).toEqual({
				'proxy-authorization': '**hidden**',
				host: 'example.com',
			});
		});

		it('should redact sslclientcert header', () => {
			const headers = {
				sslclientcert: '-----BEGIN CERTIFICATE-----...',
				connection: 'keep-alive',
			};
			const result = redactSensitiveHeaders(headers, 'sslclientcert');
			expect(result).toEqual({
				sslclientcert: '**hidden**',
				connection: 'keep-alive',
			});
		});

		it('should redact headers case-insensitively', () => {
			const headers = {
				Authorization: 'Bearer token',
				'X-API-KEY': 'secret-key',
				Cookie: 'session=abc',
			};
			const result = redactSensitiveHeaders(headers, 'authorization, x-api-key, cookie');
			expect(result).toEqual({
				Authorization: '**hidden**',
				'X-API-KEY': '**hidden**',
				Cookie: '**hidden**',
			});
		});

		it('should redact multiple sensitive headers', () => {
			const headers = {
				authorization: 'Bearer token',
				'x-api-key': 'secret-key',
				'content-type': 'application/json',
				cookie: 'session=abc',
				'user-agent': 'Mozilla/5.0',
			};
			const result = redactSensitiveHeaders(headers, 'authorization, x-api-key, cookie');
			expect(result).toEqual({
				authorization: '**hidden**',
				'x-api-key': '**hidden**',
				'content-type': 'application/json',
				cookie: '**hidden**',
				'user-agent': 'Mozilla/5.0',
			});
		});

		it('should return the same object if no sensitive headers are present', () => {
			const headers = {
				'content-type': 'application/json',
				'user-agent': 'Mozilla/5.0',
				accept: 'application/json',
			};
			const result = redactSensitiveHeaders(headers);
			expect(result).toEqual(headers);
		});

		it('should handle undefined headers', () => {
			const result = redactSensitiveHeaders(undefined as any);
			expect(result).toBeUndefined();
		});

		it('should handle null headers', () => {
			const result = redactSensitiveHeaders(null as any);
			expect(result).toBeNull();
		});

		it('should handle empty headers object', () => {
			const headers = {};
			const result = redactSensitiveHeaders(headers);
			expect(result).toEqual({});
		});
	});
});
