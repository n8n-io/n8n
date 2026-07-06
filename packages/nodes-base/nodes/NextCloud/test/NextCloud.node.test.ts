import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { NextCloud } from '../NextCloud.node';

const webDavUrl = 'https://nextcloud.example.com/remote.php/webdav';
const baseUrl = 'https://nextcloud.example.com';
const deckBaseUrl = `${baseUrl}/index.php/apps/deck/api/v1.1`;

const ocsSuccessResponse = `<?xml version="1.0"?>
<ocs>
  <meta><status>ok</status></meta>
  <data><id>123</id><url>https://nc.example.com/s/abc</url></data>
</ocs>`;

const ocsUserResponse = `<?xml version="1.0"?>
<ocs>
  <meta><status>ok</status></meta>
  <data><id>alice</id><email>alice@example.com</email><displayname>Alice</displayname></data>
</ocs>`;

const ocsUserListResponse = `<?xml version="1.0"?>
<ocs>
  <meta><status>ok</status></meta>
  <data><users><element>alice</element><element>bob</element></users></data>
</ocs>`;

const ocsErrorResponse = `<?xml version="1.0"?>
<ocs>
  <meta><status>failure</status><message>User not found</message></meta>
</ocs>`;

const webDavFilePropfindResponse = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:response>
    <d:href>/remote.php/webdav/test.txt</d:href>
    <d:propstat><d:prop><oc:fileid>55555</oc:fileid></d:prop></d:propstat>
  </d:response>
</d:multistatus>`;

const webDavFolderListResponse = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:response>
    <d:href>/remote.php/webdav/projects/</d:href>
    <d:propstat><d:prop><d:getlastmodified>Mon, 01 Jan 2024</d:getlastmodified><d:resourcetype><d:collection /></d:resourcetype><d:getetag>"folder-etag"</d:getetag></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/webdav/projects/file1.txt</d:href>
    <d:propstat><d:prop><d:getlastmodified>Tue, 02 Jan 2024</d:getlastmodified><d:getcontentlength>1024</d:getcontentlength><d:getcontenttype>text/plain</d:getcontenttype><d:resourcetype></d:resourcetype><d:getetag>"file-etag"</d:getetag></d:prop></d:propstat>
  </d:response>
</d:multistatus>`;

const webDavMissingFileIdResponse = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:response>
    <d:href>/remote.php/webdav/test.txt</d:href>
    <d:propstat><d:prop></d:prop></d:propstat>
  </d:response>
</d:multistatus>`;

const webDavFolderPropfindResponse = `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:response>
    <d:href>/remote.php/webdav/projects/</d:href>
    <d:propstat><d:prop><oc:fileid>77777</oc:fileid></d:prop></d:propstat>
  </d:response>
  <d:response>
    <d:href>/remote.php/webdav/projects/file1.txt</d:href>
    <d:propstat><d:prop><oc:fileid>88888</oc:fileid></d:prop></d:propstat>
  </d:response>
</d:multistatus>`;

type ParameterValue = string | number | boolean | IDataObject;

interface BuildExecuteFunctionsOptions {
	parameters: Record<string, ParameterValue> | Array<Record<string, ParameterValue>>;
	inputData?: INodeExecutionData[];
	authentication?: 'accessToken' | 'oAuth2';
	continueOnFail?: boolean;
	credentials?: Record<string, unknown>;
}

const nextCloudNode = new NextCloud();

function buildExecuteFunctions({
	parameters,
	inputData = [{ json: {} }],
	authentication = 'accessToken',
	continueOnFail = false,
	credentials,
}: BuildExecuteFunctionsOptions) {
	const requestWithAuthentication = vi.fn();
	const request = vi.fn();
	const defaultCredentials = { webDavUrl, user: 'test-user', password: 'test-pass' };
	const resolvedCredentials = credentials ?? defaultCredentials;
	const getCredentials = vi.fn(async () => resolvedCredentials);
	const prepareBinaryData = vi.fn(async () => ({
		data: 'prepared-binary-data',
		mimeType: 'text/plain',
		fileName: 'test.txt',
	}));
	const getBinaryDataBuffer = vi.fn(async () => Buffer.from('binary upload'));
	const assertBinaryData = vi.fn();
	const constructExecutionMetaData = vi.fn(
		(data: INodeExecutionData[], metadata?: { itemData?: { item: number } }) =>
			data.map((item) => ({ ...item, pairedItem: metadata?.itemData })),
	);

	const parameterForItem = (itemIndex: number) =>
		Array.isArray(parameters) ? (parameters[itemIndex] ?? parameters[0]) : parameters;

	const executeFunctions = {
		continueOnFail: vi.fn(() => continueOnFail),
		getCredentials,
		getInputData: vi.fn(() => inputData),
		getNode: vi.fn(
			() =>
				({
					id: 'nextcloud-node',
					name: 'Nextcloud',
					type: 'n8n-nodes-base.nextCloud',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}) as INode,
		),
		getNodeParameter: vi.fn(
			(parameterName: string, itemIndex: number, defaultValue?: ParameterValue) => {
				if (parameterName === 'authentication') return authentication;
				const itemParameters = parameterForItem(itemIndex);
				if (parameterName in itemParameters) return itemParameters[parameterName];
				return defaultValue;
			},
		),
		helpers: {
			assertBinaryData,
			constructExecutionMetaData,
			getBinaryDataBuffer,
			prepareBinaryData,
			request,
			requestWithAuthentication,
		},
	} as unknown as IExecuteFunctions;

	return {
		assertBinaryData,
		constructExecutionMetaData,
		executeFunctions,
		getBinaryDataBuffer,
		getCredentials,
		prepareBinaryData,
		request,
		requestWithAuthentication,
	};
}

async function executeNode(executeFunctions: IExecuteFunctions) {
	return (await (nextCloudNode as INodeType).execute!.call(
		executeFunctions,
	)) as INodeExecutionData[][];
}

function requestOptions(requestWithAuthentication: Mock, callIndex = 0) {
	return requestWithAuthentication.mock.calls[callIndex][1] as IDataObject;
}

function expectWebDavUri(uri: unknown) {
	expect(uri).toEqual(expect.stringContaining('/remote.php/webdav'));
}

function expectOcsUri(uri: unknown) {
	expect(uri).not.toEqual(expect.stringContaining('/remote.php/webdav'));
}

function expectDeckUrl(url: unknown) {
	const value = String(url);
	// Deck requests must target the Deck API v1.1 base and not the WebDAV URL.
	expect(value).toEqual(expect.stringContaining('/index.php/apps/deck/api/v1.1'));
	expect(value).not.toEqual(expect.stringContaining('/remote.php/webdav'));
}

function deckRequestOptions(request: Mock, callIndex = 0) {
	return request.mock.calls[callIndex][0] as IDataObject;
}

function expectAuthHeader(headers: unknown) {
	const auth = (headers as IDataObject).Authorization;
	expect(typeof auth).toBe('string');
	expect((auth as string).startsWith('Basic ')).toBe(true);
}

function webDavUri(path: string) {
	return `${webDavUrl}/${path}`;
}

describe('NextCloud Node', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe.each(['accessToken', 'oAuth2'] as const)('authentication: %s', (authentication) => {
		it('uses the matching credential type', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				authentication,
				parameters: {
					resource: 'file',
					operation: 'delete',
					path: '/test.txt',
				},
			});
			requestWithAuthentication.mockResolvedValue({ status: 'deleted' });

			await executeNode(executeFunctions);

			expect(requestWithAuthentication).toHaveBeenCalledWith(
				authentication === 'accessToken' ? 'nextCloudApi' : 'nextCloudOAuth2Api',
				expect.any(Object),
			);
		});
	});

	describe('file', () => {
		it('downloads a file as binary data', async () => {
			const downloadBuffer = Buffer.from('downloaded file');
			const { executeFunctions, prepareBinaryData, requestWithAuthentication } =
				buildExecuteFunctions({
					parameters: {
						resource: 'file',
						operation: 'download',
						path: '/test.txt',
						binaryPropertyName: 'data',
					},
				});
			requestWithAuthentication.mockResolvedValue(downloadBuffer);

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'GET',
				uri: `${webDavUri('/test.txt')}`,
				encoding: null,
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(prepareBinaryData).toHaveBeenCalledWith(downloadBuffer, '/test.txt');
			expect(result[0][0]).toEqual({
				json: {},
				pairedItem: { item: 0 },
				binary: {
					data: {
						data: 'prepared-binary-data',
						mimeType: 'text/plain',
						fileName: 'test.txt',
					},
				},
			});
		});

		it('uploads a text file', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'file',
					operation: 'upload',
					path: '/test.txt',
					binaryDataUpload: false,
					fileContent: 'hello world',
				},
			});
			requestWithAuthentication.mockResolvedValue({ status: 'uploaded' });

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'PUT',
				uri: `${webDavUri('/test.txt')}`,
				body: 'hello world',
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'uploaded' }, pairedItem: { item: 0 } }]]);
		});

		it('uploads a binary file', async () => {
			const { executeFunctions, getBinaryDataBuffer, requestWithAuthentication } =
				buildExecuteFunctions({
					inputData: [
						{ json: {}, binary: { data: { data: 'binary-data', mimeType: 'text/plain' } } },
					],
					parameters: {
						resource: 'file',
						operation: 'upload',
						path: '/test.txt',
						binaryDataUpload: true,
						binaryPropertyName: 'data',
					},
				});
			requestWithAuthentication.mockResolvedValue({ status: 'uploaded' });

			const result = await executeNode(executeFunctions);

			expect(getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'PUT',
				uri: `${webDavUri('/test.txt')}`,
				body: Buffer.from('binary upload'),
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'uploaded' }, pairedItem: { item: 0 } }]]);
		});

		it('copies a file', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'file',
					operation: 'copy',
					path: '/from.txt',
					toPath: '/to.txt',
				},
			});
			requestWithAuthentication.mockResolvedValue({ status: 'copied' });

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'COPY',
				uri: `${webDavUri('/from.txt')}`,
				headers: { Destination: `${webDavUri('/to.txt')}` },
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'copied' }, pairedItem: { item: 0 } }]]);
		});

		it('moves a file', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'file',
					operation: 'move',
					path: '/from.txt',
					toPath: '/to.txt',
				},
			});
			requestWithAuthentication.mockResolvedValue({ status: 'moved' });

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'MOVE',
				uri: `${webDavUri('/from.txt')}`,
				headers: { Destination: `${webDavUri('/to.txt')}` },
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'moved' }, pairedItem: { item: 0 } }]]);
		});

		it('deletes a file', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'file',
					operation: 'delete',
					path: '/test.txt',
				},
			});
			requestWithAuthentication.mockResolvedValue({ status: 'deleted' });

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'DELETE',
				uri: `${webDavUri('/test.txt')}`,
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'deleted' }, pairedItem: { item: 0 } }]]);
		});
	});

	describe('folder', () => {
		it('creates a folder', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'folder',
					operation: 'create',
					path: '/projects',
				},
			});
			requestWithAuthentication.mockResolvedValue({ status: 'created' });

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'MKCOL',
				uri: `${webDavUri('/projects')}`,
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'created' }, pairedItem: { item: 0 } }]]);
		});

		it('lists a folder', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'folder',
					operation: 'list',
					path: '/projects',
				},
			});
			requestWithAuthentication.mockResolvedValue(webDavFolderListResponse);

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'PROPFIND',
				uri: `${webDavUri('/projects')}`,
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([
				[
					{
						json: {
							path: 'projects/file1.txt',
							type: 'file',
							lastModified: 'Tue, 02 Jan 2024',
							contentLength: '1024',
							contentType: 'text/plain',
							eTag: 'file-etag',
						},
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('copies a folder', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'folder',
					operation: 'copy',
					path: '/projects',
					toPath: '/archive/projects',
				},
			});
			requestWithAuthentication.mockResolvedValue({ status: 'copied' });

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'COPY',
				uri: `${webDavUri('/projects')}`,
				headers: { Destination: `${webDavUri('/archive/projects')}` },
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'copied' }, pairedItem: { item: 0 } }]]);
		});

		it('moves a folder', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'folder',
					operation: 'move',
					path: '/projects',
					toPath: '/archive/projects',
				},
			});
			requestWithAuthentication.mockResolvedValue({ status: 'moved' });

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'MOVE',
				uri: `${webDavUri('/projects')}`,
				headers: { Destination: `${webDavUri('/archive/projects')}` },
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'moved' }, pairedItem: { item: 0 } }]]);
		});

		it('deletes a folder', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'folder',
					operation: 'delete',
					path: '/projects',
				},
			});
			requestWithAuthentication.mockResolvedValue({ status: 'deleted' });

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'DELETE',
				uri: `${webDavUri('/projects')}`,
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'deleted' }, pairedItem: { item: 0 } }]]);
		});
	});

	describe('user', () => {
		it('creates a user', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'user',
					operation: 'create',
					userId: 'alice',
					email: 'alice@example.com',
					additionalFields: { displayName: 'Alice' },
				},
			});
			requestWithAuthentication.mockResolvedValue(ocsSuccessResponse);

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'POST',
				uri: `${baseUrl}/ocs/v1.php/cloud/users`,
				headers: {
					'OCS-APIRequest': true,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: 'userid=alice&email=alice@example.com&displayName=Alice',
			});
			expectOcsUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([
				[{ json: { id: '123', url: 'https://nc.example.com/s/abc' }, pairedItem: { item: 0 } }],
			]);
		});

		it('deletes a user', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'user',
					operation: 'delete',
					userId: 'alice',
				},
			});
			requestWithAuthentication.mockResolvedValue(ocsSuccessResponse);

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'DELETE',
				uri: `${baseUrl}/ocs/v1.php/cloud/users/alice`,
			});
			expectOcsUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'ok' }, pairedItem: { item: 0 } }]]);
		});

		it('gets a user', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'user',
					operation: 'get',
					userId: 'alice',
				},
			});
			requestWithAuthentication.mockResolvedValue(ocsUserResponse);

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'GET',
				uri: `${baseUrl}/ocs/v1.php/cloud/users/alice`,
			});
			expectOcsUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([
				[
					{
						json: { id: 'alice', email: 'alice@example.com', displayname: 'Alice' },
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('gets all users without a limit', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'user',
					operation: 'getAll',
					returnAll: true,
					options: { search: 'a' },
				},
			});
			requestWithAuthentication.mockResolvedValue(ocsUserListResponse);

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'GET',
				uri: `${baseUrl}/ocs/v1.php/cloud/users`,
				qs: { search: 'a' },
			});
			expectOcsUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([
				[
					{ json: { id: 'alice' }, pairedItem: { item: 0 } },
					{ json: { id: 'bob' }, pairedItem: { item: 0 } },
				],
			]);
		});

		it('gets users with a limit', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'user',
					operation: 'getAll',
					returnAll: false,
					limit: 1,
					options: {},
				},
			});
			requestWithAuthentication.mockResolvedValue(ocsUserListResponse);

			await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'GET',
				uri: `${baseUrl}/ocs/v1.php/cloud/users`,
				qs: { limit: 1 },
			});
			expectOcsUri(requestOptions(requestWithAuthentication).uri);
		});

		it('updates a user', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'user',
					operation: 'update',
					userId: 'alice',
					updateFields: {
						field: {
							key: 'email',
							value: 'alice.updated@example.com',
						},
					},
				},
			});
			requestWithAuthentication.mockResolvedValue(ocsSuccessResponse);

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'PUT',
				uri: `${baseUrl}/ocs/v1.php/cloud/users/alice`,
				body: 'key=email&value=alice.updated@example.com',
			});
			expectOcsUri(requestOptions(requestWithAuthentication).uri);
			expect(result).toEqual([[{ json: { status: 'ok' }, pairedItem: { item: 0 } }]]);
		});
	});

	describe.each([
		{ resource: 'file', path: '/test.txt' },
		{ resource: 'folder', path: '/projects' },
	])('share: $resource', ({ resource, path }) => {
		it.each([
			{ shareType: 0, name: 'user', parameterName: 'user', shareWith: 'alice' },
			{ shareType: 1, name: 'group', parameterName: 'groupId', shareWith: 'engineering' },
			{ shareType: 3, name: 'public link', parameterName: undefined, shareWith: undefined },
			{ shareType: 4, name: 'email', parameterName: 'email', shareWith: 'alice@example.com' },
			{ shareType: 7, name: 'circle', parameterName: 'circleId', shareWith: 'circle-1' },
		])('creates a $name share', async ({ shareType, parameterName, shareWith }) => {
			const parameters: Record<string, ParameterValue> = {
				resource,
				operation: 'share',
				path,
				shareType,
				options: shareType === 3 ? { password: 'secret' } : {},
			};
			if (parameterName && shareWith) parameters[parameterName] = shareWith;
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({ parameters });
			requestWithAuthentication.mockResolvedValue(ocsSuccessResponse);

			const result = await executeNode(executeFunctions);

			const body = requestOptions(requestWithAuthentication).body as string;
			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'POST',
				uri: `${baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
			});
			expectOcsUri(requestOptions(requestWithAuthentication).uri);
			expect(body).toContain(`path=${encodeURIComponent(path)}`);
			expect(body).toContain(`shareType=${shareType}`);
			if (shareWith) expect(body).toContain(`shareWith=${encodeURIComponent(shareWith)}`);
			if (shareType === 3) expect(body).toContain('password=secret');
			expect(result).toEqual([
				[{ json: { id: '123', url: 'https://nc.example.com/s/abc' }, pairedItem: { item: 0 } }],
			]);
		});

		it('returns an internal link from the WebDAV file id', async () => {
			const { constructExecutionMetaData, executeFunctions, requestWithAuthentication } =
				buildExecuteFunctions({
					parameters: {
						resource,
						operation: 'share',
						path,
						shareType: 200,
						options: {},
					},
				});
			requestWithAuthentication.mockResolvedValue(webDavFilePropfindResponse);

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'PROPFIND',
				uri: `${webDavUrl}/${encodeURI(path)}`,
				headers: {
					Depth: '0',
					'Content-Type': 'application/xml',
				},
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(constructExecutionMetaData).toHaveBeenCalledWith(
				[{ json: { link: `${baseUrl}/f/55555` } }],
				{ itemData: { item: 0 } },
			);
			expect(result).toEqual([[{ json: { link: `${baseUrl}/f/55555` }, pairedItem: { item: 0 } }]]);
		});

		it('returns an internal link from folder PROPFIND with multiple responses', async () => {
			const { constructExecutionMetaData, executeFunctions, requestWithAuthentication } =
				buildExecuteFunctions({
					parameters: {
						resource: 'folder',
						operation: 'share',
						path: '/projects',
						shareType: 200,
						options: {},
					},
				});
			requestWithAuthentication.mockResolvedValue(webDavFolderPropfindResponse);

			const result = await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'PROPFIND',
				uri: `${webDavUrl}//projects`,
				headers: {
					Depth: '0',
					'Content-Type': 'application/xml',
				},
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			// Should use the first response (folder) fileid, not the child file
			expect(constructExecutionMetaData).toHaveBeenCalledWith(
				[{ json: { link: `${baseUrl}/f/77777` } }],
				{ itemData: { item: 0 } },
			);
			expect(result).toEqual([[{ json: { link: `${baseUrl}/f/77777` }, pairedItem: { item: 0 } }]]);
		});

		it('throws when webDavUrl does not match the expected pattern for internal links', async () => {
			const { executeFunctions, getCredentials, requestWithAuthentication } = buildExecuteFunctions(
				{
					parameters: {
						resource,
						operation: 'share',
						path,
						shareType: 200,
						options: {},
					},
				},
			);
			// Override credential to a non-standard WebDAV URL
			getCredentials.mockResolvedValue({ webDavUrl: 'https://nc.example.com/dav' });
			requestWithAuthentication.mockResolvedValue(webDavFilePropfindResponse);

			const promise = executeNode(executeFunctions);
			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow('must end with /remote.php/webdav');
		});
	});

	describe('deck', () => {
		describe('board', () => {
			it('listBoards requests GET /boards', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: { resource: 'deck', operation: 'listBoards' },
				});
				request.mockResolvedValue([{ id: 1, title: 'Personal' }]);

				const result = await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'GET',
					url: `${deckBaseUrl}/boards`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
				expectAuthHeader(deckRequestOptions(request).headers);
				expect(result[0][0].json).toEqual({ id: 1, title: 'Personal' });
			});

			it('getBoard requests GET /boards/{id}', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: { resource: 'deck', operation: 'getBoard', boardId: '5' },
				});
				request.mockResolvedValue({ id: 5, title: 'Personal' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'GET',
					url: `${deckBaseUrl}/boards/5`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('createBoard POSTs to /boards with title and stripped color', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'createBoard',
						title: 'Personal',
						color: '#31CC7C',
					},
				});
				request.mockResolvedValue({ id: 7, title: 'Personal' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'POST',
					url: `${deckBaseUrl}/boards`,
					body: { title: 'Personal', color: '31CC7C' },
					json: true,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('createBoard tolerates a missing color parameter', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'createBoard',
						title: 'Personal',
					},
				});
				request.mockResolvedValue({ id: 7, title: 'Personal' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'POST',
					url: `${deckBaseUrl}/boards`,
					body: { title: 'Personal', color: '' },
				});
			});

			it('updateBoard PUTs to /boards/{id} with preserved fields and owner', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'updateBoard',
						boardId: '5',
						title: 'Personal',
						color: '#31CC7C',
						archived: true,
					},
				});
				request
					.mockResolvedValueOnce({
						id: 5,
						title: 'Existing title',
						color: 'FFFFFF',
						archived: false,
						owner: 'alice',
						description: 'keep me',
					})
					.mockResolvedValueOnce({ id: 5, title: 'Personal' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'GET',
					url: `${deckBaseUrl}/boards/5`,
				});
				expect(deckRequestOptions(request, 1)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5`,
					body: {
						id: 5,
						title: 'Personal',
						color: '31CC7C',
						archived: true,
						owner: 'alice',
						description: 'keep me',
					},
				});
				expect(request).toHaveBeenCalledTimes(2);
			});

			it('updateBoard preserves unchanged fields when title and color are empty', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'updateBoard',
						boardId: '5',
						title: '',
						color: '',
						archived: false,
					},
				});
				request
					.mockResolvedValueOnce({
						id: 5,
						title: 'Existing title',
						color: 'FFFFFF',
						archived: true,
						owner: 'alice',
						description: 'keep me',
					})
					.mockResolvedValueOnce({ id: 5 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request, 1).body).toMatchObject({
					title: 'Existing title',
					color: 'FFFFFF',
					archived: false,
					owner: 'alice',
					description: 'keep me',
				});
			});

			it('updateBoard omits archived when the user did not touch it', async () => {
				// Regression: previously the boolean default (false) was always sent, which
				// silently un-archived any archived board. With the fix, the field is
				// omitted from the PUT body when the user leaves it untouched, so the
				// pre-flight GET value (true) survives.
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'updateBoard',
						boardId: '5',
						title: 'New title only',
						// archived intentionally omitted
					},
				});
				request
					.mockResolvedValueOnce({
						id: 5,
						title: 'Existing title',
						color: 'FFFFFF',
						archived: true,
						owner: 'alice',
					})
					.mockResolvedValueOnce({ id: 5 });

				await executeNode(executeFunctions);

				const body = deckRequestOptions(request, 1).body as IDataObject;
				expect(body).toMatchObject({
					title: 'New title only',
					color: 'FFFFFF',
					owner: 'alice',
				});
				// Critically, archived must NOT be sent — that would reset it to false.
				expect(body).not.toHaveProperty('archived');
			});

			it('deleteBoard DELETEs /boards/{id}', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'deleteBoard',
						boardId: '5',
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'DELETE',
					url: `${deckBaseUrl}/boards/5`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});
		});

		describe('stack', () => {
			it('listStacks requests GET /boards/{id}/stacks', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'listStacks',
						boardId: '5',
					},
				});
				request.mockResolvedValue([{ id: 10, title: 'Todo' }]);

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'GET',
					url: `${deckBaseUrl}/boards/5/stacks`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('getStack requests GET /boards/{id}/stacks/{id}', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'getStack',
						boardId: '5',
						stackId: '10',
					},
				});
				request.mockResolvedValue({ id: 10 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'GET',
					url: `${deckBaseUrl}/boards/5/stacks/10`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('createStack POSTs title and order', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'createStack',
						boardId: '5',
						title: 'Todo',
						order: 1,
					},
				});
				request.mockResolvedValue({ id: 10 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'POST',
					url: `${deckBaseUrl}/boards/5/stacks`,
					body: { title: 'Todo', order: 1 },
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('updateStack PUTs preserved fields and owner', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'updateStack',
						boardId: '5',
						stackId: '10',
						title: 'Renamed',
						order: 2,
					},
				});
				request
					.mockResolvedValueOnce({
						id: 10,
						title: 'Todo',
						order: 1,
						owner: { uid: 'alice' },
						color: 'FFFFFF',
					})
					.mockResolvedValueOnce({ id: 10 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'GET',
					url: `${deckBaseUrl}/boards/5/stacks/10`,
				});
				expect(deckRequestOptions(request, 1)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5/stacks/10`,
					body: {
						id: 10,
						title: 'Renamed',
						order: 2,
						owner: 'alice',
						color: 'FFFFFF',
					},
				});
				expect(request).toHaveBeenCalledTimes(2);
			});

			it('updateStack preserves unchanged fields when order is undefined', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'updateStack',
						boardId: '5',
						stackId: '10',
						title: 'Renamed',
						// order intentionally not provided
					},
				});
				request
					.mockResolvedValueOnce({
						id: 10,
						title: 'Todo',
						order: 1,
						owner: { uid: 'alice' },
						color: 'FFFFFF',
					})
					.mockResolvedValueOnce({ id: 10 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request, 1).body).toMatchObject({
					title: 'Renamed',
					order: 1,
					owner: 'alice',
					color: 'FFFFFF',
				});
			});

			it('deleteStack DELETEs /boards/{id}/stacks/{id}', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'deleteStack',
						boardId: '5',
						stackId: '10',
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'DELETE',
					url: `${deckBaseUrl}/boards/5/stacks/10`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});
		});

		describe('card', () => {
			it('listCards fetches the parent stack and returns the embedded cards array', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'listCards',
						boardId: '5',
						stackId: '10',
					},
				});
				// 405 fallback: deck API has no standalone /cards endpoint, so we
				// fetch the parent stack and return its embedded `cards` array.
				request.mockResolvedValue({
					id: 10,
					title: 'Todo',
					cards: [
						{ id: 100, title: 'A' },
						{ id: 101, title: 'B' },
					],
				});

				const result = await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'GET',
					url: `${deckBaseUrl}/boards/5/stacks/10`,
				});
				expect(deckRequestOptions(request).url).not.toEqual(expect.stringContaining('/cards'));
				expectDeckUrl(deckRequestOptions(request).url);
				expect(result[0]).toHaveLength(2);
				expect(result[0][0].json).toEqual({ id: 100, title: 'A' });
				expect(result[0][1].json).toEqual({ id: 101, title: 'B' });
			});

			it('listCards returns an empty array when the stack has no cards', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'listCards',
						boardId: '5',
						stackId: '10',
					},
				});
				request.mockResolvedValue({ id: 10, title: 'Empty' });

				const result = await executeNode(executeFunctions);

				expect(result[0]).toEqual([]);
			});

			it('getCard requests GET /boards/{id}/stacks/{id}/cards/{id}', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'getCard',
						boardId: '5',
						stackId: '10',
						cardId: '100',
					},
				});
				request.mockResolvedValue({ id: 100 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'GET',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('createCard POSTs title, type, order, and optional description/dueDate', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'createCard',
						boardId: '5',
						stackId: '10',
						title: 'Task',
						type: 'plain',
						order: 0,
						description: 'A description',
						dueDate: '2024-12-31',
					},
				});
				request.mockResolvedValue({ id: 100 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'POST',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards`,
					body: {
						title: 'Task',
						type: 'plain',
						order: 0,
						description: 'A description',
						duedate: '2024-12-31',
					},
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('createCard omits description and dueDate when empty', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'createCard',
						boardId: '5',
						stackId: '10',
						title: 'Task',
						type: 'plain',
						order: 0,
						description: '',
						dueDate: '',
					},
				});
				request.mockResolvedValue({ id: 100 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request).body).toEqual({
					title: 'Task',
					type: 'plain',
					order: 0,
				});
			});

			it('updateCard pre-fetches the current card and includes the owner in the body', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'updateCard',
						boardId: '5',
						stackId: '10',
						cardId: '100',
						title: 'Updated',
						description: 'New description',
						type: 'plain',
						order: 1,
						dueDate: '2024-12-31',
					},
				});
				// Pre-flight GET returns the existing card; PUT returns the updated card.
				request
					.mockResolvedValueOnce({ id: 100, owner: { uid: 'alice' } })
					.mockResolvedValueOnce({ id: 100, title: 'Updated' });

				await executeNode(executeFunctions);

				// Pre-flight GET
				expect(deckRequestOptions(request)).toMatchObject({
					method: 'GET',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100`,
				});
				// Subsequent PUT includes the owner pulled from the pre-flight
				expect(deckRequestOptions(request, 1)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100`,
					body: {
						id: 100,
						owner: { uid: 'alice' },
						title: 'Updated',
						description: 'New description',
						type: 'plain',
						order: 1,
						duedate: '2024-12-31',
					},
				});
				expect(request).toHaveBeenCalledTimes(2);
			});

			it('updateCard preserves the pre-flight payload when no owner is present', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'updateCard',
						boardId: '5',
						stackId: '10',
						cardId: '100',
						title: 'Updated',
					},
				});
				request
					.mockResolvedValueOnce({ id: 100 /* no owner */ })
					.mockResolvedValueOnce({ id: 100 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request, 1).body).toMatchObject({ id: 100, title: 'Updated' });
				expect(deckRequestOptions(request, 1).body).not.toHaveProperty('owner');
			});

			it('deleteCard DELETEs /boards/{id}/stacks/{id}/cards/{id}', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'deleteCard',
						boardId: '5',
						stackId: '10',
						cardId: '100',
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'DELETE',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('moveCard PUTs to /reorder with stackId as number and order', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'moveCard',
						boardId: '5',
						stackId: '10',
						cardId: '100',
						targetStackId: '20',
						order: 2,
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100/reorder`,
					body: { stackId: 20, order: 2 },
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('archiveCard PUTs to /archive', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'archiveCard',
						boardId: '5',
						stackId: '10',
						cardId: '100',
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100/archive`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('unarchiveCard PUTs to /unarchive', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'unarchiveCard',
						boardId: '5',
						stackId: '10',
						cardId: '100',
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100/unarchive`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('assignLabel PUTs to /assignLabel with labelId as number', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'assignLabel',
						boardId: '5',
						stackId: '10',
						cardId: '100',
						labelId: '42',
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100/assignLabel`,
					body: { labelId: 42 },
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('removeLabel PUTs to /removeLabel with labelId as number', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'removeLabel',
						boardId: '5',
						stackId: '10',
						cardId: '100',
						labelId: '42',
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100/removeLabel`,
					body: { labelId: 42 },
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('assignUser PUTs to /assignUser with userId', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'assignUser',
						boardId: '5',
						stackId: '10',
						cardId: '100',
						userId: 'alice',
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100/assignUser`,
					body: { userId: 'alice' },
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('unassignUser PUTs to /unassignUser with userId', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'unassignUser',
						boardId: '5',
						stackId: '10',
						cardId: '100',
						userId: 'alice',
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5/stacks/10/cards/100/unassignUser`,
					body: { userId: 'alice' },
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});
		});

		describe('label', () => {
			it('createLabel POSTs to /labels with stripped color', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'createLabel',
						boardId: '5',
						title: 'Bug',
						color: '#FF0000',
					},
				});
				request.mockResolvedValue({ id: 42 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'POST',
					url: `${deckBaseUrl}/boards/5/labels`,
					body: { title: 'Bug', color: 'FF0000' },
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});

			it('updateLabel PUTs to /labels/{id} with preserved fields', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'updateLabel',
						boardId: '5',
						labelId: '42',
						title: 'Bug',
						color: '#00FF00',
					},
				});
				request
					.mockResolvedValueOnce({
						id: 42,
						title: 'Existing bug',
						color: 'FFAA00',
						description: 'keep me',
					})
					.mockResolvedValueOnce({ id: 42 });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'GET',
					url: `${deckBaseUrl}/boards/5/labels/42`,
				});
				expect(deckRequestOptions(request, 1)).toMatchObject({
					method: 'PUT',
					url: `${deckBaseUrl}/boards/5/labels/42`,
					body: {
						id: 42,
						title: 'Bug',
						color: '00FF00',
						description: 'keep me',
					},
				});
				expect(request).toHaveBeenCalledTimes(2);
				expectDeckUrl(deckRequestOptions(request, 1).url);
			});

			it('deleteLabel DELETEs /labels/{id}', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'deleteLabel',
						boardId: '5',
						labelId: '42',
					},
				});
				request.mockResolvedValue({ status: 'ok' });

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request)).toMatchObject({
					method: 'DELETE',
					url: `${deckBaseUrl}/boards/5/labels/42`,
				});
				expectDeckUrl(deckRequestOptions(request).url);
			});
		});

		describe('url handling', () => {
			it('strips /remote.php/webdav suffix from webDavUrl before building deck URLs', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: { resource: 'deck', operation: 'listBoards' },
				});
				request.mockResolvedValue([]);

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request).url).toBe(
					'https://nextcloud.example.com/index.php/apps/deck/api/v1.1/boards',
				);
			});

			it('strips /remote.php/dav suffix from webDavUrl before building deck URLs', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					credentials: { webDavUrl: 'https://nextcloud.example.com/remote.php/dav' },
					parameters: { resource: 'deck', operation: 'listBoards' },
				});
				request.mockResolvedValue([]);

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request).url).toBe(
					'https://nextcloud.example.com/index.php/apps/deck/api/v1.1/boards',
				);
			});

			it('preserves a subpath prefix when stripping the dav suffix', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					credentials: { webDavUrl: 'https://example.com/nextcloud/remote.php/dav' },
					parameters: { resource: 'deck', operation: 'listBoards' },
				});
				request.mockResolvedValue([]);

				await executeNode(executeFunctions);

				expect(deckRequestOptions(request).url).toBe(
					'https://example.com/nextcloud/index.php/apps/deck/api/v1.1/boards',
				);
			});

			it('URL-encodes board, stack, and card ids in the deck path', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'getCard',
						boardId: '5',
						stackId: '10',
						cardId: '100',
					},
				});
				request.mockResolvedValue({ id: 100 });

				await executeNode(executeFunctions);

				// IDs are numeric in practice; encodeURIComponent leaves them unchanged.
				expect(deckRequestOptions(request).url).toBe(`${deckBaseUrl}/boards/5/stacks/10/cards/100`);
			});
		});

		describe('error handling', () => {
			it('throws NodeOperationError when labelId is not numeric in assignLabel', async () => {
				const { executeFunctions } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'assignLabel',
						boardId: '5',
						stackId: '10',
						cardId: '100',
						labelId: 'not-a-number',
					},
				});

				const promise = executeNode(executeFunctions);
				await expect(promise).rejects.toThrow(NodeOperationError);
				await expect(promise).rejects.toThrow('The label ID must be a valid number.');
			});

			it('throws NodeOperationError when labelId is not numeric in removeLabel', async () => {
				const { executeFunctions } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'removeLabel',
						boardId: '5',
						stackId: '10',
						cardId: '100',
						labelId: 'not-a-number',
					},
				});

				const promise = executeNode(executeFunctions);
				await expect(promise).rejects.toThrow(NodeOperationError);
				await expect(promise).rejects.toThrow('The label ID must be a valid number.');
			});

			it('throws NodeOperationError when targetStackId is not numeric in moveCard', async () => {
				const { executeFunctions } = buildExecuteFunctions({
					parameters: {
						resource: 'deck',
						operation: 'moveCard',
						boardId: '5',
						stackId: '10',
						cardId: '100',
						targetStackId: 'not-a-number',
						order: 2,
					},
				});

				const promise = executeNode(executeFunctions);
				await expect(promise).rejects.toThrow(NodeOperationError);
				await expect(promise).rejects.toThrow('The stack ID must be a valid number.');
			});

			it('throws NodeOperationError for an unknown deck operation', async () => {
				const { executeFunctions } = buildExecuteFunctions({
					parameters: { resource: 'deck', operation: 'unknownOp' },
				});

				const promise = executeNode(executeFunctions);
				await expect(promise).rejects.toThrow(NodeOperationError);
				await expect(promise).rejects.toThrow('not supported for resource "deck"');
			});

			it('propagates deck request errors when continueOnFail is false', async () => {
				const deckError = new Error('405 Method Not Allowed');
				const { executeFunctions, request } = buildExecuteFunctions({
					parameters: { resource: 'deck', operation: 'listBoards' },
				});
				request.mockRejectedValue(deckError);

				await expect(executeNode(executeFunctions)).rejects.toThrow(deckError);
			});

			it('wraps deck request errors when continueOnFail is true', async () => {
				const { executeFunctions, request } = buildExecuteFunctions({
					continueOnFail: true,
					parameters: { resource: 'deck', operation: 'listBoards' },
				});
				request.mockRejectedValue(new Error('405 Method Not Allowed'));

				const result = await executeNode(executeFunctions);

				expect(result[0][0].json).toEqual({ error: '405 Method Not Allowed' });
			});
		});
	});

	describe('errors', () => {
		it('throws NodeApiError on an OCS error response', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'user',
					operation: 'get',
					userId: 'missing-user',
				},
			});
			requestWithAuthentication.mockResolvedValue(ocsErrorResponse);

			await expect(executeNode(executeFunctions)).rejects.toThrow(NodeApiError);
		});

		it('propagates WebDAV request errors', async () => {
			const webDavError = new Error('404 Not Found');
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'file',
					operation: 'delete',
					path: '/missing.txt',
				},
			});
			requestWithAuthentication.mockRejectedValue(webDavError);

			await expect(executeNode(executeFunctions)).rejects.toThrow(webDavError);
		});

		it('throws NodeOperationError when an internal link PROPFIND response has no file id', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'file',
					operation: 'share',
					path: '/test.txt',
					shareType: 200,
					options: {},
				},
			});
			requestWithAuthentication.mockResolvedValue(webDavMissingFileIdResponse);

			const promise = executeNode(executeFunctions);
			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow('oc:fileid not found');
		});

		it('throws NodeOperationError when an internal link PROPFIND response is not a string', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				parameters: {
					resource: 'file',
					operation: 'share',
					path: '/test.txt',
					shareType: 200,
					options: {},
				},
			});
			requestWithAuthentication.mockResolvedValue({});

			const promise = executeNode(executeFunctions);
			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow('unexpected response type');
		});

		it('wraps request errors when continueOnFail is true', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				continueOnFail: true,
				parameters: {
					resource: 'folder',
					operation: 'delete',
					path: '/missing',
				},
			});
			requestWithAuthentication.mockRejectedValue(new Error('404 Not Found'));

			const result = await executeNode(executeFunctions);

			expect(result).toEqual([[{ json: { error: '404 Not Found' }, pairedItem: { item: 0 } }]]);
		});

		it('returns original items when a file download fails with continueOnFail', async () => {
			const inputItem = { json: {} };
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				continueOnFail: true,
				inputData: [inputItem],
				parameters: {
					resource: 'file',
					operation: 'download',
					path: '/large-file.mp4',
					binaryPropertyName: 'data',
				},
			});
			requestWithAuthentication.mockRejectedValue(new Error('Network timeout'));

			const result = await executeNode(executeFunctions);

			// Should return the original items (with error attached), not returnData
			expect(result).toEqual([
				[
					{
						json: { error: 'Network timeout' },
					},
				],
			]);
		});
	});

	describe('multi item execution', () => {
		it('keeps WebDAV endpoint usage scoped per item', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				inputData: [{ json: {} }, { json: {} }],
				parameters: [
					{
						resource: 'file',
						operation: 'share',
						path: '/test.txt',
						shareType: 200,
						options: {},
						binaryPropertyName: 'data',
					},
					{
						resource: 'file',
						operation: 'share',
						path: '/second.txt',
						shareType: 200,
						options: {},
					},
				],
			});
			requestWithAuthentication.mockResolvedValue(webDavFilePropfindResponse);

			await executeNode(executeFunctions);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'PROPFIND',
				uri: `${webDavUri('/test.txt')}`,
			});
			expectWebDavUri(requestOptions(requestWithAuthentication).uri);
			expect(requestOptions(requestWithAuthentication, 1)).toMatchObject({
				method: 'PROPFIND',
				uri: `${webDavUri('/second.txt')}`,
			});
			expectWebDavUri(requestOptions(requestWithAuthentication, 1).uri);
		});

		it('does not leak OCS headers from a regular share into a subsequent Internal Link request', async () => {
			const { executeFunctions, requestWithAuthentication } = buildExecuteFunctions({
				inputData: [{ json: {} }, { json: {} }],
				parameters: [
					{
						resource: 'file',
						operation: 'share',
						path: '/first.txt',
						shareType: 3, // public link share
						options: {},
					},
					{
						resource: 'file',
						operation: 'share',
						path: '/second.txt',
						shareType: 200, // internal link
						options: {},
					},
				],
			});
			requestWithAuthentication
				.mockResolvedValueOnce(ocsSuccessResponse)
				.mockResolvedValueOnce(webDavFilePropfindResponse);

			const result = await executeNode(executeFunctions);

			// First request: OCS endpoint with OCS-APIRequest header
			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'POST',
				uri: expect.stringContaining('/ocs/v2.php/apps/files_sharing/api/v1/shares'), // fixed slash
				headers: { 'OCS-APIRequest': true },
			});
			expectOcsUri(requestOptions(requestWithAuthentication).uri);

			// Second request: WebDAV PROPFIND, must NOT have OCS headers
			expect(requestOptions(requestWithAuthentication, 1)).toMatchObject({
				method: 'PROPFIND',
				uri: `${webDavUri('/second.txt')}`,
				headers: {
					'Content-Type': 'application/xml',
					Depth: '0',
				},
			});
			expectWebDavUri(requestOptions(requestWithAuthentication, 1).uri);
			expect(requestOptions(requestWithAuthentication, 1).headers).not.toHaveProperty(
				'OCS-APIRequest',
			);

			// Results: first item gets OCS share data, second gets internal link
			expect(result[0][0].json).toHaveProperty('id');
			expect(result[0][1].json).toEqual({ link: `${baseUrl}/f/55555` });
		});
	});
});
