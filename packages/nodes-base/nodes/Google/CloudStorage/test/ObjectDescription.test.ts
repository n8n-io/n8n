import { Readable } from 'stream';

import { processStreamInChunks } from '../ObjectDescription';

describe('Google Cloud Storage ObjectDescription', () => {
	describe('processStreamInChunks', () => {
		it('yields a single chunk when data is smaller than chunkSize', async () => {
			const data = Buffer.from('hello world');
			const stream = Readable.from([data]);
			const received: Array<{ chunk: Buffer; offset: number }> = [];

			await processStreamInChunks(stream, 1024, async (chunk, offset) => {
				received.push({ chunk, offset });
			});

			expect(received).toHaveLength(1);
			expect(received[0].chunk).toEqual(data);
			expect(received[0].offset).toBe(0);
		});

		it('splits data larger than chunkSize into sequential chunks', async () => {
			const data = Buffer.from('hello world!'); // 12 bytes
			const stream = Readable.from([data]);
			const received: Array<{ data: string; offset: number }> = [];

			await processStreamInChunks(stream, 5, async (chunk, offset) => {
				received.push({ data: chunk.toString(), offset });
			});

			expect(received).toEqual([
				{ data: 'hello', offset: 0 },
				{ data: ' worl', offset: 5 },
				{ data: 'd!', offset: 10 },
			]);
		});

		it('buffers multiple small stream events before flushing a chunk', async () => {
			const stream = Readable.from([Buffer.from('hel'), Buffer.from('lo '), Buffer.from('world')]);
			const received: string[] = [];

			await processStreamInChunks(stream, 6, async (chunk) => {
				received.push(chunk.toString());
			});

			expect(received).toEqual(['hello ', 'world']);
		});

		it('does not call onChunk for an empty stream', async () => {
			const stream = Readable.from([]);
			const onChunk = jest.fn();

			await processStreamInChunks(stream, 1024, onChunk);

			expect(onChunk).not.toHaveBeenCalled();
		});

		it('handles a stream that produces exactly chunkSize bytes', async () => {
			const data = Buffer.alloc(8, 'x');
			const stream = Readable.from([data]);
			const received: Buffer[] = [];

			await processStreamInChunks(stream, 8, async (chunk) => {
				received.push(chunk);
			});

			expect(received).toHaveLength(1);
			expect(received[0]).toEqual(data);
		});

		it('handles stream chunks that are strings (non-Buffer)', async () => {
			const stream = Readable.from(['hello']);
			const received: Buffer[] = [];

			await processStreamInChunks(stream, 1024, async (chunk) => {
				received.push(chunk);
			});

			expect(received).toHaveLength(1);
			expect(received[0]).toEqual(Buffer.from('hello'));
		});

		it('tracks cumulative offsets correctly across multiple chunks', async () => {
			const stream = Readable.from([Buffer.alloc(10, 'a')]);
			const offsets: number[] = [];

			await processStreamInChunks(stream, 3, async (_chunk, offset) => {
				offsets.push(offset);
			});

			expect(offsets).toEqual([0, 3, 6, 9]);
		});
	});
});
