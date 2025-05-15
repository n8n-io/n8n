import { DateTime } from 'luxon';
import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';
import { Readable } from 'stream';

import { validateAndSetDate } from '../../GenericFunctions';
import { getChunkedFileContent } from '../GenericFunctions';

const UPLOAD_CHUNK_SIZE = 1024 * 1024; // make sure this matches the chunk size in your module

const mockContext = {
	getNode: jest.fn().mockReturnValue('Youtube'),
} as unknown as IExecuteFunctions;

describe('validateAndSetDate', () => {
	const timezone = 'America/New_York';
	let filter: { [key: string]: string };

	beforeEach(() => {
		filter = {};
	});

	it('should convert a valid ISO date and set it with the specified timezone', () => {
		filter.publishedAfter = '2023-10-05T10:00:00.000Z';
		validateAndSetDate(filter, 'publishedAfter', timezone, mockContext);

		expect(filter.publishedAfter).toBe(
			DateTime.fromISO('2023-10-05T10:00:00.000Z').setZone(timezone).toISO(),
		);
	});

	it('should throw NodeOperationError for an invalid date', () => {
		filter.publishedAfter = 'invalid-date';

		expect(() => validateAndSetDate(filter, 'publishedAfter', timezone, mockContext)).toThrow(
			NodeOperationError,
		);

		expect(() => validateAndSetDate(filter, 'publishedAfter', timezone, mockContext)).toThrow(
			`The value "${filter.publishedAfter}" is not a valid DateTime.`,
		);
	});
});

async function collectChunks(generator: AsyncIterable<Buffer>): Promise<Buffer[]> {
	const chunks: Buffer[] = [];
	for await (const chunk of generator) {
		chunks.push(chunk);
	}
	return chunks;
}

describe('getChunkedFileContent', () => {
	it('returns original buffer if binaryDataId is defined', () => {
		const buffer = Buffer.from('test');
		const result = getChunkedFileContent(buffer, 'id123');
		expect(result).toBe(buffer);
	});

	it('returns original stream if binaryDataId is defined', () => {
		const stream = Readable.from(['abc']);
		const result = getChunkedFileContent(stream, 'id456');
		expect(result).toBe(stream);
	});

	it('returns buffer chunk generator if content is Buffer and binaryDataId is undefined', async () => {
		const size = 2.5 * UPLOAD_CHUNK_SIZE;
		const buffer = Buffer.alloc(size, 'a');

		const result = getChunkedFileContent(buffer, undefined);
		expect(typeof (result as any)[Symbol.asyncIterator]).toBe('function');

		const chunks = await collectChunks(result as AsyncIterable<Buffer>);
		expect(chunks.length).toBe(3);
		expect(chunks[0].length).toBe(UPLOAD_CHUNK_SIZE);
		expect(chunks[1].length).toBe(UPLOAD_CHUNK_SIZE);
		expect(chunks[2].length).toBe(size - 2 * UPLOAD_CHUNK_SIZE);
	});

	it('returns stream unchanged if binaryDataId is undefined and content is Readable', () => {
		const stream = Readable.from(['chunk']);
		const result = getChunkedFileContent(stream, undefined);
		expect(result).toBe(stream);
	});

	it('handles empty buffer correctly', async () => {
		const buffer = Buffer.alloc(0);
		const result = getChunkedFileContent(buffer, undefined);
		const chunks = await collectChunks(result as AsyncIterable<Buffer>);
		expect(chunks).toEqual([]);
	});
});
