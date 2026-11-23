import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

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

/** Keeps files by URL and answers PUT and PROPFIND like Nextcloud does. */
function fakeNextcloud() {
	const files = new Map<string, { id: string; content: string }>();

	const request = vi.fn(async (_credentialType: string, options: RequestOptions) => {
		const uri = String(options.uri);
		const existing = files.get(uri);

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
			expect(options.headers).not.toHaveProperty('If-None-Match');
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
		expect(files.get(notesUri)?.content).toBe('first');
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
});
