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
}

const nextCloudNode = new NextCloud();

function buildExecuteFunctions({
	parameters,
	inputData = [{ json: {} }],
	authentication = 'accessToken',
	continueOnFail = false,
}: BuildExecuteFunctionsOptions) {
	const requestWithAuthentication = vi.fn();
	const getCredentials = vi.fn(async () => ({ webDavUrl }));
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
