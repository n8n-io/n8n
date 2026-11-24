import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { NextCloud } from '../NextCloud.node';

const root = 'https://nextcloud.example.com';
const webDavUrl = `${root}/remote.php/webdav`;

const node: INode = {
	id: 'nextcloud-node',
	name: 'Nextcloud',
	type: 'n8n-nodes-base.nextCloud',
	typeVersion: 1.1,
	position: [0, 0],
	parameters: {},
};

interface RequestOptions {
	method: string;
	uri: unknown;
	body?: unknown;
	headers?: IDataObject;
}

interface FakeFile {
	id: string;
	eTag: string;
	content: string;
	folder?: boolean;
}

const itemXml = (hrefRoot: string, path: string, file: FakeFile) => `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:response>
    <d:href>${hrefRoot}/${path.split('/').map(encodeURIComponent).join('/')}</d:href>
    <d:propstat>
      <d:prop>
        <oc:fileid>${file.id}</oc:fileid>
        <d:getetag>"${file.eTag}"</d:getetag>
        <d:getlastmodified>Tue, 24 Nov 2026 10:00:00 GMT</d:getlastmodified>
        <d:getcontentlength>${file.content.length}</d:getcontentlength>
        <d:getcontenttype>text/plain</d:getcontenttype>
        ${file.folder ? '<d:resourcetype><d:collection/></d:resourcetype>' : '<d:resourcetype/>'}
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;

const emptyMultistatus = '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>';

const preconditionFailed = () =>
	new NodeApiError(node, { message: 'Precondition Failed', httpCode: '412' });

/** Keeps files by their path under the user's root, like `docs/notes.txt`. */
function fakeNextcloud(initial: Record<string, Partial<FakeFile>> = { 'docs/notes.txt': {} }) {
	const files = new Map<string, FakeFile>(
		Object.entries(initial).map(([path, file], index) => [
			path,
			{ id: String(42 + index), eTag: `e${42 + index}`, content: 'old', ...file },
		]),
	);
	let nextETag = 100;
	const pathOf = (uri: unknown) =>
		decodeURIComponent(String(uri).slice(webDavUrl.length)).replace(/^\/+/, '');

	const request = vi.fn(async (_credentialType: string, options: RequestOptions) => {
		const uri = String(options.uri);
		const path = pathOf(uri);
		const file = files.get(path);

		if (options.method === 'GET' && uri === `${root}/ocs/v2.php/cloud/user`) {
			return JSON.stringify({ ocs: { data: { id: 'alice' } } });
		}

		if (options.method === 'SEARCH' && uri === `${root}/remote.php/dav/`) {
			const id = /<oc:fileid\/><\/d:prop><d:literal>(\d+)</.exec(String(options.body))?.[1];
			const match = [...files].find(([, candidate]) => candidate.id === id);
			return match ? itemXml('/remote.php/dav/files/alice', ...match) : emptyMultistatus;
		}

		if (options.method === 'PROPFIND' && file) {
			return itemXml('/remote.php/webdav', path, file);
		}

		if (options.method === 'MOVE' && file) {
			const destination = pathOf(options.headers?.Destination);
			if (files.has(destination) && options.headers?.Overwrite === 'F') throw preconditionFailed();
			files.delete(path);
			files.set(destination, file);
			return '';
		}

		if (options.method === 'PUT') {
			const ifMatch = options.headers?.['If-Match'];
			if (ifMatch !== undefined && ifMatch !== `"${file?.eTag}"`) throw preconditionFailed();
			files.set(path, {
				id: file?.id ?? String(nextETag),
				eTag: `e${++nextETag}`,
				content: String(options.body),
			});
			return '';
		}

		throw new NodeApiError(node, { message: 'Not Found', httpCode: '404' });
	});

	const calls = () => request.mock.calls.map(([, options]) => options);

	return { files, request, calls };
}

const byPath = (value: string) => ({ __rl: true, mode: 'path', value });
const byId = (value: string) => ({ __rl: true, mode: 'id', value });

function buildExecuteFunctions(
	parameters: IDataObject,
	request: ReturnType<typeof fakeNextcloud>['request'],
) {
	return {
		continueOnFail: () => false,
		getCredentials: async () => ({ webDavUrl, user: 'alice' }),
		getInputData: () => [{ json: {} }],
		getNode: () => node,
		getNodeParameter: (name: string, _itemIndex: number, fallback?: unknown) => {
			if (name === 'authentication') return 'accessToken';
			const all: IDataObject = { resource: 'file', operation: 'update', ...parameters };
			return name in all ? all[name] : fallback;
		},
		helpers: {
			requestWithAuthentication: request,
			assertBinaryData: (_itemIndex: number, propertyName: string) => {
				if (propertyName !== 'data') {
					throw new NodeOperationError(
						node,
						`This operation expects the node's input data to contain a binary file '${propertyName}', but none was found`,
					);
				}
			},
			getBinaryDataBuffer: async () => Buffer.from('binary content'),
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

describe('NextCloud Node: file update', () => {
	it('replaces the content of a file found by path and sends If-Match with its ETag', async () => {
		const { files, request, calls } = fakeNextcloud();

		const output = await run(
			buildExecuteFunctions(
				{ file: byPath('/docs/notes.txt'), newContent: 'text', fileContent: 'new text' },
				request,
			),
		);

		expect(calls().map((options) => [options.method, String(options.uri)])).toEqual([
			['PROPFIND', `${webDavUrl}//docs/notes.txt`],
			['PUT', `${webDavUrl}//docs/notes.txt`],
			['PROPFIND', `${webDavUrl}//docs/notes.txt`],
		]);
		expect(calls()[0].headers).toMatchObject({ Depth: '0' });
		expect(String(calls()[0].body)).toContain('<d:getetag/>');
		expect(String(calls()[0].body)).toContain('<d:resourcetype/>');
		expect(String(calls()[0].body)).toContain('<nc:upload_time/>');
		expect(calls()[1]).toMatchObject({ body: 'new text', headers: { 'If-Match': '"e42"' } });
		expect(files.get('docs/notes.txt')?.content).toBe('new text');
		expect(output).toEqual([
			[
				{
					json: {
						path: '/docs/notes.txt',
						fileId: '42',
						lastModified: 'Tue, 24 Nov 2026 10:00:00 GMT',
						contentLength: '8',
						contentType: 'text/plain',
						type: 'file',
						eTag: 'e101',
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('replaces the content from an input binary field', async () => {
		const { files, request } = fakeNextcloud();

		await run(
			buildExecuteFunctions(
				{ file: byPath('/docs/notes.txt'), newContent: 'binary', binaryPropertyName: 'data' },
				request,
			),
		);

		expect(files.get('docs/notes.txt')?.content).toBe('binary content');
	});

	it('renames a file in its folder with Overwrite: F and keeps its content', async () => {
		const { files, request, calls } = fakeNextcloud();

		const output = await run(
			buildExecuteFunctions(
				{ file: byPath('/docs/notes.txt'), newFileName: 'renamed notes.txt' },
				request,
			),
		);

		expect(calls().map((options) => options.method)).toEqual(['PROPFIND', 'MOVE', 'PROPFIND']);
		expect(String(calls()[1].uri)).toBe(`${webDavUrl}//docs/notes.txt`);
		expect(calls()[1].headers).toEqual({
			Destination: `${webDavUrl}//docs/renamed%20notes.txt`,
			Overwrite: 'F',
		});
		expect([...files.keys()]).toEqual(['docs/renamed notes.txt']);
		expect(files.get('docs/renamed notes.txt')).toMatchObject({ id: '42', content: 'old' });
		expect(output[0][0].json).toMatchObject({ path: '/docs/renamed notes.txt', fileId: '42' });
	});

	it('renames first, then replaces the content with the ETag the rename kept', async () => {
		const { files, request, calls } = fakeNextcloud();

		await run(
			buildExecuteFunctions(
				{
					file: byPath('/docs/notes.txt'),
					newFileName: 'renamed.txt',
					newContent: 'text',
					fileContent: 'new text',
				},
				request,
			),
		);

		expect(calls().map((options) => [options.method, String(options.uri)])).toEqual([
			['PROPFIND', `${webDavUrl}//docs/notes.txt`],
			['MOVE', `${webDavUrl}//docs/notes.txt`],
			['PUT', `${webDavUrl}//docs/renamed.txt`],
			['PROPFIND', `${webDavUrl}//docs/renamed.txt`],
		]);
		expect(calls()[2].headers).toEqual({ 'If-Match': '"e42"' });
		expect(files.get('docs/renamed.txt')).toMatchObject({ id: '42', content: 'new text' });
	});

	it('finds a file by ID with one SEARCH on oc:fileid, then renames it and replaces the content', async () => {
		const { files, request, calls } = fakeNextcloud();

		const output = await run(
			buildExecuteFunctions(
				{
					file: byId('42'),
					newFileName: 'renamed.txt',
					newContent: 'text',
					fileContent: 'new text',
				},
				request,
			),
		);

		expect(calls().map((options) => [options.method, String(options.uri)])).toEqual([
			['GET', `${root}/ocs/v2.php/cloud/user`],
			['SEARCH', `${root}/remote.php/dav/`],
			['MOVE', `${webDavUrl}//docs/notes.txt`],
			['PUT', `${webDavUrl}//docs/renamed.txt`],
			['PROPFIND', `${webDavUrl}//docs/renamed.txt`],
		]);
		const searchBody = String(calls()[1].body);
		expect(searchBody).toContain('<d:href>/files/alice</d:href>');
		expect(searchBody).toContain(
			'<d:where><d:eq><d:prop><oc:fileid/></d:prop><d:literal>42</d:literal></d:eq></d:where>',
		);
		expect(searchBody).not.toContain('<d:limit>');
		expect(calls()[2].headers).toEqual({
			Destination: `${webDavUrl}//docs/renamed.txt`,
			Overwrite: 'F',
		});
		expect(calls()[3].headers).toEqual({ 'If-Match': '"e42"' });
		expect(files.get('docs/renamed.txt')).toMatchObject({ id: '42', content: 'new text' });
		expect(output[0][0].json).toMatchObject({ path: '/docs/renamed.txt', fileId: '42' });
	});

	it('stops when no file has the ID', async () => {
		const { request, calls } = fakeNextcloud();

		await expect(
			run(buildExecuteFunctions({ file: byId('99'), newFileName: 'x.txt' }, request)),
		).rejects.toThrow('No file has the ID 99');
		expect(calls().map((options) => options.method)).toEqual(['GET', 'SEARCH']);
	});

	it.each(['12abc', '-1', ' '])('rejects the file ID "%s" before any request', async (id) => {
		const { request } = fakeNextcloud();

		await expect(
			run(buildExecuteFunctions({ file: byId(id), newFileName: 'x.txt' }, request)),
		).rejects.toThrow('is not a valid file ID');
		expect(request).not.toHaveBeenCalled();
	});

	it('never creates a missing file: the PROPFIND lookup fails and no PUT is sent', async () => {
		const { files, request, calls } = fakeNextcloud();

		await expect(
			run(
				buildExecuteFunctions(
					{ file: byPath('docs/missing.txt'), newContent: 'text', fileContent: 'new text' },
					request,
				),
			),
		).rejects.toThrow('The file "/docs/missing.txt" does not exist');
		expect(calls().map((options) => options.method)).toEqual(['PROPFIND']);
		expect([...files.keys()]).toEqual(['docs/notes.txt']);
	});

	it('never creates a file that is deleted after the lookup: If-Match makes the PUT fail', async () => {
		const { files, request } = fakeNextcloud();
		const nextcloud = request.getMockImplementation()!;
		request.mockImplementationOnce(async (credentialType, options) => {
			const response = await nextcloud(credentialType, options);
			files.delete('docs/notes.txt');
			return response;
		});

		await expect(
			run(
				buildExecuteFunctions(
					{ file: byPath('/docs/notes.txt'), newContent: 'text', fileContent: 'new text' },
					request,
				),
			),
		).rejects.toThrow(
			'The file "/docs/notes.txt" changed or was deleted while the node was updating it',
		);
		expect(files.size).toBe(0);
	});

	it('names the rename in the error when the content cannot be written after it', async () => {
		const { files, request } = fakeNextcloud();
		const nextcloud = request.getMockImplementation()!;
		request.mockImplementationOnce(async (credentialType, options) => {
			const response = await nextcloud(credentialType, options);
			files.get('docs/notes.txt')!.eTag = 'changed-by-someone';
			return response;
		});

		await expect(
			run(
				buildExecuteFunctions(
					{
						file: byPath('/docs/notes.txt'),
						newFileName: 'renamed.txt',
						newContent: 'text',
						fileContent: 'new text',
					},
					request,
				),
			),
		).rejects.toMatchObject({
			message: 'The file "/docs/renamed.txt" changed or was deleted while the node was updating it',
			description:
				'The file was renamed to "/docs/renamed.txt", but its content was not replaced. Update it at that path.',
		});
		expect(files.get('docs/renamed.txt')?.content).toBe('old');
	});

	it('names the new path when any write error follows a rename', async () => {
		const { files, request } = fakeNextcloud();
		const nextcloud = request.getMockImplementation()!;
		request.mockImplementation(async (credentialType, options) => {
			if (options.method === 'PUT') {
				throw new NodeApiError(node, { message: 'Insufficient Storage', httpCode: '507' });
			}
			return await nextcloud(credentialType, options);
		});

		await expect(
			run(
				buildExecuteFunctions(
					{
						file: byPath('/docs/notes.txt'),
						newFileName: 'renamed.txt',
						newContent: 'text',
						fileContent: 'new text',
					},
					request,
				),
			),
		).rejects.toMatchObject({
			description:
				'The file was renamed to "/docs/renamed.txt", but its content was not replaced. Update it at that path.',
		});
		expect(files.get('docs/renamed.txt')?.content).toBe('old');
	});

	it('passes a write error on unchanged when there was no rename', async () => {
		const { request } = fakeNextcloud();
		const nextcloud = request.getMockImplementation()!;
		const quotaError = new NodeApiError(node, { message: 'Insufficient Storage', httpCode: '507' });
		request.mockImplementation(async (credentialType, options) => {
			if (options.method === 'PUT') throw quotaError;
			return await nextcloud(credentialType, options);
		});

		await expect(
			run(
				buildExecuteFunctions(
					{ file: byPath('/docs/notes.txt'), newContent: 'text', fileContent: 'new text' },
					request,
				),
			),
		).rejects.toBe(quotaError);
	});

	it('stops before any change when the ETag option is stale', async () => {
		const { files, request, calls } = fakeNextcloud();

		await expect(
			run(
				buildExecuteFunctions(
					{
						file: byPath('/docs/notes.txt'),
						newFileName: 'renamed.txt',
						newContent: 'text',
						fileContent: 'new text',
						options: { eTag: 'e1' },
					},
					request,
				),
			),
		).rejects.toThrow('The file "/docs/notes.txt" has changed: its ETag is no longer "e1"');
		expect(calls().map((options) => options.method)).toEqual(['PROPFIND']);
		expect(files.get('docs/notes.txt')?.content).toBe('old');
	});

	it.each(['e42', '"e42"'])('accepts the ETag option %s', async (eTag) => {
		const { files, request } = fakeNextcloud();

		await run(
			buildExecuteFunctions(
				{
					file: byPath('/docs/notes.txt'),
					newContent: 'text',
					fileContent: 'new text',
					options: { eTag },
				},
				request,
			),
		);

		expect(files.get('docs/notes.txt')?.content).toBe('new text');
	});

	it('keeps the other file when the new name is taken', async () => {
		const { files, request, calls } = fakeNextcloud({
			'docs/notes.txt': {},
			'docs/taken.txt': { content: 'other' },
		});

		await expect(
			run(
				buildExecuteFunctions(
					{
						file: byPath('/docs/notes.txt'),
						newFileName: 'taken.txt',
						newContent: 'text',
						fileContent: 'new text',
					},
					request,
				),
			),
		).rejects.toThrow('The folder already has a file or folder named "taken.txt"');
		expect(calls().map((options) => options.method)).toEqual(['PROPFIND', 'MOVE']);
		expect(files.get('docs/notes.txt')?.content).toBe('old');
		expect(files.get('docs/taken.txt')?.content).toBe('other');
	});

	it('stops when the path is a folder', async () => {
		const { request } = fakeNextcloud({ docs: { folder: true } });

		await expect(
			run(buildExecuteFunctions({ file: byPath('/docs'), newFileName: 'x' }, request)),
		).rejects.toThrow('"/docs" is a folder, not a file');
	});

	it('rejects a new name with "/" before any request', async () => {
		const { request } = fakeNextcloud();

		await expect(
			run(
				buildExecuteFunctions(
					{ file: byPath('/docs/notes.txt'), newFileName: 'archive/notes.txt' },
					request,
				),
			),
		).rejects.toThrow('The new file name cannot contain "/"');
		expect(request).not.toHaveBeenCalled();
	});

	it('checks the binary field before the rename', async () => {
		const { request } = fakeNextcloud();

		await expect(
			run(
				buildExecuteFunctions(
					{
						file: byPath('/docs/notes.txt'),
						newFileName: 'renamed.txt',
						newContent: 'binary',
						binaryPropertyName: 'missing',
					},
					request,
				),
			),
		).rejects.toThrow("binary file 'missing'");
		expect(request).not.toHaveBeenCalled();
	});

	it('does not send a MOVE when the new name is the current name', async () => {
		const { request, calls } = fakeNextcloud();

		await run(
			buildExecuteFunctions(
				{
					file: byPath('/docs/notes.txt'),
					newFileName: 'notes.txt',
					newContent: 'text',
					fileContent: 'new text',
				},
				request,
			),
		);

		expect(calls().map((options) => options.method)).toEqual(['PROPFIND', 'PUT', 'PROPFIND']);
	});

	it('asks for File Content as text, so core writes an object as JSON and stops on null', async () => {
		const { request } = fakeNextcloud();
		const executeFunctions = buildExecuteFunctions(
			{ file: byPath('/docs/notes.txt'), newContent: 'text', fileContent: 'new text' },
			request,
		);
		const getNodeParameter = vi.spyOn(executeFunctions, 'getNodeParameter');

		await run(executeFunctions);

		expect(getNodeParameter).toHaveBeenCalledWith('fileContent', 0, '', { ensureType: 'string' });
	});

	it.each([undefined, null])('keeps the name when New File Name is %s', async (newFileName) => {
		const { request, calls } = fakeNextcloud();

		await run(
			buildExecuteFunctions(
				{
					file: byPath('/docs/notes.txt'),
					newFileName,
					newContent: 'text',
					fileContent: 'new text',
				},
				request,
			),
		);

		expect(calls().map((options) => options.method)).toEqual(['PROPFIND', 'PUT', 'PROPFIND']);
	});

	it('says the file was updated when the read after the write fails', async () => {
		const { files, request } = fakeNextcloud();
		const nextcloud = request.getMockImplementation()!;
		request.mockImplementation(async (credentialType, options) => {
			if (options.method === 'PROPFIND' && files.get('docs/notes.txt')?.content === 'new text') {
				throw new NodeApiError(node, { message: 'Service Unavailable', httpCode: '503' });
			}
			return await nextcloud(credentialType, options);
		});

		await expect(
			run(
				buildExecuteFunctions(
					{ file: byPath('/docs/notes.txt'), newContent: 'text', fileContent: 'new text' },
					request,
				),
			),
		).rejects.toMatchObject({
			message: 'Updated the file "/docs/notes.txt", but could not read its details',
			context: expect.objectContaining({ itemIndex: 0 }),
		});
		expect(files.get('docs/notes.txt')?.content).toBe('new text');
	});

	it('returns the file details and writes nothing when nothing changes', async () => {
		const { request, calls } = fakeNextcloud();

		const output = await run(buildExecuteFunctions({ file: byPath('/docs/notes.txt') }, request));

		expect(calls().map((options) => options.method)).toEqual(['PROPFIND']);
		expect(output[0][0].json).toMatchObject({ path: '/docs/notes.txt', fileId: '42', eTag: 'e42' });
	});
});
