import FormData from 'form-data';
import { Readable } from 'stream';
import { jsonParse } from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
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
			const defaultReducer: BodyParametersReducer = vi.fn();

			await prepareRequestBody(bodyParameters, 'json', 3, defaultReducer);

			expect(defaultReducer).toBeCalledTimes(1);
			expect(defaultReducer).toBeCalledWith({}, { name: 'foo.bar', value: 'baz' });
		});

		it('should create FormData with knownLength for stream binary data', async () => {
			const streamContent = Buffer.from('test-binary-content');
			const bodyParameters: BodyParameter[] = [
				{
					name: 'File',
					value: '',
					parameterType: 'formBinaryData',
				},
				{
					name: 'Folder',
					value: '/uploads',
				},
			];

			const mockReducer: BodyParametersReducer = vi.fn().mockResolvedValue({
				File: {
					value: Readable.from(streamContent),
					options: {
						filename: 'test.pdf',
						contentType: 'application/pdf',
						knownLength: streamContent.length,
					},
				},
			});

			const result = await prepareRequestBody(
				bodyParameters,
				'multipart-form-data',
				4.2,
				mockReducer,
			);

			expect(result).toBeInstanceOf(FormData);
			const formData = result as FormData;

			// Verify FormData can calculate its total length (fails without knownLength)
			const length = await new Promise<number>((resolve, reject) => {
				formData.getLength((err, len) => (err ? reject(err) : resolve(len)));
			});
			expect(length).toBeGreaterThan(0);
		});

		it('should call process dot notations', async () => {
			const bodyParameters: BodyParameter[] = [
				{
					name: 'foo.bar.spam',
					value: 'baz',
				},
			];
			const defaultReducer: BodyParametersReducer = vi.fn();

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
		const STREAM_REPLACEMENT = 'Binary data got replaced with this text. Original was a stream.';

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

		it('should remove a streamed body', () => {
			const requestOptions: IRequestOptions = {
				method: 'POST',
				uri: 'https://example.com',
				body: Readable.from(Buffer.alloc(10)),
			};

			expect(sanitizeUiMessage(requestOptions, {}).body).toEqual(STREAM_REPLACEMENT);
		});

		it('should remove a multipart upload built as form-data (node version >= 4.2)', () => {
			const formData = new FormData();
			formData.append('file', Readable.from(Buffer.alloc(10)), { filename: 'f.pdf' });
			const requestOptions: IRequestOptions = {
				method: 'POST',
				uri: 'https://example.com',
				formData,
			};

			expect(sanitizeUiMessage(requestOptions, {}).formData).toEqual(STREAM_REPLACEMENT);
		});

		// Below node version 4.2 (and in V1/V2) the upload sits one level down, as
		// `{ field: { value, options } }`. `value` is a stream when binary data is
		// stored outside the run data and a Buffer when it is inline, so a field has
		// to be capped there just like a root body.
		it.each([
			['a stream', () => Readable.from(Buffer.alloc(10)), STREAM_REPLACEMENT],
			[
				'an oversized Buffer',
				() => Buffer.alloc(300000),
				'Binary data got replaced with this text. Original was a Buffer with a size of 300000 bytes.',
			],
		])('should replace %s nested in a formData field', (_name, upload, replacement) => {
			const uri = 'https://example.com';

			expect(
				sanitizeUiMessage(
					{
						method: 'POST',
						uri,
						formData: {
							file: { value: upload(), options: { filename: 'f.pdf' } },
							name: 'invoice',
						},
					},
					{},
				).formData,
			).toEqual({
				file: { value: replacement, options: { filename: 'f.pdf' } },
				name: 'invoice',
			});

			// The same upload at the root has to reach the same verdict, so the two
			// branches cannot drift apart again.
			expect(sanitizeUiMessage({ method: 'POST', uri, body: upload() }, {}).body).toEqual(
				replacement,
			);
		});

		it('should keep a Buffer nested in a formData field below the size limit', () => {
			const sanitized = sanitizeUiMessage(
				{
					method: 'POST',
					uri: 'https://example.com',
					formData: { file: { value: Buffer.alloc(10), options: { filename: 'f.pdf' } } },
				},
				{},
			).formData as IDataObject;

			expect(typeof (sanitized.file as IDataObject).value).not.toBe('string');
		});

		// `__proto__` arrives as an own key on anything JSON.parse builds, and
		// assigning it would retarget the copy's prototype and drop the key.
		it('should keep an own __proto__ key without retargeting the prototype', () => {
			const body = jsonParse('{"__proto__": {"injected": "yes"}, "keep": 1}');
			const requestOptions: IRequestOptions = { method: 'POST', uri: 'https://example.com', body };

			const sanitized = sanitizeUiMessage(requestOptions, {}).body as IDataObject;

			expect(Object.getPrototypeOf(sanitized)).toBe(Object.prototype);
			expect(Object.getOwnPropertyNames(sanitized)).toEqual(['__proto__', 'keep']);
			expect(sanitized.injected).toBeUndefined();
		});

		it('should keep the placeholder when the body also carries auth data', () => {
			const requestOptions: IRequestOptions = {
				method: 'POST',
				uri: 'https://example.com',
				body: Readable.from(Buffer.alloc(10)),
			};

			expect(sanitizeUiMessage(requestOptions, { body: ['token'] }).body).toEqual(
				STREAM_REPLACEMENT,
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

		it('should redact secrets in auth fields not tracked by authDataKeys', async () => {
			const secretValue = '{"username":"testuser","password":"fake-pass-123"}';
			const requestOptions: IRequestOptions = {
				method: 'GET',
				uri: 'https://example.com',
				auth: { user: secretValue, pass: 'regular-pass' },
			};

			const sanitizedRequest = sanitizeUiMessage(requestOptions, { auth: ['pass'] }, [
				secretValue,
				'regular-pass',
			]);

			expect(sanitizedRequest).toEqual({
				method: 'GET',
				uri: 'https://example.com',
				auth: { user: REDACTED, pass: REDACTED },
			});
		});

		it('should redact secrets appearing as object keys', async () => {
			const secretJson = '{"username":"admin","password":"s3cret"}';
			const requestOptions: IRequestOptions = {
				method: 'GET',
				uri: 'https://example.com',
				qs: { [secretJson]: 'someValue' },
			};

			const sanitizedRequest = sanitizeUiMessage(requestOptions, {}, [secretJson]);

			expect(sanitizedRequest).toEqual({
				method: 'GET',
				uri: 'https://example.com',
				qs: { [REDACTED]: 'someValue' },
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
			vi.clearAllMocks();
		});

		it('should return all string credential values as secrets', () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 'sensitive-api-key',
				username: 'user123',
			};

			const secrets = getSecrets(credentials);
			expect(secrets).toContain('sensitive-api-key');
			expect(secrets).toContain('user123');
		});

		it('should not include non-string values', () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: 12345,
			};

			const secrets = getSecrets(credentials);
			expect(secrets).toEqual([]);
		});

		it('should return an empty array if credentials are empty', () => {
			const credentials: ICredentialDataDecryptedObject = {};

			const secrets = getSecrets(credentials);
			expect(secrets).toEqual([]);
		});

		it('should not include empty strings or non-string values', () => {
			const credentials: ICredentialDataDecryptedObject = {
				apiKey: {},
				emptyField: '',
			};

			const secrets = getSecrets(credentials);
			expect(secrets).toEqual([]);
		});
	});
});
