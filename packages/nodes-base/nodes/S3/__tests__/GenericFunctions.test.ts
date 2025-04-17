import { sign } from 'aws4';
import { parseString } from 'xml2js';

import {
	s3ApiRequest,
	s3ApiRequestREST,
	s3ApiRequestSOAP,
	s3ApiRequestSOAPAllItems,
} from '../GenericFunctions';

jest.mock('aws4');
jest.mock('xml2js');

describe('S3 Node Generic Functions', () => {
	let mockContext: any;

	beforeEach(() => {
		jest.clearAllMocks();
		mockContext = {
			getNode: jest.fn().mockReturnValue({ name: 'S3' }),
			getCredentials: jest.fn().mockResolvedValue({
				endpoint: 'https://s3.amazonaws.com',
				accessKeyId: 'test-key',
				secretAccessKey: 'test-secret',
				region: 'us-east-1',
			}),
			helpers: {
				request: jest.fn(),
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
			(parseString as jest.Mock).mockImplementation((_, __, callback) =>
				callback(null, mockParsedResponse),
			);

			const result = await s3ApiRequestSOAP.call(mockContext, 'test-bucket', 'GET', '/');

			expect(result).toEqual(mockParsedResponse);
		});

		it('should handle XML parsing errors', async () => {
			const mockError = new Error('XML Parse Error');
			mockContext.helpers.request.mockResolvedValueOnce('<invalid>xml');
			(parseString as jest.Mock).mockImplementation((_, __, callback) => callback(mockError));

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

			(parseString as jest.Mock)
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
