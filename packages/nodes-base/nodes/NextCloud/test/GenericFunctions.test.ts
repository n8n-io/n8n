import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INode,
	IPollFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeOperationError, requestPath, requestUrl } from 'n8n-workflow';
import type { Mock } from 'vitest';

import {
	nextCloudApiRequest,
	nextCloudRootUrl,
	nextCloudUserId,
	outputPath,
	parseFolderList,
	webDavPath,
} from '../GenericFunctions';

const webDavUrl = 'https://nextcloud.example.com/remote.php/webdav';
const baseUrl = 'https://nextcloud.example.com';

type Authentication = 'accessToken' | 'oAuth2';

function buildFunctions(authentication: Authentication = 'accessToken') {
	const requestWithAuthentication = vi.fn();
	const getCredentials = vi.fn(async (): Promise<IDataObject> => ({ webDavUrl }));
	const getNodeParameter = vi.fn((parameterName: string) => {
		if (parameterName === 'authentication') return authentication;
		return undefined;
	});

	const functions = {
		getCredentials,
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
		getNodeParameter,
		helpers: {
			requestWithAuthentication,
		},
	} as unknown as IHookFunctions & IExecuteFunctions;

	return { functions, getCredentials, getNodeParameter, requestWithAuthentication };
}

function ocsUser(id: unknown) {
	return JSON.stringify({ ocs: { meta: { status: 'ok', statuscode: 200 }, data: { id } } });
}

function requestOptions(requestWithAuthentication: Mock, callIndex = 0): IDataObject {
	const options = requestWithAuthentication.mock.calls[callIndex][1] as IDataObject;
	return { ...options, uri: String(options.uri) };
}

describe('outputPath', () => {
	it.each([
		['docs/a.txt', '/docs/a.txt'],
		['/docs/sub/', '/docs/sub'],
		['//docs//a.txt', '/docs/a.txt'],
		['', '/'],
	])('turns "%s" into "%s"', (path, expected) => {
		expect(outputPath(path)).toBe(expected);
	});
});

describe('NextCloud GenericFunctions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Request building', () => {
		it('uses access token credentials and builds a WebDAV request by default', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			const response = await nextCloudApiRequest.call(
				functions,
				'GET',
				webDavPath('/test.txt'),
				'',
			);

			expect(response).toEqual({ status: 'ok' });
			expect(getCredentials).toHaveBeenCalledWith('nextCloudApi');
			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'nextCloudApi',
				expect.objectContaining({
					method: 'GET',
					uri: requestUrl`${webDavUrl}//test.txt`,
					body: '',
					headers: undefined,
					qs: {},
					json: false,
				}),
			);
			expect(requestOptions(requestWithAuthentication).uri).toEqual(
				expect.stringContaining('/remote.php/webdav'),
			);
		});

		it('handles non-standard WebDAV URLs gracefully', async () => {
			const customUrl = 'https://custom.example.com/dav';
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: customUrl });
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			await nextCloudApiRequest.call(
				functions,
				'GET',
				webDavPath('/test.txt'),
				'',
				undefined,
				undefined,
				undefined,
				'webdav',
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(`${customUrl}//test.txt`);
			expect(requestOptions(requestWithAuthentication).uri).toEqual(
				expect.stringContaining('/dav'),
			);
		});

		it('uses OAuth2 credentials when OAuth2 authentication is selected', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions('oAuth2');
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			await nextCloudApiRequest.call(functions, 'GET', webDavPath('/test.txt'), '');

			expect(getCredentials).toHaveBeenCalledWith('nextCloudOAuth2Api');
			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'nextCloudOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					uri: requestUrl`${webDavUrl}//test.txt`,
				}),
			);
		});

		it('removes the WebDAV path for OCS requests', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue('<ocs />');

			await nextCloudApiRequest.call(
				functions,
				'POST',
				requestPath`ocs/v1.php/cloud/users`,
				'userid=alice',
				{ 'OCS-APIRequest': true },
				undefined,
				undefined,
				'ocs',
			);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'POST',
				uri: `${baseUrl}/ocs/v1.php/cloud/users`,
				body: 'userid=alice',
				headers: { 'OCS-APIRequest': true },
				qs: {},
				json: false,
			});
			expect(requestOptions(requestWithAuthentication).uri).not.toEqual(
				expect.stringContaining('/remote.php/webdav'),
			);
		});

		it('strips non-standard WebDAV path for OCS requests while preserving subpath', async () => {
			const customUrl = 'https://custom.example.com/nextcloud/remote.php/webdav';
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: customUrl });
			requestWithAuthentication.mockResolvedValue('<ocs />');

			await nextCloudApiRequest.call(
				functions,
				'POST',
				requestPath`ocs/v1.php/cloud/users`,
				'',
				{},
				undefined,
				undefined,
				'ocs',
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(
				'https://custom.example.com/nextcloud/ocs/v1.php/cloud/users',
			);
		});

		it.each([
			['https://nc.example.com/remote.php/dav/files/alice', 'https://nc.example.com'],
			[
				'https://nc.example.com/nextcloud/remote.php/dav/files/alice@example.com/',
				'https://nc.example.com/nextcloud',
			],
		])('strips the dav/files path of %s for OCS requests', async (davUrl, root) => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: davUrl });
			requestWithAuthentication.mockResolvedValue('<ocs />');

			await nextCloudApiRequest.call(
				functions,
				'POST',
				requestPath`ocs/v1.php/cloud/users`,
				'',
				{},
				undefined,
				undefined,
				'ocs',
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(`${root}/ocs/v1.php/cloud/users`);
		});

		it('passes body, headers, query, and null encoding to requestWithAuthentication', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			const body = Buffer.from('file content');
			const headers = { Depth: '0', Destination: `${webDavUrl}//to.txt` };
			const query = { limit: 1 };
			requestWithAuthentication.mockResolvedValue(Buffer.from('response'));

			await nextCloudApiRequest.call(
				functions,
				'PROPFIND' as IHttpRequestMethods,
				webDavPath('/test.txt'),
				body,
				headers,
				null,
				query,
				'webdav',
			);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'PROPFIND',
				uri: `${webDavUrl}//test.txt`,
				body,
				headers,
				encoding: null,
				qs: query,
				json: false,
			});
		});

		it('URL-encodes endpoint characters while preserving path separators', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue({});

			await nextCloudApiRequest.call(
				functions,
				'GET',
				webDavPath('/folder name/test file.txt'),
				'',
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(
				`${webDavUrl}//folder%20name/test%20file.txt`,
			);
		});

		it('throws NodeOperationError when Nextcloud responds with a fatal error page', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue('<b>Fatal error</b> broken response');

			const promise = nextCloudApiRequest.call(functions, 'GET', webDavPath('/test.txt'), '');

			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow("NextCloud responded with a 'Fatal error'");
		});

		it('should encode path values in OCS requests', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue('<ocs />');

			const userId = 'alice/groups';
			await nextCloudApiRequest.call(
				functions,
				'GET',
				requestPath`ocs/v1.php/cloud/users/${userId}`,
				'',
				{},
				undefined,
				undefined,
				'ocs',
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(
				'https://nextcloud.example.com/ocs/v1.php/cloud/users/alice%2Fgroups',
			);
		});

		it('strips standard remote.php/webdav path for OCS requests', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue('<ocs />');

			await nextCloudApiRequest.call(
				functions,
				'POST',
				requestPath`ocs/v1.php/cloud/users`,
				'',
				{},
				undefined,
				undefined,
				'ocs',
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(
				'https://nextcloud.example.com/ocs/v1.php/cloud/users',
			);
		});

		it('handles non-standard WebDAV URLs with subpath gracefully', async () => {
			const customUrl = 'https://custom.example.com/nextcloud/dav';
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: customUrl });
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			await nextCloudApiRequest.call(
				functions,
				'GET',
				webDavPath('/test.txt'),
				'',
				undefined,
				undefined,
				undefined,
				'webdav',
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(`${customUrl}//test.txt`);
			expect(requestOptions(requestWithAuthentication).uri).toEqual(
				expect.stringContaining('/dav'),
			);
		});
	});

	describe('dav endpoint mode', () => {
		it.each([
			'https://nc.example.com/remote.php/webdav',
			'https://nc.example.com/remote.php/webdav/',
			'https://nc.example.com/remote.php/dav/files/alice',
			'https://nc.example.com/remote.php/dav/files/alice/',
		])('builds the same dav files URL from %s', async (credentialUrl) => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: credentialUrl });
			requestWithAuthentication.mockResolvedValue('<d:multistatus />');

			await nextCloudApiRequest.call(
				functions,
				'PROPFIND',
				requestPath`files/${'alice'}/`,
				'',
				{ Depth: '0' },
				undefined,
				undefined,
				'dav',
			);

			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'PROPFIND',
				uri: 'https://nc.example.com/remote.php/dav/files/alice/',
			});
		});

		it('keeps a sub-path and builds the dav root', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({
				webDavUrl: 'https://nc.example.com/nextcloud/remote.php/webdav',
			});
			requestWithAuthentication.mockResolvedValue('<d:multistatus />');

			await nextCloudApiRequest.call(
				functions,
				'SEARCH',
				requestPath``,
				'<d:searchrequest />',
				undefined,
				undefined,
				undefined,
				'dav',
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(
				'https://nc.example.com/nextcloud/remote.php/dav/',
			);
		});
	});

	describe('Context types', () => {
		it('sends requests from poll, webhook and load-options contexts', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue('');
			const poll = functions as unknown as IPollFunctions;
			const webhook = functions as unknown as IWebhookFunctions;
			const loadOptions = functions as unknown as ILoadOptionsFunctions;

			await nextCloudApiRequest.call(poll, 'GET', webDavPath('/a.txt'), '');
			await nextCloudApiRequest.call(webhook, 'GET', webDavPath('/a.txt'), '');
			await nextCloudApiRequest.call(loadOptions, 'GET', webDavPath('/a.txt'), '');

			expect(requestWithAuthentication).toHaveBeenCalledTimes(3);
			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'nextCloudApi',
				expect.objectContaining({ uri: requestUrl`${webDavUrl}//a.txt` }),
			);
		});
	});

	describe('nextCloudUserId', () => {
		it('looks up the uid on the OCS user endpoint', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue(ocsUser('alice'));

			await expect(nextCloudUserId.call(functions)).resolves.toBe('alice');
			expect(requestWithAuthentication).toHaveBeenCalledWith('nextCloudApi', expect.anything());
			expect(requestOptions(requestWithAuthentication)).toMatchObject({
				method: 'GET',
				uri: `${baseUrl}/ocs/v2.php/cloud/user`,
				headers: { 'OCS-APIRequest': true },
				qs: { format: 'json' },
			});
		});

		it('resolves the uid for an OAuth2 credential', async () => {
			const { functions, requestWithAuthentication } = buildFunctions('oAuth2');
			requestWithAuthentication.mockResolvedValue(ocsUser('alice'));

			await expect(nextCloudUserId.call(functions)).resolves.toBe('alice');
			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'nextCloudOAuth2Api',
				expect.anything(),
			);
		});

		it('looks up the uid once per execution', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue(ocsUser('alice'));

			await nextCloudUserId.call(functions);
			await nextCloudUserId.call(functions);

			expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		it('looks up the uid again in a new execution', async () => {
			const first = buildFunctions();
			const second = buildFunctions();
			first.requestWithAuthentication.mockResolvedValue(ocsUser('alice'));
			second.requestWithAuthentication.mockResolvedValue(ocsUser('bob'));

			await expect(nextCloudUserId.call(first.functions)).resolves.toBe('alice');
			await expect(nextCloudUserId.call(second.functions)).resolves.toBe('bob');
		});

		it.each<[Authentication, IDataObject, IDataObject]>([
			['accessToken', { webDavUrl, user: 'alice' }, { webDavUrl, user: 'bob' }],
			[
				'oAuth2',
				{ webDavUrl, oauthTokenData: { access_token: 'token-alice' } },
				{ webDavUrl, oauthTokenData: { access_token: 'token-bob' } },
			],
		])(
			'looks up the uid again after the %s credential is edited',
			async (authentication, before, after) => {
				const { functions, getCredentials, requestWithAuthentication } =
					buildFunctions(authentication);
				requestWithAuthentication
					.mockResolvedValueOnce(ocsUser('alice'))
					.mockResolvedValueOnce(ocsUser('bob'));

				getCredentials.mockResolvedValue(before);
				await expect(nextCloudUserId.call(functions)).resolves.toBe('alice');
				await expect(nextCloudUserId.call(functions)).resolves.toBe('alice');
				getCredentials.mockResolvedValue(after);
				await expect(nextCloudUserId.call(functions)).resolves.toBe('bob');

				expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
			},
		);

		it('does not keep a failed lookup', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication
				.mockRejectedValueOnce(new Error('Request timed out'))
				.mockResolvedValueOnce(ocsUser('alice'));

			await expect(nextCloudUserId.call(functions)).rejects.toThrow('Request timed out');
			await expect(nextCloudUserId.call(functions)).resolves.toBe('alice');
		});

		it.each([
			['no uid', ocsUser(undefined)],
			['an empty uid', ocsUser('')],
			['XML', '<ocs />'],
			['JSON that is not an object', 'null'],
			['no body', undefined],
		])('throws when the response has %s', async (_, response) => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue(response);

			await expect(nextCloudUserId.call(functions)).rejects.toThrow(
				'Could not resolve the Nextcloud user ID',
			);
		});
	});

	describe('webDavPath', () => {
		it.each([
			['/invoices/2024/report Q1.pdf', '//invoices/2024/report%20Q1.pdf'],
			['projects/file1.txt', '/projects/file1.txt'],
			['a//b/', '/a//b/'],
			['', '/'],
			['notes/a?b#c;d.txt', '/notes/a%3Fb%23c%3Bd.txt'],
		])('builds the WebDAV path for "%s"', (path, expected) => {
			expect(webDavPath(path).toString()).toBe(expected);
		});

		it.each([
			['..%2F..%2Focs/x', '/..%252F..%252Focs/x'],
			['%2e%2e/ocs', '/%252e%252e/ocs'],
		])('sends "%s" as entered', (path, expected) => {
			expect(webDavPath(path).toString()).toBe(expected);
		});

		it.each(['a/../../ocs/x', 'a/./b', '../ocs'])('rejects a relative segment in "%s"', (path) => {
			expect(() => webDavPath(path)).toThrow('Invalid identifier');
		});
	});

	describe('parseFolderList', () => {
		const fileProps =
			'<d:getlastmodified>Tue, 02 Jan 2024</d:getlastmodified><d:getcontentlength>1024</d:getcontentlength><d:getcontenttype>text/plain</d:getcontenttype><d:resourcetype></d:resourcetype><d:getetag>"file-etag"</d:getetag>';
		const folderProps =
			'<d:getlastmodified>Mon, 01 Jan 2024</d:getlastmodified><d:resourcetype><d:collection /></d:resourcetype><d:getetag>"folder-etag"</d:getetag>';
		const file = {
			lastModified: 'Tue, 02 Jan 2024',
			contentLength: '1024',
			contentType: 'text/plain',
			type: 'file',
			eTag: 'file-etag',
		};

		const response = (href: string, props: string) => `
  <d:response>
    <d:href>${href}</d:href>
    <d:propstat><d:prop>${props}</d:prop></d:propstat>
  </d:response>`;

		const multistatus = (children: string[]) => `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">${response('/remote.php/webdav/projects/', folderProps)}${children.join('')}
</d:multistatus>`;

		it.each([
			[
				'a standard WebDAV URL',
				[response('/remote.php/webdav/projects/file1.txt', fileProps)],
				[{ path: '/projects/file1.txt', ...file }],
			],
			[
				'a sub-path install',
				[response('/nextcloud/remote.php/webdav/projects/file1.txt', fileProps)],
				[{ path: '/projects/file1.txt', ...file }],
			],
			[
				'a per-user dav URL',
				[response('/remote.php/dav/files/alice/projects/file1.txt', fileProps)],
				[{ path: '/projects/file1.txt', ...file }],
			],
			[
				'a folder entry',
				[response('/remote.php/webdav/projects/archive/', folderProps)],
				[
					{
						path: '/projects/archive',
						lastModified: 'Mon, 01 Jan 2024',
						type: 'folder',
						eTag: 'folder-etag',
					},
				],
			],
			[
				'an encoded name',
				[response('/remote.php/webdav/My%20Folder/a%20b%23c%3F%25d%C3%A9.txt', fileProps)],
				[{ path: '/My Folder/a b#c?%dé.txt', ...file }],
			],
			[
				'an href without a WebDAV root',
				[response('/other/a%20b.txt', fileProps)],
				[{ path: '/other/a b.txt', ...file }],
			],
			['an empty folder', [], []],
		])('parses the folder list for %s', async (_, children, expected) => {
			expect(await parseFolderList(multistatus(children))).toEqual(expected);
		});

		it.each([
			['https://nc.example.com/remote.php/webdav', 'https://nc.example.com'],
			['https://nc.example.com/nextcloud/remote.php/webdav/', 'https://nc.example.com/nextcloud'],
			['https://nc.example.com/remote.php/dav/files/alice', 'https://nc.example.com'],
			[
				'https://nc.example.com/nextcloud/remote.php/dav/files/alice@example.com/',
				'https://nc.example.com/nextcloud',
			],
		])('strips the same WebDAV root from %s and from its hrefs', async (url, root) => {
			const href = `${new URL(url).pathname.replace(/\/*$/, '')}/a.txt`;

			expect(nextCloudRootUrl(url)).toBe(root);
			expect(await parseFolderList(multistatus([response(href, fileProps)]))).toEqual([
				{ path: '/a.txt', ...file },
			]);
		});
	});

	describe('webDavUrl validation', () => {
		it('throws NodeOperationError when webDavUrl is empty', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: '' });
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			const promise = nextCloudApiRequest.call(functions, 'GET', webDavPath('/test.txt'), '');
			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow(
				'Invalid WebDAV URL in credentials: "". The URL must start with https:// or http://.',
			);
		});

		it('throws NodeOperationError when webDavUrl is missing double slash', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: 'http:/localhost:8080/remote.php/webdav' });
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			const promise = nextCloudApiRequest.call(functions, 'GET', webDavPath('/test.txt'), '');
			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow(
				'Invalid WebDAV URL in credentials: "http:/localhost:8080/remote.php/webdav". The URL must start with https:// or http://.',
			);
		});

		it('throws NodeOperationError when webDavUrl is completely malformed', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: 'not-a-url' });
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			const promise = nextCloudApiRequest.call(functions, 'GET', webDavPath('/test.txt'), '');
			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow(
				'Invalid WebDAV URL in credentials: "not-a-url". The URL must start with https:// or http://.',
			);
		});

		it('does not throw when webDavUrl is a valid URL', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({
				webDavUrl: 'https://nextcloud.example.com/remote.php/webdav',
			});
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			await expect(
				nextCloudApiRequest.call(functions, 'GET', webDavPath('/test.txt'), ''),
			).resolves.toEqual({
				status: 'ok',
			});
		});
	});
});
