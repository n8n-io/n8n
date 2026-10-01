import { sign } from 'aws4';
import { parseString } from 'xml2js';

import {
	s3ApiRequest,
	s3ApiRequestREST,
	s3ApiRequestSOAP,
	s3ApiRequestSOAPAllItems,
} from '../GenericFunctions';
import type { Mock } from 'vitest';

vi.mock('aws4', () => ({ sign: vi.fn() }));
vi.mock('xml2js');

describe('S3 Node Generic Functions', () => {
	let mockContext: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockContext = {
			getNode: vi.fn().mockReturnValue({ name: 'S3' }),
			getCredentials: vi.fn().mockResolvedValue({
				endpoint: 'https://s3.amazonaws.com',
				accessKeyId: 'test-key',
				secretAccessKey: 'test-secret',
				region: 'us-east-1',
			}),
			helpers: {
				request: vi.fn(),
			},
		};
	});

	describe('s3ApiRequest', () => {
		it('should throw error if endpoint does not start with http', async () => {
			mockContext.getCredentials.mockResolvedValueOnce({
				endpoint: 'invalid-endpoint',
			});

			await expect(s3ApiRequest.call(mockContext, 'test-bucket', 'GET', '/')).rejects.toThrow(
				'HTTP(S) Scheme is required',
			);
		});

		it('should handle force path style', async () => {
			mockContext.getCredentials.mockResolvedValueOnce({
				endpoint: 'https://s3.amazonaws.com',
				forcePathStyle: true,
			});

			mockContext.helpers.request.mockResolvedValueOnce('success');

			await s3ApiRequest.call(mockContext, 'test-bucket', 'GET', '/test.txt');

			expect(sign).toHaveBeenCalledWith(
				expect.objectContaining({
					path: '/test-bucket/test.txt?',
				}),
				expect.any(Object),
			);
		});

		it('should handle supabase url', async () => {
			mockContext.getCredentials.mockResolvedValueOnce({
				endpoint: 'https://someurl.supabase.co/storage/v1/s3',
				region: 'eu-west-2',
				forcePathStyle: true,
			});

			mockContext.helpers.request.mockResolvedValueOnce('success');

			await s3ApiRequest.call(mockContext, 'test-bucket', 'GET', '/test.txt');

			expect(sign).toHaveBeenCalledWith(
				expect.objectContaining({
					path: '/storage/v1/s3/test-bucket/test.txt?',
				}),
				expect.any(Object),
			);
		});

		it.each([
			{
				forcePathStyle: true,
				signedPathPrefix: '/test-bucket',
				uriPrefix: 'https://s3.amazonaws.com/test-bucket',
			},
			{
				forcePathStyle: false,
				signedPathPrefix: '',
				uriPrefix: 'https://test-bucket.s3.amazonaws.com',
			},
		])(
			'should encode plus signs when forcePathStyle is $forcePathStyle',
			async ({ forcePathStyle, signedPathPrefix, uriPrefix }) => {
				for (const fileKey of ['has+plus.txt', 'has%2Bplus.txt']) {
					mockContext.getCredentials.mockResolvedValueOnce({
						endpoint: 'https://s3.amazonaws.com',
						forcePathStyle,
					});
					mockContext.helpers.request.mockResolvedValueOnce('success');

					await s3ApiRequest.call(mockContext, 'test-bucket', 'GET', `/${fileKey}`);

					expect(sign).toHaveBeenLastCalledWith(
						expect.objectContaining({
							path: `${signedPathPrefix}/has%2Bplus.txt?`,
						}),
						expect.any(Object),
					);
					expect(mockContext.helpers.request).toHaveBeenLastCalledWith(
						expect.objectContaining({
							uri: `${uriPrefix}/has%2Bplus.txt`,
						}),
					);
				}
			},
		);

		it.each([
			{
				forcePathStyle: true,
				signedPathPrefix: '/test-bucket',
				uriPrefix: 'https://s3.amazonaws.com/test-bucket',
			},
			{
				forcePathStyle: false,
				signedPathPrefix: '',
				uriPrefix: 'https://test-bucket.s3.amazonaws.com',
			},
		])(
			'should preserve encoded slashes when forcePathStyle is $forcePathStyle',
			async ({ forcePathStyle, signedPathPrefix, uriPrefix }) => {
				for (const fileKey of [
					'folder%2Ffile.txt',
					'folder%2F..%2Fsecret.txt',
					'folder%252Ffile.txt',
				]) {
					mockContext.getCredentials.mockResolvedValueOnce({
						endpoint: 'https://s3.amazonaws.com',
						forcePathStyle,
					});
					mockContext.helpers.request.mockResolvedValueOnce('success');

					await s3ApiRequest.call(mockContext, 'test-bucket', 'GET', `/${fileKey}`);

					expect(sign).toHaveBeenLastCalledWith(
						expect.objectContaining({
							path: `${signedPathPrefix}/${fileKey}?`,
						}),
						expect.any(Object),
					);
					expect(mockContext.helpers.request).toHaveBeenLastCalledWith(
						expect.objectContaining({
							uri: `${uriPrefix}/${fileKey}`,
						}),
					);
				}
			},
		);
	});

	describe('s3ApiRequestREST', () => {
		it('should parse JSON response', async () => {
			const mockResponse = JSON.stringify({ key: 'value' });
			mockContext.helpers.request.mockResolvedValueOnce(mockResponse);

			const result = await s3ApiRequestREST.call(mockContext, 'test-bucket', 'GET', '/');

			expect(result).toEqual({ key: 'value' });
		});

		it('should return raw response on parse error', async () => {
			const mockResponse = 'invalid-json';
			mockContext.helpers.request.mockResolvedValueOnce(mockResponse);

			const result = await s3ApiRequestREST.call(mockContext, 'test-bucket', 'GET', '/');

			expect(result).toBe('invalid-json');
		});
	});

	describe('s3ApiRequestSOAP', () => {
		it('should parse XML response', async () => {
			const mockXmlResponse = '<root><key>value</key></root>';
			const mockParsedResponse = { root: { key: 'value' } };

			mockContext.helpers.request.mockResolvedValueOnce(mockXmlResponse);
			(parseString as Mock).mockImplementation((_, __, callback) =>
				callback(null, mockParsedResponse),
			);

			const result = await s3ApiRequestSOAP.call(mockContext, 'test-bucket', 'GET', '/');

			expect(result).toEqual(mockParsedResponse);
		});

		it('should handle XML parsing errors', async () => {
			const mockError = new Error('XML Parse Error');
			mockContext.helpers.request.mockResolvedValueOnce('<invalid>xml');
			(parseString as Mock).mockImplementation((_, __, callback) => callback(mockError));

			const result = await s3ApiRequestSOAP.call(mockContext, 'test-bucket', 'GET', '/');

			expect(result).toEqual(mockError);
		});
	});

	describe('s3ApiRequestSOAPAllItems', () => {
		it('should handle pagination with continuation token', async () => {
			const firstResponse = {
				ListBucketResult: {
					Contents: [{ Key: 'file1.txt' }],
					IsTruncated: 'true',
					NextContinuationToken: 'token123',
				},
			};
			const secondResponse = {
				ListBucketResult: {
					Contents: [{ Key: 'file2.txt' }],
					IsTruncated: 'false',
				},
			};

			mockContext.helpers.request
				.mockResolvedValueOnce('<xml>first</xml>')
				.mockResolvedValueOnce('<xml>second</xml>');

			(parseString as Mock)
				.mockImplementationOnce((_, __, callback) => callback(null, firstResponse))
				.mockImplementationOnce((_, __, callback) => callback(null, secondResponse));

			const result = await s3ApiRequestSOAPAllItems.call(
				mockContext,
				'ListBucketResult.Contents',
				'test-bucket',
				'GET',
				'/',
			);

			expect(result).toHaveLength(2);
			expect(result).toEqual([{ Key: 'file1.txt' }, { Key: 'file2.txt' }]);
		});
	});
});
