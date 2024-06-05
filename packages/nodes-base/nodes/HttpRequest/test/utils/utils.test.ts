import type { IRequestOptions } from 'n8n-workflow';
import {
	REDACTED,
	prepareRequestBody,
	sanitizeUiMessage,
	setAgentOptions,
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

		it('should remove keys that contain sensitive data', async () => {
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
		});

		it('should remove secrets', async () => {
			const requestOptions: IRequestOptions = {
				method: 'POST',
				uri: 'https://example.com',
				body: { nested: { secret: 'secretAccessToken' } },
				headers: { authorization: 'secretAccessToken', other: 'foo' },
			};

			expect(sanitizeUiMessage(requestOptions, {}, ['secretAccessToken'])).toEqual({
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
	});
});
