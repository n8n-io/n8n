import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { Readable } from 'stream';
import { describe, expect, it, vi } from 'vitest';

import { assertPresignedStorageUrl, resolveBinaryUpload } from '../helpers/fileTransfer';

const node = { name: 'monday.com', type: 'CUSTOM.monday', typeVersion: 2 } as INode;

describe('assertPresignedStorageUrl', () => {
	it('accepts the URL shapes monday mints (raw S3 presign and CloudFront rewrite)', () => {
		expect(() =>
			assertPresignedStorageUrl(
				node,
				'https://bulk-import-bucket.s3.us-east-1.amazonaws.com/jobs/1.csv?X-Amz-Signature=abc',
				'upload',
				0,
			),
		).not.toThrow();
		expect(() =>
			assertPresignedStorageUrl(
				node,
				'https://bulk-import-euc1.monday.com/jobs/1.csv?X-Amz-Signature=abc',
				'report',
				0,
			),
		).not.toThrow();
	});

	it('rejects non-https and malformed URLs', () => {
		expect(() =>
			assertPresignedStorageUrl(node, 'http://bucket.s3.amazonaws.com/key', 'upload', 0),
		).toThrow(/unexpected upload URL/);
		expect(() => assertPresignedStorageUrl(node, 'not a url', 'report', 0)).toThrow(
			/invalid report URL/,
		);
	});

	it('rejects hosts outside the storage domains', () => {
		expect(() =>
			assertPresignedStorageUrl(node, 'https://evil.example.com/key', 'upload', 0),
		).toThrow(/unexpected upload URL/);
		expect(() =>
			assertPresignedStorageUrl(node, 'https://monday.com.evil.example/key', 'upload', 0),
		).toThrow(/unexpected upload URL/);
	});

	it('rejects IP literals, userinfo, and non-default ports', () => {
		for (const url of [
			'https://169.254.169.254/latest/meta-data',
			'https://[::1]/key',
			'https://user:pass@bulk-import-use1.monday.com/key',
			'https://bulk-import-use1.monday.com:8443/key',
		]) {
			expect(() => assertPresignedStorageUrl(node, url, 'upload', 0)).toThrow(
				/unexpected upload URL/,
			);
		}
	});

	it('accepts any https host when the allow-list is empty', () => {
		expect(() =>
			assertPresignedStorageUrl(node, 'https://storage.example.com/key', 'upload', 0, []),
		).not.toThrow();
	});

	it('enforces a custom host allow-list', () => {
		const allowed = ['s3.amazonaws.com'];
		expect(() =>
			assertPresignedStorageUrl(node, 'https://bucket.s3.amazonaws.com/key', 'upload', 0, allowed),
		).not.toThrow();
		expect(() =>
			assertPresignedStorageUrl(node, 'https://s3.amazonaws.com/bucket/key', 'upload', 0, allowed),
		).not.toThrow();
		expect(() =>
			assertPresignedStorageUrl(node, 'https://evil.example.com/key', 'upload', 0, allowed),
		).toThrow(/unexpected upload URL/);
		// A lookalike host must not pass on a plain substring match.
		expect(() =>
			assertPresignedStorageUrl(
				node,
				'https://nots3.amazonaws.com.evil.example/key',
				'upload',
				0,
				allowed,
			),
		).toThrow(/unexpected upload URL/);
	});
});

describe('resolveBinaryUpload', () => {
	function makeContext(binaryData: Record<string, unknown>) {
		const stream = Readable.from([Buffer.from('a,b\n1,2\n')]);
		const helpers = {
			assertBinaryData: vi.fn(() => binaryData),
			getBinaryStream: vi.fn(async () => stream),
			getBinaryMetadata: vi.fn(async () => ({ fileSize: 8, mimeType: 'text/csv' })),
		};
		return { context: { helpers } as unknown as IExecuteFunctions, helpers, stream };
	}

	it('streams files stored by the binary data manager', async () => {
		const { context, helpers, stream } = makeContext({
			id: 'filesystem:abc',
			data: '',
			fileName: 'rows.csv',
			mimeType: 'text/csv',
		});
		const upload = await resolveBinaryUpload(context, 0, 'data');
		expect(upload.body).toBe(stream);
		expect(upload.contentLength).toBe(8);
		expect(upload.fileName).toBe('rows.csv');
		expect(upload.mimeType).toBe('text/csv');
		expect(helpers.getBinaryStream).toHaveBeenCalledWith('filesystem:abc');
	});

	it('decodes inline base64 payloads into a Buffer', async () => {
		const { context, helpers } = makeContext({
			data: Buffer.from('hello').toString('base64'),
			mimeType: 'text/plain',
		});
		const upload = await resolveBinaryUpload(context, 0, 'data');
		expect(Buffer.isBuffer(upload.body)).toBe(true);
		expect((upload.body as Buffer).toString()).toBe('hello');
		expect(upload.contentLength).toBe(5);
		expect(upload.fileName).toBe('file');
		expect(helpers.getBinaryStream).not.toHaveBeenCalled();
	});
});
