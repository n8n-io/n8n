import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';
import { NodeApiError, READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { RETURN_ALL_LIMIT } from '../actions/folder/search.operation';
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

const result = (href: string, props: string) => `
  <d:response>
    <d:href>${href}</d:href>
    <d:propstat><d:prop>${props}</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
    <d:propstat><d:prop><nc:upload_time/></d:prop><d:status>HTTP/1.1 404 Not Found</d:status></d:propstat>
  </d:response>`;

const multistatus = (responses: string[]) => `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">${responses.join('')}
</d:multistatus>`;

const pdf = result(
	'/remote.php/dav/files/alice/Finance/2026/invoice%20%231.pdf',
	'<oc:fileid>201</oc:fileid><d:getetag>"e1"</d:getetag><d:getlastmodified>Fri, 20 Nov 2026 12:00:00 GMT</d:getlastmodified><d:getcontentlength>1024</d:getcontentlength><d:getcontenttype>application/pdf</d:getcontenttype><d:resourcetype/><nc:upload_time>1795176000</nc:upload_time>',
);
const folder = result(
	'/remote.php/dav/files/alice/Finance/invoices/',
	'<oc:fileid>202</oc:fileid><d:getetag>"e2"</d:getetag><d:getlastmodified>Fri, 20 Nov 2026 12:00:00 GMT</d:getlastmodified><d:resourcetype><d:collection/></d:resourcetype>',
);

function fakeNextcloud(searchResults: string[] = [pdf, folder], files: string[] = []) {
	const request = vi.fn(async (_credentialType: string, options: RequestOptions) => {
		const uri = String(options.uri);

		if (options.method === 'GET' && uri === `${root}/ocs/v2.php/cloud/user`) {
			return JSON.stringify({ ocs: { data: { id: 'alice' } } });
		}

		if (options.method === 'PROPFIND' && options.headers?.Depth === '0') {
			const resourceType = files.some((file) => uri.endsWith(file))
				? '<d:resourcetype/>'
				: '<d:resourcetype><d:collection/></d:resourcetype>';
			return multistatus([result('/remote.php/webdav/scope', resourceType)]);
		}

		if (options.method === 'SEARCH' && uri === `${root}/remote.php/dav/`) {
			return multistatus(searchResults);
		}

		throw new NodeApiError(node, { message: 'Not Found', httpCode: '404' });
	});

	const searchBody = () =>
		String(request.mock.calls.find(([, options]) => options.method === 'SEARCH')?.[1].body);

	return { request, searchBody };
}

function buildExecuteFunctions(
	parameters: IDataObject,
	request: ReturnType<typeof fakeNextcloud>['request'],
	addExecutionHints = vi.fn(),
) {
	return {
		continueOnFail: () => false,
		getCredentials: async () => ({ webDavUrl, user: 'alice' }),
		getInputData: () => [{ json: {} }],
		getNode: () => node,
		getTimezone: () => 'Europe/Berlin',
		addExecutionHints,
		getNodeParameter: (name: string, _itemIndex: number, fallback?: unknown) => {
			if (name === 'authentication') return 'accessToken';
			const all: IDataObject = { resource: 'folder', operation: 'search', ...parameters };
			return name in all ? all[name] : fallback;
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

describe('NextCloud Node: folder search', () => {
	it('searches the folder with SEARCH on the dav root and returns user-relative paths', async () => {
		const { request, searchBody } = fakeNextcloud();

		const output = await run(
			buildExecuteFunctions({ query: 'invoice', path: '/Finance/', limit: 50 }, request),
		);

		expect(request.mock.calls.map(([, options]) => [options.method, String(options.uri)])).toEqual([
			['PROPFIND', `${webDavUrl}//Finance`],
			['GET', `${root}/ocs/v2.php/cloud/user`],
			['SEARCH', `${root}/remote.php/dav/`],
		]);
		expect(searchBody()).toContain('<d:href>/files/alice/Finance</d:href>');
		expect(searchBody()).toContain('<d:depth>infinity</d:depth>');
		expect(searchBody()).toContain(
			'<d:order><d:prop><d:getlastmodified/></d:prop><d:descending/></d:order>',
		);
		expect(searchBody()).toContain(
			'<d:where><d:like><d:prop><d:displayname/></d:prop><d:literal>%invoice%</d:literal></d:like></d:where>',
		);
		expect(searchBody()).toContain('<d:nresults>51</d:nresults>');
		expect(output).toEqual([
			[
				{
					json: {
						path: 'Finance/2026/invoice #1.pdf',
						fileId: '201',
						lastModified: 'Fri, 20 Nov 2026 12:00:00 GMT',
						contentLength: '1024',
						contentType: 'application/pdf',
						uploadTime: '1795176000',
						type: 'file',
						eTag: 'e1',
					},
					pairedItem: { item: 0 },
				},
				{
					json: {
						path: 'Finance/invoices/',
						fileId: '202',
						lastModified: 'Fri, 20 Nov 2026 12:00:00 GMT',
						type: 'folder',
						eTag: 'e2',
					},
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it.each<[string, IDataObject, string]>([
		[
			'escapes the like wildcards and the XML characters of the query',
			{ query: '50%_<a&b>' },
			'<d:literal>%50\\%\\_&lt;a&amp;b&gt;%</d:literal>',
		],
		[
			'matches the whole name with Exact Name',
			{ query: 'report.pdf', options: { exactName: true } },
			'<d:literal>report.pdf</d:literal>',
		],
		['matches every name for an empty query', { query: '' }, '<d:literal>%</d:literal>'],
		[
			'finds only folders',
			{ filter: { whatToSearch: 'folders' } },
			'</d:like><d:is-collection/></d:and>',
		],
		[
			'finds only files',
			{ filter: { whatToSearch: 'files' } },
			'<d:not><d:is-collection/></d:not>',
		],
		[
			'filters on an exact MIME type',
			{ filter: { mimeType: 'application/pdf' } },
			'<d:eq><d:prop><d:getcontenttype/></d:prop><d:literal>application/pdf</d:literal></d:eq>',
		],
		[
			'filters on a MIME type group',
			{ filter: { mimeType: 'image/*' } },
			'<d:like><d:prop><d:getcontenttype/></d:prop><d:literal>image/%</d:literal></d:like>',
		],
		[
			'sends Modified After as unix seconds in the workflow time zone',
			{ filter: { modifiedAfter: '2026-11-16T00:00:00' } },
			'<d:gt><d:prop><d:getlastmodified/></d:prop><d:literal>1794783600</d:literal></d:gt>',
		],
		[
			'keeps an explicit offset in Modified Before',
			{ filter: { modifiedBefore: '2026-11-20T12:00:00.000Z' } },
			'<d:lt><d:prop><d:getlastmodified/></d:prop><d:literal>1795176000</d:literal></d:lt>',
		],
		[
			'reads a date in the HTTP format that Search returns',
			{ filter: { modifiedBefore: 'Fri, 20 Nov 2026 12:00:00 GMT' } },
			'<d:lt><d:prop><d:getlastmodified/></d:prop><d:literal>1795176000</d:literal></d:lt>',
		],
		[
			'sends Uploaded After on the upload time',
			{ filter: { uploadedAfter: '2026-11-20T12:00:00Z' } },
			'<d:gt><d:prop><nc:upload_time/></d:prop><d:literal>1795176000</d:literal></d:gt>',
		],
		[
			'joins several conditions with and',
			{ query: 'a', filter: { whatToSearch: 'files' } },
			'<d:where><d:and><d:like><d:prop><d:displayname/></d:prop><d:literal>%a%</d:literal></d:like><d:not><d:is-collection/></d:not></d:and></d:where>',
		],
	])('%s', async (_, parameters, expected) => {
		const { request, searchBody } = fakeNextcloud();

		await run(buildExecuteFunctions({ query: '', path: '/Finance', ...parameters }, request));

		expect(searchBody()).toContain(expected);
	});

	it('searches the whole account from the root folder without a scope check', async () => {
		const { request, searchBody } = fakeNextcloud();

		await run(buildExecuteFunctions({ query: 'a', path: '/' }, request));

		expect(request.mock.calls.map(([, options]) => options.method)).toEqual(['GET', 'SEARCH']);
		expect(searchBody()).toContain('<d:href>/files/alice</d:href>');
	});

	it('keeps the user ID and the folder names raw in the scope', async () => {
		const { request, searchBody } = fakeNextcloud();
		request.mockImplementationOnce(async () =>
			multistatus([
				result('/remote.php/webdav/scope', '<d:resourcetype><d:collection/></d:resourcetype>'),
			]),
		);
		request.mockImplementationOnce(async () =>
			JSON.stringify({ ocs: { data: { id: 'alice@example.com' } } }),
		);

		await run(buildExecuteFunctions({ query: 'a', path: '/My Docs/R&D #1' }, request));

		expect(searchBody()).toContain('<d:href>/files/alice@example.com/My Docs/R&amp;D #1</d:href>');
	});

	it.each(['/Finance/..', '/./Finance', '/a/../b'])(
		'rejects the dot segments in "%s" before any request',
		async (path) => {
			const { request } = fakeNextcloud();

			await expect(run(buildExecuteFunctions({ query: 'a', path }, request))).rejects.toThrow(
				'Invalid identifier',
			);
			expect(request).not.toHaveBeenCalled();
		},
	);

	it('checks and searches the same folder for an encoded dot name', async () => {
		const { request, searchBody } = fakeNextcloud();

		await run(buildExecuteFunctions({ query: 'a', path: '/%2e%2e' }, request));

		expect(String(request.mock.calls[0][1].uri)).toBe(`${webDavUrl}//%252e%252e`);
		expect(searchBody()).toContain('<d:href>/files/alice/%2e%2e</d:href>');
	});

	it('fails with a clear message when the folder is a file', async () => {
		const { request } = fakeNextcloud([], ['/Finance/x.pdf']);

		await expect(
			run(buildExecuteFunctions({ query: 'a', path: '/Finance/x.pdf' }, request)),
		).rejects.toThrow('"/Finance/x.pdf" is a file, not a folder');
		expect(request.mock.calls.map(([, options]) => options.method)).toEqual(['PROPFIND']);
	});

	it('fails with a clear message for a date that is not valid', async () => {
		const { request } = fakeNextcloud();

		await expect(
			run(
				buildExecuteFunctions(
					{ query: 'a', path: '/', filter: { modifiedAfter: 'last week' } },
					request,
				),
			),
		).rejects.toThrow('"Modified After" is not a valid date: "last week"');
		expect(request).not.toHaveBeenCalled();
	});

	it.each<[string, IDataObject]>([
		['Search Query', { query: 'a\u000bb' }],
		['MIME Type', { query: 'a', filter: { mimeType: 'text/\u0001plain' } }],
	])('fails before any request when "%s" holds a control character', async (field, parameters) => {
		const { request } = fakeNextcloud();

		await expect(
			run(buildExecuteFunctions({ path: '/Finance', ...parameters }, request)),
		).rejects.toThrow(`"${field}" contains a control character`);
		expect(request).not.toHaveBeenCalled();
	});

	it('keeps the only result, because a SEARCH response has no folder entry', async () => {
		const { request } = fakeNextcloud([pdf]);

		const output = await run(
			buildExecuteFunctions(
				{ query: 'invoice #1.pdf', path: '/', options: { exactName: true } },
				request,
			),
		);

		expect(output[0].map((item) => item.json.path)).toEqual(['Finance/2026/invoice #1.pdf']);
	});

	it('asks for one more result than the limit and returns no more than the limit', async () => {
		const { request, searchBody } = fakeNextcloud();

		const output = await run(buildExecuteFunctions({ query: 'a', path: '/', limit: 1 }, request));

		expect(searchBody()).toContain('<d:nresults>2</d:nresults>');
		expect(output[0]).toHaveLength(1);
	});

	it('returns no items when nothing matches', async () => {
		const { request } = fakeNextcloud([]);

		expect(await run(buildExecuteFunctions({ query: 'none', path: '/' }, request))).toEqual([[]]);
	});

	it('asks for the maximum with Return All and adds a hint when the search hits it', async () => {
		const { request, searchBody } = fakeNextcloud(
			Array.from({ length: RETURN_ALL_LIMIT }, (_, n) =>
				result(`/remote.php/dav/files/alice/f${n}.txt`, '<d:resourcetype/>'),
			),
		);
		const addExecutionHints = vi.fn();

		const output = await run(
			buildExecuteFunctions({ query: 'f', path: '/', returnAll: true }, request, addExecutionHints),
		);

		expect(searchBody()).toContain(`<d:nresults>${RETURN_ALL_LIMIT + 1}</d:nresults>`);
		expect(output[0]).toHaveLength(RETURN_ALL_LIMIT);
		expect(addExecutionHints).toHaveBeenCalledWith({
			message: `The search stopped at ${RETURN_ALL_LIMIT} results. Narrow the search to get the rest.`,
			location: 'outputPane',
		});
	});

	it('adds no hint when Return All gets fewer results than the maximum', async () => {
		const { request } = fakeNextcloud();
		const addExecutionHints = vi.fn();

		await run(
			buildExecuteFunctions({ query: 'a', path: '/', returnAll: true }, request, addExecutionHints),
		);

		expect(addExecutionHints).not.toHaveBeenCalled();
	});

	it('marks the operation as read-only', () => {
		expect(
			resolveNodeAnnotations(new NextCloud().description, {
				parameters: { resource: 'folder', operation: 'search' },
				typeVersion: 1.1,
			}),
		).toEqual(READ_ONLY_ANNOTATIONS);
	});
});
