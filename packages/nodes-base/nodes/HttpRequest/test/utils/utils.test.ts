import type {
	ICredentialDataDecryptedObject,
	INodeExecutionData,
	INodeProperties,
	IRequestOptions,
} from 'n8n-workflow';

import {
	REDACTED,
	prepareRequestBody,
	sanitizeUiMessage,
	setAgentOptions,
	replaceNullValues,
	getSecrets,
} from '../../GenericFunctions';
import type { BodyParameter, BodyParametersReducer } from '../../GenericFunctions';

describe('HTTP Node Utils', () => {
	describe('prepareRequestBody', () => {
		it('should call default reducer', async () => {
			const bodyParameters: BodyParameter[] = [
				{
					name: 'foo.bar',
					value: 'baz',
				},
			];
			const defaultReducer: BodyParametersReducer = jest.fn();

			await prepareRequestBody(bodyParameters, 'json', 3, defaultReducer);

			expect(defaultReducer).toBeCalledTimes(1);
			expect(defaultReducer).toBeCalledWith({}, { name: 'foo.bar', value: 'baz' });
		});

		it('should call process dot notations', async () => {
			const bodyParameters: BodyParameter[] = [
				{
					name: 'foo.bar.spam',
					value: 'baz',
				},
			];
			const defaultReducer: BodyParametersReducer = jest.fn();

			const result = await prepareRequestBody(bodyParameters, 'json', 4, defaultReducer);

			expect(defaultReducer).toBeCalledTimes(0);
			expect(result).toBeDefined();
			expect(result).toEqual({ foo: { bar: { spam: 'baz' } } });
		});
	});

	describe('setAgentOptions', () => {
		it("should not have agentOptions as it's undefined", async () => {
			const requestOptions: IRequestOptions = {
				method: 'GET',
				uri: 'https://example.com',
			};

			const sslCertificates = undefined;

			setAgentOptions(requestOptions, sslCertificates);

			expect(requestOptions).toEqual({
				method: 'GET',
				uri: 'https://example.com',
			});
		});

		it('should have agentOptions set', async () => {
			const requestOptions: IRequestOptions = {
				method: 'GET',
				uri: 'https://example.com',
			};

			const sslCertificates = {
				ca: 'mock-ca',
			};

			setAgentOptions(requestOptions, sslCertificates);

			expect(requestOptions).toStrictEqual({
				method: 'GET',
				uri: 'https://example.com',
				agentOptions: {
					ca: 'mock-ca',
				},
			});
		});
	});

	describe('sanitizeUiMessage', () => {
		it('should remove large Buffers', async () => {
			const requestOptions: IRequestOptions = {
				method: 'POST',
				uri: 'https://example.com',
				body: Buffer.alloc(900000),
			};

			expect(sanitizeUiMessage(requestOptions, {}).body).toEqual(
				'Binary data got replaced with this text. Original was a Buffer with a size of 900000 bytes.',
			);
		});

		it('should remove keys that contain sensitive data and do not modify requestOptions', async () => {
			const requestOptions: IRequestOptions = {
				method: 'POST',
				uri: 'https://example.com',
				body: { sessionToken: 'secret', other: 'foo' },
				headers: { authorization: 'secret', other: 'foo' },
				auth: { user: 'user', password: 'secret' },
			};

			expect(
				sanitizeUiMessage(requestOptions, {
					headers: ['authorization'],
					body: ['sessionToken'],
					auth: ['password'],
				}),
			).toEqual({
				body: { sessionToken: REDACTED, other: 'foo' },
				headers: { other: 'foo', authorization: REDACTED },
				auth: { user: 'user', password: REDACTED },
				method: 'POST',
				uri: 'https://example.com',
			});

			expect(requestOptions).toEqual({
				method: 'POST',
				uri: 'https://example.com',
				body: { sessionToken: 'secret', other: 'foo' },
				headers: { authorization: 'secret', other: 'foo' },
				auth: { user: 'user', password: 'secret' },
			});
		});

		it('should remove secrets', async () => {
			const requestOptions: IRequestOptions = {
				method: 'POST',
				uri: 'https://example.com',
				body: { nested: { secret: 'secretAccessToken' } },
				headers: { authorization: 'secretAccessToken', other: 'foo' },
			};

			const sanitizedRequest = sanitizeUiMessage(requestOptions, {}, ['secretAccessToken']);

			expect(sanitizedRequest).toEqual({
				body: {
					nested: {
						secret: REDACTED,
					},
				},
				headers: { authorization: REDACTED, other: 'foo' },
				method: 'POST',
				uri: 'https://example.com',
			});
		});

		const headersToTest = [
			'authorization',
			'x-api-key',
			'x-auth-token',
			'cookie',
			'proxy-authorization',
			'sslclientcert',
		];

		headersToTest.forEach((header) => {
			it(`should redact the ${header} header when the key is lowercase`, () => {
				const requestOptions: IRequestOptions = {
					method: 'POST',
					uri: 'https://example.com',
					body: { sessionToken: 'secret', other: 'foo' },
					headers: { [header]: 'some-sensitive-token', other: 'foo' },
					auth: { user: 'user', password: 'secret' },
				};

				const sanitizedRequest = sanitizeUiMessage(requestOptions, {});

				expect(sanitizedRequest.headers).toEqual({ [header]: REDACTED, other: 'foo' });
			});

			it(`should redact the ${header} header when the key is uppercase`, () => {
				const requestOptions: IRequestOptions = {
					method: 'POST',
					uri: 'https://example.com',
					body: { sessionToken: 'secret', other: 'foo' },
					headers: { [header.toUpperCase()]: 'some-sensitive-token', other: 'foo' },
					auth: { user: 'user', password: 'secret' },
				};

				const sanitizedRequest = sanitizeUiMessage(requestOptions, {});

				expect(sanitizedRequest.headers).toEqual({
					[header.toUpperCase()]: REDACTED,
					other: 'foo',
				});
			});
		});

		it('should leave headers unchanged if Authorization header is not present', () => {
			const requestOptions: IRequestOptions = {
				method: 'POST',
				uri: 'https://example.com',
				body: { sessionToken: 'secret', other: 'foo' },
				headers: { other: 'foo' },
				auth: { user: 'user', password: 'secret' },
			};
			const sanitizedRequest = sanitizeUiMessage(requestOptions, {});

			expect(sanitizedRequest.headers).toEqual({ other: 'foo' });
		});

		it('should handle case when headers are undefined', () => {
			const requestOptions: IRequestOptions = {};

			const sanitizedRequest = sanitizeUiMessage(requestOptions, {});

			expect(sanitizedRequest.headers).toBeUndefined();
		});
	});

	describe('replaceNullValues', () => {
		it('should replace null json with an empty object', () => {
			const item: INodeExecutionData = {
				json: {},
			};
			const result = replaceNullValues(item);
			expect(result.json).toEqual({});
		});

		it('should not modify json if it is already an object', () => {
			const jsonObject = { key: 'value' };
			const item: INodeExecutionData = { json: jsonObject };
			const result = replaceNullValues(item);
			expect(result.json).toBe(jsonObject);
		});
	});

	describe('getSecrets', () => {
		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should return secrets for sensitive properties', () => {
			const properties: INodeProperties[] = [
				{
					displayName: 'Api Key',
					name: 'apiKey',
					typeOptions: { password: true },
					type: 'string',
					default: undefined,
				},
				{
					displayName: 'Username',
					name: 'username',
					type: 'string',
					default: undefined,
				},
			];
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sensitive-api-key',
				username: 'user123',
			};

			const secrets = getSecrets(properties, credentials);
			expect(secrets).toEqual(['sensitive-api-key']);
		});

		it('should not return non-sensitive properties', () => {
			const properties: INodeProperties[] = [
				{
					displayName: 'Username',
					name: 'username',
					type: 'string',
					default: undefined,
				},
			];
			const credentials: ICredentialDataDecryptedObject = {
				username: 'user123',
			};

			const secrets = getSecrets(properties, credentials);
			expect(secrets).toEqual([]);
		});

		it('should not include non-string values in sensitive properties', () => {
			const properties: INodeProperties[] = [
				{
					displayName: 'ApiKey',
					name: 'apiKey',
					typeOptions: { password: true },
					type: 'string',
					default: undefined,
				},
			];
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 12345,
			};

			const secrets = getSecrets(properties, credentials);
			expect(secrets).toEqual([]);
		});

		it('should return an empty array if properties and credentials are empty', () => {
			const properties: INodeProperties[] = [];
			const credentials: ICredentialDataDecryptedObject = {};

			const secrets = getSecrets(properties, credentials);
			expect(secrets).toEqual([]);
		});

		it('should not include null or undefined values in sensitive properties', () => {
			const properties: INodeProperties[] = [
				{
					displayName: 'ApiKey',
					name: 'apiKey',
					typeOptions: { password: true },
					type: 'string',
					default: undefined,
				},
			];
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: {},
			};

			const secrets = getSecrets(properties, credentials);
			expect(secrets).toEqual([]);
		});
	});
});
