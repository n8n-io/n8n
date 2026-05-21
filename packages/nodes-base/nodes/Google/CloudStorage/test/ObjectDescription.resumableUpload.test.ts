import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { Readable } from 'stream';

import { objectOperations } from '../ObjectDescription';

// Extract the body-creation preSend (index 1 — index 0 handles query params/headers)
type PreSendFn = (
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
) => Promise<IHttpRequestOptions>;

const createOption = objectOperations[0].options![0] as INodePropertyOptions;
const bodySend = createOption.routing!.send!.preSend![1] as unknown as PreSendFn;

const CHUNK_SIZE = 8 * 1024 * 1024;

// Hoisted mocks shared across all tests
const httpRequestWithAuthentication = jest.fn();
const httpRequest = jest.fn();
const assertBinaryData = jest.fn();
const getBinaryMetadata = jest.fn();
const getBinaryStream = jest.fn();

describe('Google Cloud Storage - Create object resumable upload (preSend)', () => {
	let ctx: MockProxy<IExecuteSingleFunctions>;

	const baseOptions: IHttpRequestOptions = {
		method: 'POST',
		url: '/b/my-bucket/o/',
		baseURL: 'https://storage.googleapis.com/upload/storage/v1',
		qs: { name: 'my-object', uploadType: 'multipart' },
		headers: {},
	};

	beforeEach(() => {
		ctx = mock<IExecuteSingleFunctions>();
		ctx.helpers = {
			httpRequestWithAuthentication,
			httpRequest,
			assertBinaryData,
			getBinaryMetadata,
			getBinaryStream,
		} as unknown as typeof ctx.helpers;
		ctx.getNode.mockReturnValue({
			name: 'Google Cloud Storage',
			type: 'n8n-nodes-base.googleCloudStorage',
			typeVersion: 1.1,
		} as never);
		jest.clearAllMocks();
	});

	/** Sets up getNodeParameter for the happy-path resumable upload. */
	function setupParams(objectName = 'my-object', bucketName = 'my-bucket') {
		ctx.getNodeParameter
			.mockReturnValueOnce(objectName) // objectName  → metadata
			.mockReturnValueOnce({}) //          createData
			.mockReturnValueOnce(true) //         createFromBinary
			.mockReturnValueOnce('data') //        createBinaryPropertyName
			.mockReturnValueOnce(bucketName) //   bucketName  → resumable path
			.mockReturnValueOnce(objectName) //   objectName  → resumable path
			.mockReturnValueOnce({}); //           encryptionHeaders
	}

	function setupSessionResponse(url = 'https://storage.googleapis.com/upload/session') {
		httpRequestWithAuthentication.mockResolvedValue({
			headers: { location: url },
			body: {},
		});
	}

	describe('session initiation', () => {
		it('sends metadata as JSON with correct upload headers when content length is known', async () => {
			const fileSize = CHUNK_SIZE;
			setupParams();
			assertBinaryData.mockReturnValue({ id: 'binary-id', mimeType: 'image/png' });
			getBinaryMetadata.mockResolvedValue({ mimeType: 'image/png', fileSize });
			getBinaryStream.mockResolvedValue(Readable.from([Buffer.alloc(fileSize, 'a')]));
			setupSessionResponse();
			httpRequest.mockResolvedValue({ statusCode: 200 });

			await bodySend.call(ctx, { ...baseOptions });

			expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
				'googleCloudStorageOAuth2Api',
				expect.objectContaining({
					method: 'POST',
					qs: expect.objectContaining({ uploadType: 'resumable' }),
					json: true,
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						'X-Upload-Content-Type': 'image/png',
						'X-Upload-Content-Length': fileSize,
					}),
				}),
			);
		});

		it('omits X-Upload-Content-Length when file size is unknown', async () => {
			setupParams();
			assertBinaryData.mockReturnValue({ id: 'binary-id', mimeType: 'application/octet-stream' });
			getBinaryMetadata.mockResolvedValue({ mimeType: 'application/octet-stream', fileSize: NaN });
			getBinaryStream.mockResolvedValue(Readable.from([Buffer.alloc(100, 'a')]));
			setupSessionResponse();
			httpRequest.mockResolvedValue({ statusCode: 200 });

			await bodySend.call(ctx, { ...baseOptions });

			const sessionHeaders = httpRequestWithAuthentication.mock.calls[0][1].headers;
			expect(sessionHeaders['X-Upload-Content-Length']).toBeUndefined();
		});

		it('throws when the session response has no location header', async () => {
			setupParams();
			assertBinaryData.mockReturnValue({ id: 'binary-id', mimeType: 'image/png' });
			getBinaryMetadata.mockResolvedValue({ mimeType: 'image/png', fileSize: 100 });
			getBinaryStream.mockResolvedValue(Readable.from([Buffer.alloc(100, 'a')]));
			httpRequestWithAuthentication.mockResolvedValue({
				headers: {}, // no location
				body: { error: { message: 'Bad Request' } },
			});

			await expect(bodySend.call(ctx, { ...baseOptions })).rejects.toThrow();
		});
	});

	describe('chunk uploads — known content length', () => {
		it('sends chunks with exact byte ranges and known total size', async () => {
			const fileSize = CHUNK_SIZE + 512; // two chunks
			const data = Buffer.alloc(fileSize, 'a');
			setupParams();
			assertBinaryData.mockReturnValue({ id: 'binary-id', mimeType: 'image/png' });
			getBinaryMetadata.mockResolvedValue({ mimeType: 'image/png', fileSize });
			getBinaryStream.mockResolvedValue(Readable.from([data]));
			setupSessionResponse();
			httpRequest.mockResolvedValue({ statusCode: 200 });

			await bodySend.call(ctx, { ...baseOptions });

			expect(httpRequest).toHaveBeenCalledTimes(2);
			expect(httpRequest).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Range': `bytes 0-${CHUNK_SIZE - 1}/${fileSize}`,
					}),
				}),
			);
			expect(httpRequest).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Range': `bytes ${CHUNK_SIZE}-${fileSize - 1}/${fileSize}`,
					}),
				}),
			);
		});

		it('throws when a chunk upload returns a 4xx status', async () => {
			const fileSize = 100;
			setupParams();
			assertBinaryData.mockReturnValue({ id: 'binary-id', mimeType: 'image/png' });
			getBinaryMetadata.mockResolvedValue({ mimeType: 'image/png', fileSize });
			getBinaryStream.mockResolvedValue(Readable.from([Buffer.alloc(fileSize, 'a')]));
			setupSessionResponse();
			httpRequest.mockResolvedValue({ statusCode: 400, body: { error: 'bad request' } });

			await expect(bodySend.call(ctx, { ...baseOptions })).rejects.toThrow();
		});
	});

	describe('chunk uploads — unknown content length', () => {
		it('sends intermediate chunks with total "*" and the final chunk with the actual total', async () => {
			const chunk1 = Buffer.alloc(CHUNK_SIZE, 'a');
			const chunk2 = Buffer.alloc(512, 'b');
			const total = CHUNK_SIZE + 512;
			setupParams();
			assertBinaryData.mockReturnValue({ id: 'binary-id', mimeType: 'image/png' });
			getBinaryMetadata.mockResolvedValue({ mimeType: 'image/png', fileSize: NaN });
			getBinaryStream.mockResolvedValue(Readable.from([chunk1, chunk2]));
			setupSessionResponse();
			httpRequest.mockResolvedValue({ statusCode: 200 });

			await bodySend.call(ctx, { ...baseOptions });

			expect(httpRequest).toHaveBeenCalledTimes(2);
			// Intermediate chunk — total unknown
			expect(httpRequest).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Range': `bytes 0-${CHUNK_SIZE - 1}/*`,
					}),
				}),
			);
			// Final chunk — total is now known
			expect(httpRequest).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					headers: expect.objectContaining({
						'Content-Range': `bytes ${CHUNK_SIZE}-${total - 1}/${total}`,
					}),
				}),
			);
		});
	});

	describe('final GET request', () => {
		it('returns a GET request pointing at the metadata endpoint', async () => {
			const fileSize = 100;
			setupParams();
			assertBinaryData.mockReturnValue({ id: 'binary-id', mimeType: 'image/png' });
			getBinaryMetadata.mockResolvedValue({ mimeType: 'image/png', fileSize });
			getBinaryStream.mockResolvedValue(Readable.from([Buffer.alloc(fileSize, 'a')]));
			setupSessionResponse();
			httpRequest.mockResolvedValue({ statusCode: 200 });

			const result = await bodySend.call(ctx, { ...baseOptions });

			expect(result.method).toBe('GET');
			expect(result.baseURL).toBe('https://storage.googleapis.com/storage/v1');
			expect(result.url).toBe('/b/my-bucket/o/my-object');
		});

		it('URL-encodes object names that contain special characters', async () => {
			const objectName = 'folder/image file.png';
			const fileSize = 100;
			setupParams(objectName, 'my-bucket');
			assertBinaryData.mockReturnValue({ id: 'binary-id', mimeType: 'image/png' });
			getBinaryMetadata.mockResolvedValue({ mimeType: 'image/png', fileSize });
			getBinaryStream.mockResolvedValue(Readable.from([Buffer.alloc(fileSize, 'a')]));
			setupSessionResponse();
			httpRequest.mockResolvedValue({ statusCode: 200 });

			const result = await bodySend.call(ctx, { ...baseOptions });

			expect(result.url).toBe(`/b/my-bucket/o/${encodeURIComponent(objectName)}`);
		});
	});
});
