import { sign } from 'aws4';
import { parseString } from 'xml2js';

import {
	s3ApiRequest,
	s3ApiRequestREST,
	s3ApiRequestSOAP,
	s3ApiRequestSOAPAllItems,
	s3CreateMultipartUpload,
	s3UploadPart,
	s3CompleteMultipartUpload,
	s3AbortMultipartUpload,
} from '../GenericFunctions';
import { Builder } from 'xml2js'; // Needed for s3CompleteMultipartUpload test
import { createHash } from 'crypto'; // To mock

jest.mock('aws4');
jest.mock('xml2js', () => {
	const originalXml2js = jest.requireActual('xml2js');
	return {
		...originalXml2js,
		parseString: jest.fn(),
		Builder: jest.fn().mockImplementation(() => ({ // Mock Builder constructor
			buildObject: jest.fn(),
		})),
	};
});
jest.mock('crypto', () => ({
	...jest.requireActual('crypto'),
	createHash: jest.fn().mockReturnThis(), // Return `this` to allow chaining
}));


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

	// New tests for multipart upload functions
	describe('s3CreateMultipartUpload', () => {
		it('should call s3ApiRequestSOAP with correct parameters and return UploadId', async () => {
			const mockResponse = { InitiateMultipartUploadResult: { UploadId: 'test-upload-id' } };
			mockContext.helpers.request.mockResolvedValueOnce('<xml>response</xml>');
			(parseString as jest.Mock).mockImplementationOnce((_, __, callback) =>
				callback(null, mockResponse),
			);

			const result = await s3CreateMultipartUpload.call(
				mockContext,
				'test-bucket',
				'test-key.txt',
				{ 'x-amz-acl': 'private' },
				'us-west-1',
			);

			expect(mockContext.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					qs: { uploads: '' },
					// Path for s3ApiRequest is built from bucket and key, check signOpts for final path
				}),
			);
			// Check if sign was called with the correct path for s3ApiRequest internal logic
			expect(sign).toHaveBeenCalledWith(
				expect.objectContaining({
					path: expect.stringMatching(/\/test-bucket\/test-key.txt\?uploads=/), // Path in s3ApiRequest
					method: 'POST',
					headers: expect.objectContaining({ 'x-amz-acl': 'private' }),
					region: 'us-west-1',
				}),
				expect.any(Object),
			);
			expect(result).toBe('test-upload-id');
		});

		it('should throw error if UploadId is missing in response', async () => {
			const mockResponse = { InitiateMultipartUploadResult: {} }; // Missing UploadId
			mockContext.helpers.request.mockResolvedValueOnce('<xml>response</xml>');
			(parseString as jest.Mock).mockImplementationOnce((_, __, callback) =>
				callback(null, mockResponse),
			);

			await expect(
				s3CreateMultipartUpload.call(mockContext, 'test-bucket', 'test-key.txt'),
			).rejects.toThrow('Invalid response from S3 for CreateMultipartUpload: UploadId missing');
		});
	});

	describe('s3UploadPart', () => {
		const mockDigest = jest.fn().mockReturnValue('mocked-md5-hash');
		const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });

		beforeEach(() => {
			(createHash as jest.Mock).mockImplementation(() => ({
				update: mockUpdate,
			}));
		});

		it('should call s3ApiRequest with correct parameters and return ETag', async () => {
			const mockChunk = Buffer.from('test-chunk');
			const mockEtag = '"test-etag-123"'; // S3 returns ETag with quotes
			const mockFullResponse = {
				headers: { etag: mockEtag },
				body: '', // s3ApiRequest (non-SOAP/REST) returns body, but we need headers
			};
			mockContext.helpers.request.mockResolvedValueOnce(mockFullResponse); // s3ApiRequest is called directly

			const result = await s3UploadPart.call(
				mockContext,
				'test-bucket',
				'test-key.txt',
				'test-upload-id',
				1,
				mockChunk,
				{ 'x-amz-server-side-encryption': 'AES256' },
				'us-east-1',
			);

			expect(createHash).toHaveBeenCalledWith('md5');
			expect(mockUpdate).toHaveBeenCalledWith(mockChunk);
			expect(mockDigest).toHaveBeenCalledWith('base64');

			expect(mockContext.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'PUT',
					qs: { partNumber: 1, uploadId: 'test-upload-id' },
					body: mockChunk,
					headers: expect.objectContaining({
						'Content-Length': mockChunk.length,
						'Content-MD5': 'mocked-md5-hash',
						'x-amz-server-side-encryption': 'AES256',
					}),
					resolveWithFullResponse: true, // Critical for getting headers
					// Path for s3ApiRequest is built from bucket and key, check signOpts for final path
				}),
			);
			expect(sign).toHaveBeenCalledWith(
				expect.objectContaining({
					path: expect.stringMatching(/\/test-bucket\/test-key.txt\?partNumber=1&uploadId=test-upload-id/),
					method: 'PUT',
				}),
				expect.any(Object),
			);
			expect(result).toBe('test-etag-123'); // Quotes should be removed
		});

		it('should throw error if ETag is missing in response headers', async () => {
			const mockChunk = Buffer.from('test-chunk');
			const mockFullResponse = { headers: {}, body: '' }; // Missing ETag
			mockContext.helpers.request.mockResolvedValueOnce(mockFullResponse);

			await expect(
				s3UploadPart.call(
					mockContext,
					'test-bucket',
					'test-key.txt',
					'test-upload-id',
					1,
					mockChunk,
				),
			).rejects.toThrow('Invalid response from S3 for UploadPart: ETag missing from headers');
		});
	});

	describe('s3CompleteMultipartUpload', () => {
		const mockBuilderInstance = { buildObject: jest.fn() };
		const mockDigest = jest.fn().mockReturnValue('mocked-xml-md5-hash');
		const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });


		beforeEach(() => {
			(Builder as jest.Mock).mockImplementation(() => mockBuilderInstance);
			(createHash as jest.Mock).mockImplementation(() => ({
				update: mockUpdate,
			}));
		});


		it('should call s3ApiRequestSOAP with correct XML body and headers', async () => {
			const parts = [
				{ PartNumber: 1, ETag: '"etag1"' },
				{ PartNumber: 2, ETag: '"etag2"' },
			];
			const mockXmlBody = '<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>"etag1"</ETag></Part><Part><PartNumber>2</PartNumber><ETag>"etag2"</ETag></Part></CompleteMultipartUpload>';
			mockBuilderInstance.buildObject.mockReturnValueOnce(mockXmlBody);

			const mockS3Response = { CompleteMultipartUploadResult: { Location: 'test-location' } };
			mockContext.helpers.request.mockResolvedValueOnce('<xml>s3_response</xml>'); // For s3ApiRequestSOAP
			(parseString as jest.Mock).mockImplementationOnce((_, __, callback) =>
				callback(null, mockS3Response),
			);


			const result = await s3CompleteMultipartUpload.call(
				mockContext,
				'test-bucket',
				'test-key.txt',
				'test-upload-id',
				parts,
				{ 'x-amz-meta-custom': 'value' },
				'ap-southeast-2',
			);

			expect(Builder).toHaveBeenCalledWith({ renderOpts: { pretty: false, indent: '', newline: '' } });
			expect(mockBuilderInstance.buildObject).toHaveBeenCalledWith({
				CompleteMultipartUpload: {
					Part: [
						{ PartNumber: 1, ETag: '"etag1"' },
						{ PartNumber: 2, ETag: '"etag2"' },
					],
				},
			});
			expect(createHash).toHaveBeenCalledWith('md5');
			expect(mockUpdate).toHaveBeenCalledWith(mockXmlBody);
			expect(mockDigest).toHaveBeenCalledWith('base64');

			expect(mockContext.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					qs: { uploadId: 'test-upload-id' },
					body: mockXmlBody,
					headers: expect.objectContaining({
						'Content-Type': 'application/xml',
						'Content-MD5': 'mocked-xml-md5-hash',
						'x-amz-meta-custom': 'value',
					}),
					// Path for s3ApiRequest is built from bucket and key, check signOpts for final path
				}),
			);
			expect(sign).toHaveBeenCalledWith(
				expect.objectContaining({
					path: expect.stringMatching(/\/test-bucket\/test-key.txt\?uploadId=test-upload-id/),
					method: 'POST',
					region: 'ap-southeast-2',
				}),
				expect.any(Object),
			);
			expect(result).toEqual(mockS3Response);
		});
	});

	describe('s3AbortMultipartUpload', () => {
		it('should call s3ApiRequestSOAP with DELETE method and uploadId', async () => {
			const mockS3Response = { AbortMultipartUploadResult: {} }; // Or often empty for 204
			mockContext.helpers.request.mockResolvedValueOnce(''); // 204 No Content often has empty body
			(parseString as jest.Mock).mockImplementationOnce((_, __, callback) =>
				callback(null, mockS3Response), // parseString might return {} for empty string
			);

			const result = await s3AbortMultipartUpload.call(
				mockContext,
				'test-bucket',
				'test-key.txt',
				'test-upload-id',
				{ 'x-amz-expected-bucket-owner': 'owner-id' },
				'eu-central-1',
			);

			expect(mockContext.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'DELETE',
					qs: { uploadId: 'test-upload-id' },
					body: undefined,
					headers: expect.objectContaining({
						'x-amz-expected-bucket-owner': 'owner-id',
					}),
					// Path for s3ApiRequest is built from bucket and key, check signOpts for final path
				}),
			);
			expect(sign).toHaveBeenCalledWith(
				expect.objectContaining({
					path: expect.stringMatching(/\/test-bucket\/test-key.txt\?uploadId=test-upload-id/),
					method: 'DELETE',
					region: 'eu-central-1',
				}),
				expect.any(Object),
			);
			expect(result).toEqual(mockS3Response);
		});
	});
});
