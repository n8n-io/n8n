import { createHash } from 'node:crypto';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	decodeXmlEntities,
	encodeS3Key,
	escapeXml,
	formatBucketName,
	isLocalStackHealthy,
	LocalStackHelper,
	S3Client,
	S3Error,
	validateBucketName,
} from '../services/localstack';

const ENDPOINT = 'http://127.0.0.1:4566';

function xmlResponse(xml: string, status = 200): Response {
	return new Response(xml, { status, headers: { 'content-type': 'application/xml' } });
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('isLocalStackHealthy', () => {
	test.each([
		{
			scenario: 'both services available',
			body: JSON.stringify({ services: { secretsmanager: 'available', s3: 'available' } }),
		},
		{
			scenario: 'services already running on a reused container',
			body: JSON.stringify({ services: { secretsmanager: 'running', s3: 'available' } }),
		},
		{
			scenario: 'both services running',
			body: JSON.stringify({ services: { secretsmanager: 'running', s3: 'running' } }),
		},
	])('returns true when $scenario', ({ body }) => {
		expect(isLocalStackHealthy(body)).toBe(true);
	});

	test.each([
		{
			scenario: 's3 is still starting',
			body: JSON.stringify({ services: { secretsmanager: 'available', s3: 'starting' } }),
		},
		{
			scenario: 's3 is missing',
			body: JSON.stringify({ services: { secretsmanager: 'available' } }),
		},
		{
			scenario: 'secretsmanager is missing',
			body: JSON.stringify({ services: { s3: 'available' } }),
		},
		{ scenario: 'services key is absent', body: JSON.stringify({}) },
		{ scenario: 'payload is null', body: 'null' },
		{ scenario: 'payload is invalid JSON', body: 'not-json' },
	])('returns false when $scenario', ({ body }) => {
		expect(isLocalStackHealthy(body)).toBe(false);
	});
});

describe('bucket name validation and generation', () => {
	test.each(['abc', 'n8n-test-1', 'bucket.with-dots.1', 'a'.repeat(63)])(
		'accepts valid bucket name: %s',
		(name) => {
			expect(() => validateBucketName(name)).not.toThrow();
		},
	);

	test.each([
		'',
		'ab',
		'a'.repeat(64),
		'UpperCase',
		'under_score',
		'-leading-hyphen',
		'trailing-hyphen-',
		'.leading-dot',
		'trailing-dot.',
		'double..dot',
		'192.168.1.1',
	])('rejects invalid bucket name: %s', (name) => {
		expect(() => validateBucketName(name)).toThrow(/Invalid S3 bucket name/);
	});

	test('normalizes arbitrary prefixes into valid isolated bucket names', () => {
		expect(formatBucketName('My_Test Stack!', 'AB12')).toBe('my-test-stack-ab12');
		expect(formatBucketName('---!!!---', 'abc123')).toBe('bucket-abc123');
	});

	test('truncates long prefixes to fit the 63-character S3 limit without trailing hyphens', () => {
		const bucket = formatBucketName(`${'a'.repeat(53)}-tail`, '12345678');

		expect(bucket.length).toBeLessThanOrEqual(63);
		expect(bucket).toBe(`${'a'.repeat(53)}-12345678`);
	});

	test('rejects suffixes without alphanumeric characters', () => {
		expect(() => formatBucketName('n8n-test', '---')).toThrow(/suffix/i);
	});
});

describe('S3 key encoding and XML helpers', () => {
	test('encodes path segments with RFC 3986 while keeping slashes', () => {
		expect(encodeS3Key("workflows/a b+c/file!(1)'*.bin")).toBe(
			'workflows/a%20b%2Bc/file%21%281%29%27%2A.bin',
		);
	});

	test('rejects an empty object key', () => {
		expect(() => encodeS3Key('')).toThrow(/must not be empty/);
	});

	test('decodes XML entities in one pass without double-decoding', () => {
		expect(decodeXmlEntities('a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos; &#x2F; &#38;')).toBe(
			'a & b <c> "d" \'e\' / &',
		);
		expect(decodeXmlEntities('&amp;lt;')).toBe('&lt;');
	});

	test('escapes XML special characters', () => {
		expect(escapeXml('a & b <c> "d" \'e\'')).toBe(
			'a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;',
		);
	});
});

describe('S3Client', () => {
	test('follows ListObjectsV2 pagination and decodes XML-escaped keys', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				xmlResponse(`
					<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
						<IsTruncated>true</IsTruncated>
						<NextContinuationToken>token+1/2=</NextContinuationToken>
						<Contents>
							<Key>dir/a &amp; b.bin</Key>
							<Size>12</Size>
							<ETag>&quot;etag-1&quot;</ETag>
							<LastModified>2026-11-25T10:00:00.000Z</LastModified>
						</Contents>
					</ListBucketResult>
				`),
			)
			.mockResolvedValueOnce(
				xmlResponse(`
					<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
						<IsTruncated>false</IsTruncated>
						<Contents>
							<Key>dir/second.bin</Key>
							<Size>34</Size>
						</Contents>
					</ListBucketResult>
				`),
			);
		vi.stubGlobal('fetch', fetchMock);

		const objects = await new S3Client(ENDPOINT).listObjects('test-bucket', 'dir/');

		expect(objects).toEqual([
			{
				key: 'dir/a & b.bin',
				size: 12,
				eTag: '"etag-1"',
				lastModified: '2026-11-25T10:00:00.000Z',
			},
			{
				key: 'dir/second.bin',
				size: 34,
				eTag: undefined,
				lastModified: undefined,
			},
		]);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/test-bucket?list-type=2&prefix=dir%2F`);
		expect(fetchMock.mock.calls[1][0]).toBe(
			`${ENDPOINT}/test-bucket?continuation-token=token%2B1%2F2%3D&list-type=2&prefix=dir%2F`,
		);
	});

	test('chunks deleteObjects into 1000-key batches with matching Content-MD5 headers', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockImplementation(async () => xmlResponse('<DeleteResult/>'));
		vi.stubGlobal('fetch', fetchMock);

		const keys = Array.from({ length: 1002 }, (_, index) => `item-${index}&x`);
		await new S3Client(ENDPOINT).deleteObjects('test-bucket', keys);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		const firstCall = fetchMock.mock.calls[0];
		const secondCall = fetchMock.mock.calls[1];
		expect(firstCall[0]).toBe(`${ENDPOINT}/test-bucket?delete=`);

		const firstBody = firstCall[1]?.body as Uint8Array;
		const secondBody = secondCall[1]?.body as Uint8Array;
		const firstHeaders = firstCall[1]?.headers as Record<string, string>;

		expect(firstHeaders['content-md5']).toBe(createHash('md5').update(firstBody).digest('base64'));
		expect(firstHeaders.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=test\//);
		expect(new TextDecoder().decode(firstBody)).toContain('<Key>item-0&amp;x</Key>');
		expect(new TextDecoder().decode(firstBody).match(/<Object>/g)).toHaveLength(1000);
		expect(new TextDecoder().decode(secondBody).match(/<Object>/g)).toHaveLength(2);
	});

	test('throws when DeleteObjects reports per-key errors in a 200 response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn<typeof fetch>().mockResolvedValue(
				xmlResponse(`
					<DeleteResult>
						<Error>
							<Key>locked/file.bin</Key>
							<Code>AccessDenied</Code>
							<Message>Denied</Message>
						</Error>
					</DeleteResult>
				`),
			),
		);

		await expect(
			new S3Client(ENDPOINT).deleteObjects('test-bucket', ['locked/file.bin']),
		).rejects.toThrow(/Failed to delete 1 of 1 objects from 'test-bucket': locked\/file\.bin/);
	});

	test('force-deletes a bucket by emptying objects first and ignores NoSuchBucket', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				xmlResponse(`
					<ListBucketResult>
						<IsTruncated>false</IsTruncated>
						<Contents><Key>a.bin</Key><Size>1</Size></Contents>
					</ListBucketResult>
				`),
			)
			.mockResolvedValueOnce(xmlResponse('<DeleteResult/>'))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetchMock);

		const client = new S3Client(ENDPOINT);
		await client.deleteBucket('test-bucket');

		expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual(['GET', 'POST', 'DELETE']);

		fetchMock.mockReset();
		fetchMock
			.mockResolvedValueOnce(
				xmlResponse('<Error><Code>NoSuchBucket</Code><Message>Missing</Message></Error>', 404),
			)
			.mockResolvedValueOnce(
				xmlResponse('<Error><Code>NoSuchBucket</Code><Message>Missing</Message></Error>', 404),
			);

		await expect(client.deleteBucket('missing-bucket')).resolves.toBeUndefined();
	});

	test('skips emptying when deleteBucket is called with force: false', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				xmlResponse(
					'<Error><Code>BucketNotEmpty</Code><Message>The bucket is not empty</Message></Error>',
					409,
				),
			);
		vi.stubGlobal('fetch', fetchMock);

		await expect(
			new S3Client(ENDPOINT).deleteBucket('test-bucket', { force: false }),
		).rejects.toMatchObject({
			name: 'S3Error',
			status: 409,
			code: 'BucketNotEmpty',
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
	});

	test('clear lists all buckets and deletes each one', async () => {
		const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			if (init?.method === 'GET' && url === `${ENDPOINT}/`) {
				return xmlResponse(`
						<ListAllMyBucketsResult>
							<Buckets>
								<Bucket><Name>bucket-one</Name></Bucket>
								<Bucket><Name>bucket-two</Name></Bucket>
							</Buckets>
						</ListAllMyBucketsResult>
					`);
			}
			if (init?.method === 'GET') {
				return xmlResponse('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>');
			}
			return new Response(null, { status: 204 });
		});
		vi.stubGlobal('fetch', fetchMock);

		await new S3Client(ENDPOINT).clear();

		const deletedUrls = fetchMock.mock.calls
			.filter(([, init]) => init?.method === 'DELETE')
			.map(([url]) => url)
			.sort();
		expect(deletedUrls).toEqual([`${ENDPOINT}/bucket-one`, `${ENDPOINT}/bucket-two`]);
	});

	test('bucketExists and objectExists return false on 404 and rethrow server errors', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response(null, { status: 200 }))
			.mockResolvedValueOnce(new Response(null, { status: 404 }))
			.mockResolvedValueOnce(new Response(null, { status: 404 }))
			.mockResolvedValueOnce(new Response(null, { status: 500 }));
		vi.stubGlobal('fetch', fetchMock);

		const client = new S3Client(ENDPOINT);
		await expect(client.bucketExists('test-bucket')).resolves.toBe(true);
		await expect(client.bucketExists('test-bucket')).resolves.toBe(false);
		await expect(client.objectExists('test-bucket', 'missing.bin')).resolves.toBe(false);
		await expect(client.objectExists('test-bucket', 'broken.bin')).rejects.toBeInstanceOf(S3Error);
	});

	test('createBucket treats BucketAlreadyOwnedByYou as idempotent and sends LocationConstraint outside us-east-1', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				xmlResponse(
					'<Error><Code>BucketAlreadyOwnedByYou</Code><Message>Already owned</Message></Error>',
					409,
				),
			);
		vi.stubGlobal('fetch', fetchMock);

		await expect(
			new S3Client(ENDPOINT, { region: 'eu-west-1' }).createBucket('test-bucket'),
		).resolves.toBeUndefined();

		const body = new TextDecoder().decode(fetchMock.mock.calls[0][1]?.body as Uint8Array);
		expect(body).toContain('<LocationConstraint>eu-west-1</LocationConstraint>');
	});
});

describe('LocalStackHelper', () => {
	test('builds container-side and external n8n S3 environment variables without protocol in host', () => {
		const helper = new LocalStackHelper({
			endpoint: 'http://127.0.0.1:32768',
			internalEndpoint: 'http://localstack:4566',
			host: '127.0.0.1:32768',
			internalHost: 'localstack:4566',
			protocol: 'http',
			region: 'us-east-1',
			credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
		});

		expect(helper.getN8nS3Env('n8n-binary-test')).toEqual({
			N8N_EXTERNAL_STORAGE_S3_HOST: 'localstack:4566',
			N8N_EXTERNAL_STORAGE_S3_PROTOCOL: 'http',
			N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME: 'n8n-binary-test',
			N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION: 'us-east-1',
			N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY: 'test',
			N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET: 'test',
			N8N_EXTERNAL_STORAGE_S3_FORCE_PATH_STYLE: 'true',
		});

		expect(helper.getN8nS3Env('n8n-binary-test', { external: true })).toMatchObject({
			N8N_EXTERNAL_STORAGE_S3_HOST: '127.0.0.1:32768',
			N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME: 'n8n-binary-test',
		});
		expect(helper.s3Config.endpoint).toBe('http://127.0.0.1:32768');
		expect(helper.internalS3Config.endpoint).toBe('http://localstack:4566');
	});

	test('rejects invalid bucket names in getN8nS3Env', () => {
		const helper = new LocalStackHelper('http://127.0.0.1:4566');

		expect(() => helper.getN8nS3Env('Invalid_Bucket')).toThrow(/Invalid S3 bucket name/);
	});
});
