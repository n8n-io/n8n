import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { nameWithSuffix, nextSuffix } from '../actions/file/createFromText.operation';
import { NextCloud } from '../NextCloud.node';

const webDavUrl = 'https://nextcloud.example.com/remote.php/webdav';

const node: INode = {
	id: 'nextcloud-node',
	name: 'Nextcloud',
	type: 'n8n-nodes-base.nextCloud',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

interface RequestOptions {
	method: string;
	uri: unknown;
	body?: unknown;
	headers?: IDataObject;
}

function fakeNextcloud() {
	const files = new Map<string, { id: string; content: string }>();
	const href = (uri: string) => `/remote.php/webdav${uri.slice(webDavUrl.length)}`;

	const request = vi.fn(async (_credentialType: string, options: RequestOptions) => {
		const uri = String(options.uri);
		const existing = files.get(uri);

		if (options.method === 'PROPFIND' && options.headers?.Depth === '1') {
			const children = [...files.keys()]
				.filter((file) => file.startsWith(`${uri}/`) && !file.slice(uri.length + 1).includes('/'))
				.map((file) => `<d:response><d:href>${href(file)}</d:href></d:response>`);
			return `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">
  <d:response><d:href>${href(uri)}/</d:href></d:response>
  ${children.join('\n  ')}
</d:multistatus>`;
		}

		if (options.method === 'PUT') {
			if (options.headers?.['If-None-Match'] === '*' && existing) {
				throw new NodeApiError(node, { message: 'Precondition Failed', httpCode: '412' });
			}
			files.set(uri, {
				id: existing?.id ?? String(1000 + files.size),
				content: String(options.body),
			});
			return '';
		}

		if (options.method === 'PROPFIND' && existing) {
			return `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:response>
    <d:href>/remote.php/webdav/docs/notes.txt</d:href>
    <d:propstat>
      <d:prop>
        <oc:fileid>${existing.id}</oc:fileid>
        <d:getetag>"etag-${existing.id}"</d:getetag>
        <d:getlastmodified>Mon, 23 Nov 2026 10:00:00 GMT</d:getlastmodified>
        <d:getcontentlength>${existing.content.length}</d:getcontentlength>
        <d:getcontenttype>text/plain</d:getcontenttype>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;
		}

		throw new NodeApiError(node, { message: 'Not Found', httpCode: '404' });
	});

	return { files, request };
}

function buildExecuteFunctions(
	parameterSets: IDataObject[],
	request: ReturnType<typeof fakeNextcloud>['request'],
	continueOnFail = false,
) {
	return {
		continueOnFail: () => continueOnFail,
		getCredentials: async () => ({ webDavUrl }),
		getInputData: () => parameterSets.map(() => ({ json: {} })),
		getNode: () => node,
		getNodeParameter: (name: string, itemIndex: number, fallback?: unknown) => {
			if (name === 'authentication') return 'accessToken';
			const parameters: IDataObject = {
				resource: 'file',
				operation: 'createFromText',
				...parameterSets[itemIndex],
			};
			return name in parameters ? parameters[name] : fallback;
		},
		helpers: {
			requestWithAuthentication: request,
			constructExecutionMetaData: (
				data: INodeExecutionData[],
				metadata: { itemData: { item: number } },
			) => data.map((item) => ({ ...item, pairedItem: metadata.itemData })),
		},
	} as unknown as IExecuteFunctions;
}

async function run(executeFunctions: IExecuteFunctions) {
	return (await (new NextCloud() as INodeType).execute!.call(
		executeFunctions,
	)) as INodeExecutionData[][];
}

const notesUri = `${webDavUrl}//docs/notes.txt`;

describe('nameWithSuffix', () => {
	it.each([
		['notes.txt', 'notes (2).txt'],
		['archive.tar.gz', 'archive.tar (2).gz'],
		['README', 'README (2)'],
		['.env', '.env (2)'],
	])('turns %s into %s', (fileName, expected) => {
		expect(nameWithSuffix(fileName, 2)).toBe(expected);
	});
});

describe('nextSuffix', () => {
	it.each([
		['an empty folder', 'notes.txt', [], 2],
		['no copies', 'notes.txt', ['notes.txt'], 2],
		['a gap', 'notes.txt', ['notes.txt', 'notes (3).txt'], 4],
		['two-digit numbers', 'notes.txt', ['notes (9).txt', 'notes (10).txt'], 11],
		[
			'only other names',
			'notes.txt',
			['notes (x).txt', 'notes (-1).txt', 'notes (7).md', 'notes (5)', 'other (9).txt'],
			2,
		],
		['a name with no extension', 'README', ['README', 'README (4)', 'README (5).md'], 5],
		['a name with a leading dot', '.env', ['.env', '.env (2)'], 3],
	])('handles %s', (_, fileName, names, expected) => {
		expect(nextSuffix(fileName, names)).toBe(expected);
	});
});

describe('NextCloud Node: file createFromText', () => {
	it('writes the text and returns the new file metadata with the file ID', async () => {
		const { files, request } = fakeNextcloud();

		const result = await run(
			buildExecuteFunctions(
				[{ content: 'hello', fileName: 'notes.txt', parentFolder: '/docs', ifFileExists: 'fail' }],
				request,
			),
		);

		expect(files.get(notesUri)?.content).toBe('hello');
		expect(request.mock.calls[1][1]).toMatchObject({
			method: 'PROPFIND',
			headers: { Depth: '0' },
			body: expect.stringContaining('<oc:fileid/>'),
		});
		expect(result).toEqual([
			[
				{
					json: {
						fileId: '1000',
						path: '/docs/notes.txt',
						eTag: 'etag-1000',
						lastModified: 'Mon, 23 Nov 2026 10:00:00 GMT',
						contentLength: '5',
						contentType: 'text/plain',
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('replaces the file on a second write to the same name with Overwrite', async () => {
		const { files, request } = fakeNextcloud();
		const parameters = { fileName: 'notes.txt', parentFolder: '/docs/', ifFileExists: 'overwrite' };

		const result = await run(
			buildExecuteFunctions(
				[
					{ ...parameters, content: 'first' },
					{ ...parameters, content: 'second' },
				],
				request,
			),
		);

		const puts = request.mock.calls.filter(([, options]) => options.method === 'PUT');
		expect(puts).toHaveLength(2);
		puts.forEach(([, options]) => {
			expect(String(options.uri)).toBe(notesUri);
			expect(options.headers?.['If-None-Match']).toBeUndefined();
		});
		expect(files.get(notesUri)?.content).toBe('second');
		expect(result[0].map((item) => item.json.fileId)).toEqual(['1000', '1000']);
	});

	it('keeps the file and names the path on a second write to the same name with Fail', async () => {
		const { files, request } = fakeNextcloud();
		const parameters = { fileName: 'notes.txt', parentFolder: '/docs', ifFileExists: 'fail' };

		const execution = run(
			buildExecuteFunctions(
				[
					{ ...parameters, content: 'first' },
					{ ...parameters, content: 'second' },
				],
				request,
			),
		);

		await expect(execution).rejects.toThrow(NodeOperationError);
		await expect(execution).rejects.toThrow('The file "/docs/notes.txt" already exists');
		const puts = request.mock.calls.filter(([, options]) => options.method === 'PUT');
		expect(puts).toHaveLength(2);
		puts.forEach(([, options]) => {
			expect(options.headers).toEqual({ 'If-None-Match': '*' });
		});
		expect(request.mock.calls.some(([, options]) => options.headers?.Depth === '1')).toBe(false);
		expect(files.get(notesUri)?.content).toBe('first');
	});

	it('keeps every file on repeated writes to the same name with Add Suffix', async () => {
		const { files, request } = fakeNextcloud();
		const parameters = { fileName: 'notes.txt', parentFolder: '/docs', ifFileExists: 'addSuffix' };

		const result = await run(
			buildExecuteFunctions(
				[
					{ ...parameters, content: 'first' },
					{ ...parameters, content: 'second' },
					{ ...parameters, content: 'third' },
				],
				request,
			),
		);

		expect(Object.fromEntries([...files].map(([uri, file]) => [uri, file.content]))).toEqual({
			[notesUri]: 'first',
			[`${webDavUrl}//docs/notes%20(2).txt`]: 'second',
			[`${webDavUrl}//docs/notes%20(3).txt`]: 'third',
		});
		expect(result[0].map((item) => item.json.path)).toEqual([
			'/docs/notes.txt',
			'/docs/notes (2).txt',
			'/docs/notes (3).txt',
		]);
		expect(result[0].map((item) => item.json.fileId)).toEqual(['1000', '1001', '1002']);

		const puts = request.mock.calls.filter(([, options]) => options.method === 'PUT');
		// The third write lists the folder and does not try "notes (2).txt" again
		expect(puts.map(([, options]) => String(options.uri).slice(webDavUrl.length))).toEqual([
			'//docs/notes.txt',
			'//docs/notes.txt',
			'//docs/notes%20(2).txt',
			'//docs/notes.txt',
			'//docs/notes%20(3).txt',
		]);
		puts.forEach(([, options]) => {
			expect(options.headers).toEqual({ 'If-None-Match': '*' });
		});
	});

	it('lists the folder once and writes one number above the highest copy', async () => {
		const { files, request } = fakeNextcloud();
		files.set(notesUri, { id: '1', content: '' });
		files.set(`${webDavUrl}//docs/notes%20(3).txt`, { id: '3', content: '' });

		const result = await run(
			buildExecuteFunctions(
				[{ content: 'x', fileName: 'notes.txt', parentFolder: '/docs', ifFileExists: 'addSuffix' }],
				request,
			),
		);

		expect(result[0][0].json.path).toBe('/docs/notes (4).txt');
		expect(request.mock.calls.filter(([, options]) => options.headers?.Depth === '1')).toHaveLength(
			1,
		);
	});

	it('tries the next number when another writer takes the chosen name first', async () => {
		const { files, request } = fakeNextcloud();
		files.set(notesUri, { id: '1', content: '' });
		const answer = request.getMockImplementation()!;
		request.mockImplementation(async (credentialType, options) => {
			const uri = String(options.uri);
			if (options.method === 'PUT' && uri.endsWith('notes%20(2).txt') && !files.has(uri)) {
				files.set(uri, { id: '2', content: 'other writer' });
			}
			return await answer(credentialType, options);
		});

		const result = await run(
			buildExecuteFunctions(
				[{ content: 'x', fileName: 'notes.txt', parentFolder: '/docs', ifFileExists: 'addSuffix' }],
				request,
			),
		);

		expect(result[0][0].json.path).toBe('/docs/notes (3).txt');
		expect(files.get(`${webDavUrl}//docs/notes%20(2).txt`)?.content).toBe('other writer');
	});

	it('stops after a few tries when other writers keep taking the names', async () => {
		const { request } = fakeNextcloud();
		const answer = request.getMockImplementation()!;
		request.mockImplementation(async (credentialType, options) => {
			if (options.method === 'PUT') {
				throw new NodeApiError(node, { message: 'Precondition Failed', httpCode: '412' });
			}
			return await answer(credentialType, options);
		});

		await expect(
			run(
				buildExecuteFunctions(
					[
						{
							content: 'x',
							fileName: 'notes.txt',
							parentFolder: '/docs',
							ifFileExists: 'addSuffix',
						},
					],
					request,
				),
			),
		).rejects.toThrow('Could not find a free name for "/docs/notes.txt"');
		const puts = request.mock.calls.filter(([, options]) => options.method === 'PUT');
		expect(puts).toHaveLength(6);
		expect(String(puts[5][1].uri)).toBe(`${webDavUrl}//docs/notes%20(6).txt`);
	});

	it('returns the error as an item when Continue On Fail is on', async () => {
		const { request } = fakeNextcloud();
		const parameters = { fileName: 'notes.txt', parentFolder: '/docs', ifFileExists: 'fail' };

		const result = await run(
			buildExecuteFunctions(
				[
					{ ...parameters, content: 'first' },
					{ ...parameters, content: 'second' },
				],
				request,
				true,
			),
		);

		expect(result[0][1]).toEqual({
			json: { error: 'The file "/docs/notes.txt" already exists' },
			pairedItem: { item: 1 },
		});
	});

	it('creates the file in the root folder', async () => {
		const { files, request } = fakeNextcloud();

		const result = await run(
			buildExecuteFunctions(
				[{ content: 'hello', fileName: 'notes.txt', parentFolder: '/', ifFileExists: 'fail' }],
				request,
			),
		);

		// Same URL as Upload with the path "/notes.txt"
		expect([...files.keys()]).toEqual([`${webDavUrl}//notes.txt`]);
		expect(result[0][0].json.path).toBe('/notes.txt');
	});

	it('passes errors other than 412 through', async () => {
		const { request } = fakeNextcloud();
		request.mockRejectedValueOnce(new NodeApiError(node, { message: 'Conflict', httpCode: '409' }));

		await expect(
			run(
				buildExecuteFunctions(
					[
						{
							content: 'hello',
							fileName: 'notes.txt',
							parentFolder: '/missing',
							ifFileExists: 'fail',
						},
					],
					request,
				),
			),
		).rejects.toThrow(NodeApiError);
	});

	it('rejects a file name with a slash before it sends a request', async () => {
		const { request } = fakeNextcloud();

		await expect(
			run(
				buildExecuteFunctions(
					[
						{
							content: 'hello',
							fileName: 'a/notes.txt',
							parentFolder: '/docs',
							ifFileExists: 'fail',
						},
					],
					request,
				),
			),
		).rejects.toThrow('The file name cannot contain "/"');
		expect(request).not.toHaveBeenCalled();
	});

	it('rejects an empty file name before it sends a request', async () => {
		const { request } = fakeNextcloud();

		await expect(
			run(
				buildExecuteFunctions(
					[{ content: 'hello', fileName: '', parentFolder: '/docs', ifFileExists: 'fail' }],
					request,
				),
			),
		).rejects.toThrow();
		expect(request).not.toHaveBeenCalled();
	});

	it.each([
		['an empty body', ''],
		['an HTML page', '<html><body>Login</body></html>'],
		[
			'a multistatus without a file ID',
			'<d:multistatus xmlns:d="DAV:"><d:response><d:propstat><d:prop><d:getetag>"e"</d:getetag></d:prop></d:propstat></d:response></d:multistatus>',
		],
	])('fails with a clear error when the PROPFIND answer is %s', async (_, body) => {
		const { request } = fakeNextcloud();
		const answer = request.getMockImplementation()!;
		request.mockImplementation(async (credentialType, options) =>
			options.method === 'PROPFIND' ? body : await answer(credentialType, options),
		);

		await expect(
			run(
				buildExecuteFunctions(
					[
						{
							content: 'hello',
							fileName: 'notes.txt',
							parentFolder: '/docs',
							ifFileExists: 'fail',
						},
					],
					request,
				),
			),
		).rejects.toThrow('Created the file "/docs/notes.txt", but could not read its file ID');
	});
});
