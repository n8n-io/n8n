import { Readable } from 'stream';
import type { IExecuteFunctions } from 'n8n-workflow';

import { binaryToStringWithEncodingDetection } from '../buffer-decoding';
import type { MockedFunction } from 'vitest';

describe('buffer-decoding utils', () => {
	const createInvalidUtf8Buffer = (prefix: string) =>
		Buffer.concat([Buffer.from(prefix, 'utf8'), Buffer.from([0xe9])]);
	let mockHelpers: IExecuteFunctions['helpers'];
	let mockBinaryToString: MockedFunction<
		(body: Buffer | Readable, encoding?: BufferEncoding) => Promise<string>
	>;
	let mockBinaryToBuffer: MockedFunction<(body: Buffer | Readable) => Promise<Buffer>>;
	let mockDetectBinaryEncoding: MockedFunction<(buffer: Buffer) => string>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockBinaryToString = vi.fn();
		mockBinaryToBuffer = vi.fn();
		mockDetectBinaryEncoding = vi.fn();
		mockHelpers = {
			binaryToString: mockBinaryToString,
			binaryToBuffer: mockBinaryToBuffer,
			detectBinaryEncoding: mockDetectBinaryEncoding,
		} as unknown as IExecuteFunctions['helpers'];
	});

	describe('binaryToStringWithEncodingDetection', () => {
		describe('Content-Type header encoding detection', () => {
			it('should use encoding from Content-Type header (lowercase)', async () => {
				const buffer = Buffer.from('test content', 'utf8');
				const contentType = 'text/html; charset=iso-8859-1';

				mockBinaryToString.mockResolvedValue('test content');

				await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(mockBinaryToString).toHaveBeenCalledWith(buffer, 'iso-8859-1');
			});

			it('should use encoding from Content-Type header (uppercase)', async () => {
				const buffer = Buffer.from('test content', 'utf8');
				const contentType = 'text/html; CHARSET=UTF-16';

				mockBinaryToString.mockResolvedValue('test content');

				await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(mockBinaryToString).toHaveBeenCalledWith(buffer, 'utf-16');
			});

			it('should remove quotes from charset value', async () => {
				const buffer = Buffer.from('test content', 'utf8');
				const contentType = 'text/html; charset="utf-8"';

				mockBinaryToString.mockResolvedValue('test content');

				await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				// Since utf-8 is the default encoding, it should call without encoding parameter
				expect(mockBinaryToString).toHaveBeenCalledWith(buffer);
			});

			it('should handle charset with single quotes', async () => {
				const buffer = Buffer.from('test content', 'utf8');
				const contentType = "text/html; charset='iso-8859-1'";

				mockBinaryToString.mockResolvedValue('test content');

				await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(mockBinaryToString).toHaveBeenCalledWith(buffer, 'iso-8859-1');
			});

			it('should handle charset in complex Content-Type header', async () => {
				const buffer = Buffer.from('test content', 'utf8');
				const contentType = 'text/html; boundary=something; charset=windows-1252; other=value';

				mockBinaryToString.mockResolvedValue('test content');

				await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(mockBinaryToString).toHaveBeenCalledWith(buffer, 'windows-1252');
			});

			it('should fall back to UTF-8 when no charset in Content-Type', async () => {
				const buffer = Buffer.from('test content', 'utf8');
				const contentType = 'text/html';

				mockBinaryToString.mockResolvedValueOnce('test content');

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(mockBinaryToString).toHaveBeenCalledWith(buffer);
				expect(result).toBe('test content');
			});
		});

		describe('UTF-8 fallback behavior', () => {
			it('should return UTF-8 decoded string when no encoding issues detected', async () => {
				const buffer = Buffer.from('test content', 'utf8');
				const contentType = 'text/html';

				mockBinaryToString.mockResolvedValue('test content');

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(result).toBe('test content');
				expect(mockBinaryToString).toHaveBeenCalledTimes(1);
			});

			it('should not trigger re-encoding when UTF-8 content is clean', async () => {
				const buffer = Buffer.from('Hello World! 🌍', 'utf8');
				const contentType = 'text/html';

				mockBinaryToString.mockResolvedValue('Hello World! 🌍');

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(result).toBe('Hello World! 🌍');
				expect(mockBinaryToString).toHaveBeenCalledTimes(1);
			});
		});

		describe('Replacement character detection and re-encoding', () => {
			it('should detect replacement characters and try chardet for Buffer', async () => {
				const buffer = createInvalidUtf8Buffer('test content with ');
				const contentType = 'text/html';

				mockBinaryToString
					.mockResolvedValueOnce('test content with �') // First UTF-8 attempt
					.mockResolvedValueOnce('test content with proper chars'); // Second attempt with detected encoding

				mockDetectBinaryEncoding.mockReturnValue('iso-8859-1');

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(mockDetectBinaryEncoding).toHaveBeenCalledWith(buffer);
				expect(mockBinaryToString).toHaveBeenCalledTimes(2);
				expect(mockBinaryToString).toHaveBeenNthCalledWith(1, buffer);
				expect(mockBinaryToString).toHaveBeenNthCalledWith(2, buffer, 'iso-8859-1');
				expect(result).toBe('test content with proper chars');
			});

			it('should use chardet when the input buffer is not valid UTF-8', async () => {
				const buffer = Buffer.from([0x80, 0x81, 0x82, 0x83]); // High ASCII bytes
				const contentType = 'text/html';
				const highAsciiString = String.fromCharCode(0x80, 0x81, 0x82, 0x83);

				mockBinaryToString
					.mockResolvedValueOnce(highAsciiString) // First UTF-8 attempt
					.mockResolvedValueOnce('proper decoded content'); // Second attempt with detected encoding

				mockDetectBinaryEncoding.mockReturnValue('windows-1252');

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(mockDetectBinaryEncoding).toHaveBeenCalledWith(buffer);
				expect(mockBinaryToString).toHaveBeenCalledTimes(2);
				expect(mockBinaryToString).toHaveBeenNthCalledWith(2, buffer, 'windows-1252');
				expect(result).toBe('proper decoded content');
			});

			it('should try Chinese encodings for Readable streams with replacement chars', async () => {
				const readable = new Readable();
				readable.push(createInvalidUtf8Buffer('content with '));
				readable.push(null);
				const contentType = 'text/html';
				const buffer = createInvalidUtf8Buffer('content with ');

				mockBinaryToBuffer.mockResolvedValue(buffer);
				mockBinaryToString
					.mockResolvedValueOnce('content with �') // First UTF-8 attempt
					.mockResolvedValueOnce('content with proper chars'); // gb18030 attempt (success)

				// Mock chardet to return empty string so it tries Chinese encodings
				mockDetectBinaryEncoding.mockReturnValue('');

				const result = await binaryToStringWithEncodingDetection(
					readable,
					contentType,
					mockHelpers,
				);

				expect(mockBinaryToString).toHaveBeenCalledTimes(2);
				expect(mockBinaryToString).toHaveBeenNthCalledWith(1, buffer);
				expect(mockBinaryToString).toHaveBeenNthCalledWith(2, buffer, 'gb18030');
				expect(result).toBe('content with proper chars');
			});

			it('should try all Chinese encodings for Readable streams if needed', async () => {
				const readable = new Readable();
				readable.push(createInvalidUtf8Buffer('content with '));
				readable.push(null);
				const contentType = 'text/html';
				const buffer = createInvalidUtf8Buffer('content with ');

				mockBinaryToBuffer.mockResolvedValue(buffer);
				mockBinaryToString
					.mockResolvedValueOnce('content with �') // First UTF-8 attempt
					.mockResolvedValueOnce('content with �') // gb18030 attempt
					.mockResolvedValueOnce('content with proper chars'); // gbk attempt (success)

				// Mock chardet to return empty string so it tries Chinese encodings
				mockDetectBinaryEncoding.mockReturnValue('');

				const result = await binaryToStringWithEncodingDetection(
					readable,
					contentType,
					mockHelpers,
				);

				expect(mockBinaryToString).toHaveBeenCalledTimes(3);
				expect(mockBinaryToString).toHaveBeenNthCalledWith(3, buffer, 'gbk');
				expect(result).toBe('content with proper chars');
			});

			it('should return original string if all Chinese encodings fail for Readable', async () => {
				const readable = new Readable();
				readable.push(createInvalidUtf8Buffer('content with '));
				readable.push(null);
				const contentType = 'text/html';
				const buffer = createInvalidUtf8Buffer('content with ');

				mockBinaryToBuffer.mockResolvedValue(buffer);
				mockBinaryToString
					.mockResolvedValueOnce('content with �') // First UTF-8 attempt
					.mockResolvedValueOnce('content with �') // gb18030 attempt
					.mockResolvedValueOnce('content with �') // gbk attempt
					.mockResolvedValueOnce('content with �'); // gb2312 attempt

				mockDetectBinaryEncoding.mockReturnValue('');

				const result = await binaryToStringWithEncodingDetection(
					readable,
					contentType,
					mockHelpers,
				);

				expect(result).toBe('content with �');
			});
		});

		describe('Error handling', () => {
			it('should handle chardet returning null for Buffer', async () => {
				const buffer = createInvalidUtf8Buffer('test content with ');
				const contentType = 'text/html';

				mockBinaryToBuffer.mockResolvedValue(buffer);
				mockBinaryToString.mockResolvedValue('test content with �');
				mockDetectBinaryEncoding.mockReturnValue('');

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(result).toBe('test content with �');
				expect(mockBinaryToString).toHaveBeenCalledTimes(4); // 1 initial + 3 Chinese encodings
			});

			it('should handle chardet returning same encoding as default', async () => {
				const buffer = createInvalidUtf8Buffer('test content with ');
				const contentType = 'text/html';

				mockBinaryToBuffer.mockResolvedValue(buffer);
				mockBinaryToString.mockResolvedValue('test content with �');
				mockDetectBinaryEncoding.mockReturnValue('utf-8');

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(result).toBe('test content with �');
				expect(mockBinaryToString).toHaveBeenCalledTimes(4); // 1 initial + 3 Chinese encodings
			});

			it('should handle errors in Chinese encoding attempts gracefully', async () => {
				const readable = new Readable();
				readable.push(createInvalidUtf8Buffer('content with '));
				readable.push(null);
				const contentType = 'text/html';
				const buffer = createInvalidUtf8Buffer('content with ');

				mockBinaryToBuffer.mockResolvedValue(buffer);
				mockBinaryToString
					.mockResolvedValueOnce('content with �') // First UTF-8 attempt
					.mockRejectedValueOnce(new Error('Encoding error')) // gb18030 error
					.mockResolvedValueOnce('content with proper chars'); // gbk success

				mockDetectBinaryEncoding.mockReturnValue('');

				const result = await binaryToStringWithEncodingDetection(
					readable,
					contentType,
					mockHelpers,
				);

				expect(result).toBe('content with proper chars');
			});

			it('should return original string if all Chinese encodings throw errors', async () => {
				const readable = new Readable();
				readable.push(createInvalidUtf8Buffer('content with '));
				readable.push(null);
				const contentType = 'text/html';
				const buffer = createInvalidUtf8Buffer('content with ');

				mockBinaryToBuffer.mockResolvedValue(buffer);
				mockBinaryToString
					.mockResolvedValueOnce('content with �') // First UTF-8 attempt
					.mockRejectedValue(new Error('Encoding error')); // All Chinese encodings fail

				mockDetectBinaryEncoding.mockReturnValue('');

				const result = await binaryToStringWithEncodingDetection(
					readable,
					contentType,
					mockHelpers,
				);

				expect(result).toBe('content with �');
			});
		});

		describe('Edge cases', () => {
			it('should handle empty content', async () => {
				const buffer = Buffer.from('', 'utf8');
				const contentType = 'text/html';

				mockBinaryToString.mockResolvedValue('');

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(result).toBe('');
				expect(mockBinaryToString).toHaveBeenCalledTimes(1);
			});

			it('should handle empty Readable stream', async () => {
				const readable = new Readable();
				readable.push(null); // Empty stream
				const contentType = 'text/html';
				const buffer = Buffer.from('');

				mockBinaryToBuffer.mockResolvedValue(buffer);
				mockBinaryToString.mockResolvedValue('');

				const result = await binaryToStringWithEncodingDetection(
					readable,
					contentType,
					mockHelpers,
				);

				expect(result).toBe('');
			});

			it('should not re-encode if Chinese encoding returns empty string', async () => {
				const readable = new Readable();
				readable.push(createInvalidUtf8Buffer('content with '));
				readable.push(null);
				const contentType = 'text/html';
				const buffer = createInvalidUtf8Buffer('content with ');

				mockBinaryToBuffer.mockResolvedValue(buffer);
				mockBinaryToString
					.mockResolvedValueOnce('content with �') // First UTF-8 attempt
					.mockResolvedValueOnce(''); // gb18030 returns empty

				mockDetectBinaryEncoding.mockReturnValue('');

				const result = await binaryToStringWithEncodingDetection(
					readable,
					contentType,
					mockHelpers,
				);

				expect(mockBinaryToString).toHaveBeenCalledTimes(4); // Should try all encodings
				expect(result).toBe('content with �'); // Should return original
			});

			it('should preserve valid UTF-8 with two Latin-1 characters', async () => {
				const validUtf8Text = 'éø';
				const buffer = Buffer.from(validUtf8Text, 'utf8');
				const contentType = 'text/html';

				mockBinaryToString.mockResolvedValue(validUtf8Text);

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(result).toBe(validUtf8Text);
				expect(mockBinaryToString).toHaveBeenCalledTimes(1);
				expect(mockDetectBinaryEncoding).not.toHaveBeenCalled();
			});

			it('should preserve valid UTF-8 with Latin-1 text and a literal replacement character', async () => {
				const validUtf8Text = '{"name":"Küçük","value":"�"}';
				const buffer = Buffer.from(validUtf8Text, 'utf8');
				const contentType = 'application/json; charset=utf-8';

				mockBinaryToString.mockResolvedValue(validUtf8Text);

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(result).toBe(validUtf8Text);
				expect(mockBinaryToString).toHaveBeenCalledTimes(1);
				expect(mockDetectBinaryEncoding).not.toHaveBeenCalled();
			});
		});

		describe('Non-UTF-8 encoding specified in Content-Type', () => {
			it('should skip re-encoding when non-UTF-8 encoding is specified and used', async () => {
				const buffer = Buffer.from('test content', 'utf8');
				const contentType = 'text/html; charset=iso-8859-1';

				mockBinaryToString.mockResolvedValue('test content');

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				expect(result).toBe('test content');
				expect(mockBinaryToString).toHaveBeenCalledTimes(1);
				expect(mockBinaryToString).toHaveBeenCalledWith(buffer, 'iso-8859-1');
				expect(mockDetectBinaryEncoding).not.toHaveBeenCalled();
			});

			it('should return result from specified encoding even if it contains replacement chars', async () => {
				const buffer = createInvalidUtf8Buffer('test content with ');
				const contentType = 'text/html; charset=iso-8859-1';

				mockBinaryToString.mockResolvedValue('test content with �');

				const result = await binaryToStringWithEncodingDetection(buffer, contentType, mockHelpers);

				// When a specific encoding is provided, the function uses it directly without re-encoding
				expect(result).toBe('test content with �');
				expect(mockBinaryToString).toHaveBeenCalledTimes(1);
				expect(mockBinaryToString).toHaveBeenCalledWith(buffer, 'iso-8859-1');
				expect(mockDetectBinaryEncoding).not.toHaveBeenCalled();
			});
		});
	});
});
