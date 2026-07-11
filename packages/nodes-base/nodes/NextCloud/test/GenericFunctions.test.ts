import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	INode,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { nextCloudApiRequest } from '../GenericFunctions';

const webDavUrl = 'https://nextcloud.example.com/remote.php/webdav';
const baseUrl = 'https://nextcloud.example.com';

type Authentication = 'accessToken' | 'oAuth2';

function buildFunctions(authentication: Authentication = 'accessToken') {
	const requestWithAuthentication = vi.fn();
	const getCredentials = vi.fn(async () => ({ webDavUrl }));
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

function requestOptions(requestWithAuthentication: Mock, callIndex = 0) {
	return requestWithAuthentication.mock.calls[callIndex][1] as IDataObject;
}

describe('NextCloud GenericFunctions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Request building', () => {
		it('uses access token credentials and builds a WebDAV request by default', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			const response = await nextCloudApiRequest.call(functions, 'GET', '/test.txt', '');

			expect(response).toEqual({ status: 'ok' });
			expect(getCredentials).toHaveBeenCalledWith('nextCloudApi');
			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'nextCloudApi',
				expect.objectContaining({
					method: 'GET',
					uri: `${webDavUrl}//test.txt`,
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
				'/test.txt',
				'',
				undefined,
				undefined,
				undefined,
				true,
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(`${customUrl}//test.txt`);
			expect(requestOptions(requestWithAuthentication).uri).toEqual(
				expect.stringContaining('/dav'),
			);
		});

		it('uses OAuth2 credentials when OAuth2 authentication is selected', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions('oAuth2');
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			await nextCloudApiRequest.call(functions, 'GET', '/test.txt', '');

			expect(getCredentials).toHaveBeenCalledWith('nextCloudOAuth2Api');
			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'nextCloudOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					uri: `${webDavUrl}//test.txt`,
				}),
			);
		});

		it('removes the WebDAV path for OCS requests', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue('<ocs />');

			await nextCloudApiRequest.call(
				functions,
				'POST',
				'ocs/v1.php/cloud/users',
				'userid=alice',
				{ 'OCS-APIRequest': true },
				undefined,
				undefined,
				false,
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
				'ocs/v1.php/cloud/users',
				'',
				{},
				undefined,
				undefined,
				false,
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(
				'https://custom.example.com/nextcloud/ocs/v1.php/cloud/users',
			);
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
				'/test.txt',
				body,
				headers,
				null,
				query,
				true,
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

			await nextCloudApiRequest.call(functions, 'GET', '/folder name/test file.txt', '');

			expect(requestOptions(requestWithAuthentication).uri).toBe(
				`${webDavUrl}//folder%20name/test%20file.txt`,
			);
		});

		it('throws NodeOperationError when Nextcloud responds with a fatal error page', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue('<b>Fatal error</b> broken response');

			const promise = nextCloudApiRequest.call(functions, 'GET', '/test.txt', '');

			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow("NextCloud responded with a 'Fatal error'");
		});

		it('strips standard remote.php/webdav path for OCS requests', async () => {
			const { functions, requestWithAuthentication } = buildFunctions();
			requestWithAuthentication.mockResolvedValue('<ocs />');

			await nextCloudApiRequest.call(
				functions,
				'POST',
				'ocs/v1.php/cloud/users',
				'',
				{},
				undefined,
				undefined,
				false,
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
				'/test.txt',
				'',
				undefined,
				undefined,
				undefined,
				true,
			);

			expect(requestOptions(requestWithAuthentication).uri).toBe(`${customUrl}//test.txt`);
			expect(requestOptions(requestWithAuthentication).uri).toEqual(
				expect.stringContaining('/dav'),
			);
		});
	});

	describe('webDavUrl validation', () => {
		it('throws NodeOperationError when webDavUrl is empty', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: '' });
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			const promise = nextCloudApiRequest.call(functions, 'GET', '/test.txt', '');
			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow(
				'Invalid WebDAV URL in credentials: "". The URL must start with https:// or http://.',
			);
		});

		it('throws NodeOperationError when webDavUrl is missing double slash', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: 'http:/localhost:8080/remote.php/webdav' });
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			const promise = nextCloudApiRequest.call(functions, 'GET', '/test.txt', '');
			await expect(promise).rejects.toThrow(NodeOperationError);
			await expect(promise).rejects.toThrow(
				'Invalid WebDAV URL in credentials: "http:/localhost:8080/remote.php/webdav". The URL must start with https:// or http://.',
			);
		});

		it('throws NodeOperationError when webDavUrl is completely malformed', async () => {
			const { functions, getCredentials, requestWithAuthentication } = buildFunctions();
			getCredentials.mockResolvedValue({ webDavUrl: 'not-a-url' });
			requestWithAuthentication.mockResolvedValue({ status: 'ok' });

			const promise = nextCloudApiRequest.call(functions, 'GET', '/test.txt', '');
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

			await expect(nextCloudApiRequest.call(functions, 'GET', '/test.txt', '')).resolves.toEqual({
				status: 'ok',
			});
		});
	});
});
