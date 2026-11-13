import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';
import { getRequestHelperFunctions } from 'n8n-core/dist/execution-engine/node-execution-context/utils/request-helper-functions';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INode,
	INodeParameters,
	IWorkflowExecuteAdditionalData,
	JsonObject,
	Workflow,
} from 'n8n-workflow';
import { jsonParse, NodeApiError, ObservableObject } from 'n8n-workflow';
import nock from 'nock';
import { mock, mockDeep } from 'vitest-mock-extended';

import { GithubAppApi } from '../../../credentials/GithubAppApi.credentials';
import { Github } from '../Github.node';
import { pullRequestCache } from '../pull-request-cache';

const server = 'https://api.github.com';
const endpoint = '/repos/test-owner/test-repo/pulls';
const pullRequest = { number: 42, title: 'Update documentation', state: 'open' };
const etag = 'W/"pull-request-v1"';

describe('GitHub conditional pull request reads', () => {
	let staticData: IDataObject;

	function createContext(parameters: INodeParameters = {}, credentialId = 'github-credential') {
		const context = mockDeep<IExecuteFunctions>();
		const params: INodeParameters = {
			authentication: 'accessToken',
			resource: 'pullRequest',
			operation: 'get',
			owner: 'test-owner',
			repository: 'test-repo',
			pullRequestNumber: 42,
			getRepositoryPullRequestsFilters: {},
			returnAll: false,
			limit: 10,
			...parameters,
		};
		context.getNodeParameter.mockImplementation((name, _index, fallback) =>
			Object.prototype.hasOwnProperty.call(params, name) ? params[name] : fallback,
		);
		context.getNode.mockReturnValue(
			mock<INode>({
				name: 'GitHub',
				credentials: { githubApi: { id: credentialId, name: 'GitHub' } },
			}),
		);
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getCredentials.mockResolvedValue({ server });
		context.getWorkflowStaticData.mockImplementation(() => staticData);
		context.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		context.helpers.constructExecutionMetaData.mockImplementation((data, { itemData }) =>
			data.map((item) => ({ ...item, pairedItem: itemData })),
		);
		const client = Container.get(OutboundHttp).requests({ useDefaultSsrfPolicy: 'unsafe' });
		context.helpers.httpRequestWithAuthentication.mockImplementation(async (_type, options) => {
			try {
				return await client.request({ ...options, url: String(options.url) });
			} catch (error) {
				throw new NodeApiError(context.getNode(), error as JsonObject);
			}
		});
		context.helpers.requestWithAuthentication.mockImplementation(async (_type, options) => {
			try {
				return await client.requestLegacy({
					...options,
					uri: options.uri === undefined ? undefined : String(options.uri),
					url: options.url === undefined ? undefined : String(options.url),
				});
			} catch (error) {
				throw new NodeApiError(context.getNode(), error as JsonObject);
			}
		});
		return context;
	}

	async function execute(parameters: INodeParameters = {}) {
		return await new Github().execute.call(createContext(parameters));
	}

	beforeEach(() => {
		pullRequestCache.clear();
		staticData = {};
	});

	afterEach(() => {
		const pending = nock.pendingMocks();
		nock.cleanAll();
		vi.restoreAllMocks();
		expect(pending).toEqual([]);
	});

	function useGitHubAppAuthentication(context: ReturnType<typeof createContext>) {
		const credentials: ICredentialDataDecryptedObject = {
			server,
			appId: '123',
			installationId: '456',
			privateKey: 'test-key',
			accessToken: 'stored-token',
		};
		const node = context.getNode();
		node.credentials = { githubAppApi: { id: 'app-credential', name: 'GitHub App' } };
		const getNodeParameter = context.getNodeParameter.getMockImplementation()!;
		context.getNodeParameter.mockImplementation((name, index, fallback) =>
			name === 'authentication' ? 'githubAppApi' : getNodeParameter(name, index, fallback),
		);
		context.getCredentials.mockResolvedValue(credentials);
		const additionalData = mockDeep<IWorkflowExecuteAdditionalData>();
		additionalData.evalLlmMockHandler = undefined;
		additionalData.credentialsHelper.getParentTypes.mockReturnValue([]);
		const credentialWrites = vi.fn();
		const app = new GithubAppApi();
		additionalData.credentialsHelper.preAuthentication.mockImplementation(
			async (requestContext, data, _type, _node, credentialsExpired) => {
				if (data.accessToken && !credentialsExpired) return undefined;
				const updated = await app.preAuthentication.call(requestContext, data);
				credentialWrites(updated);
				return updated;
			},
		);
		additionalData.credentialsHelper.authenticate.mockImplementation(
			async (data, _type, options) => ({
				...(options as IHttpRequestOptions),
				headers: { ...options.headers, Authorization: `Bearer ${data.accessToken}` },
			}),
		);
		const helpers = getRequestHelperFunctions(mock<Workflow>(), node, additionalData);
		context.helpers.httpRequest.mockImplementation(helpers.httpRequest);
		context.helpers.httpRequestWithAuthentication.mockImplementation(
			helpers.httpRequestWithAuthentication,
		);
		context.helpers.requestWithAuthentication.mockImplementation(helpers.requestWithAuthentication);
		return {
			credentialWrites,
			preAuthentication: additionalData.credentialsHelper.preAuthentication,
		};
	}

	it('revalidates a GitHub App read once without refreshing a stored token', async () => {
		const context = createContext();
		const { credentialWrites, preAuthentication } = useGitHubAppAuthentication(context);
		nock(server)
			.matchHeader('authorization', 'Bearer stored-token')
			.get(`${endpoint}/42`)
			.reply(200, pullRequest, { ETag: etag });
		const firstOutput = await new Github().execute.call(context);
		preAuthentication.mockClear();
		nock(server)
			.matchHeader('authorization', 'Bearer stored-token')
			.matchHeader('if-none-match', etag)
			.get(`${endpoint}/42`)
			.reply(304);

		expect(await new Github().execute.call(context)).toEqual(firstOutput);
		expect(preAuthentication).toHaveBeenCalledTimes(1);
		expect(preAuthentication).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.anything(),
			'githubAppApi',
			context.getNode(),
			false,
		);
		expect(credentialWrites).not.toHaveBeenCalled();
	});

	it('refreshes a GitHub App token after a 401 and revalidates the cached body', async () => {
		vi.spyOn(jwt, 'sign').mockImplementation(() => 'test-app-jwt');
		const context = createContext();
		const { credentialWrites } = useGitHubAppAuthentication(context);
		nock(server).get(`${endpoint}/42`).reply(200, pullRequest, { ETag: etag });
		const firstOutput = await new Github().execute.call(context);
		nock(server)
			.matchHeader('authorization', 'Bearer stored-token')
			.matchHeader('if-none-match', etag)
			.get(`${endpoint}/42`)
			.reply(401, { message: 'Token expired' });
		nock(server)
			.matchHeader('authorization', 'Bearer test-app-jwt')
			.post('/app/installations/456/access_tokens')
			.reply(201, { token: 'refreshed-token' });
		nock(server)
			.matchHeader('authorization', 'Bearer refreshed-token')
			.matchHeader('if-none-match', etag)
			.get(`${endpoint}/42`)
			.reply(304);

		expect(await new Github().execute.call(context)).toEqual(firstOutput);
		expect(credentialWrites).toHaveBeenCalledTimes(1);
	});

	it.each([true, false])(
		'keeps a newer cursor when an older read finishes last (ETag: %s)',
		async (hasEtag) => {
			const stored = { global: { cursor: 'old' }, 'node:GitHub': {} };
			const olderSnapshot = ObservableObject.create(jsonParse<IDataObject>(JSON.stringify(stored)));
			const newerSnapshot = ObservableObject.create(jsonParse<IDataObject>(JSON.stringify(stored)));
			const olderContext = createContext();
			olderContext.getWorkflowStaticData.mockReturnValue(
				olderSnapshot['node:GitHub'] as IDataObject,
			);
			nock(server)
				.get(`${endpoint}/42`)
				.reply(200, pullRequest, hasEtag ? { ETag: etag } : {});
			const olderRead = new Github().execute.call(olderContext);
			(newerSnapshot.global as IDataObject).cursor = 'new';
			let persisted = newerSnapshot;
			await olderRead;
			if (olderSnapshot.__dataChanged) persisted = olderSnapshot;

			expect(olderSnapshot.__dataChanged).toBe(false);
			expect(persisted.global).toEqual({ cursor: 'new' });
		},
	);

	it.each([
		{ resource: 'pullRequest', operation: 'get', path: `${endpoint}/42`, body: pullRequest },
		{
			resource: 'repository',
			operation: 'getPullRequests',
			path: endpoint,
			body: [pullRequest],
		},
	])('returns identical output after a 304 for $resource:$operation', async (testCase) => {
		const { resource, operation, path, body } = testCase;
		nock(server).get(path).query(true).reply(200, body, { ETag: etag });
		const firstOutput = await execute({ resource, operation });
		expect(firstOutput[0].map((item) => item.json)).toEqual([pullRequest]);
		// Each execution loads its own static-data snapshot.
		staticData = jsonParse<IDataObject>(JSON.stringify(staticData));
		nock(server).matchHeader('if-none-match', etag).get(path).query(true).reply(304);

		expect(await execute({ resource, operation })).toEqual(firstOutput);
	});

	it('revalidates every page and keeps pagination links when 304 omits them', async () => {
		const params = { resource: 'repository', operation: 'getPullRequests', returnAll: true };
		const secondPullRequest = { ...pullRequest, number: 43 };
		nock(server)
			.get(endpoint)
			.query({ per_page: 100, page: 1 })
			.reply(200, [pullRequest], { ETag: etag, Link: `<${server}${endpoint}?page=2>; rel="next"` })
			.get(endpoint)
			.query({ per_page: 100, page: 2 })
			.reply(200, [secondPullRequest], { ETag: '"page-2"' });
		const firstOutput = await execute(params);
		expect(firstOutput[0].map((item) => item.json)).toEqual([pullRequest, secondPullRequest]);
		nock(server)
			.get(endpoint)
			.query({ per_page: 100, page: 1 })
			.matchHeader('if-none-match', etag)
			.reply(304)
			.get(endpoint)
			.query({ per_page: 100, page: 2 })
			.matchHeader('if-none-match', '"page-2"')
			.reply(304);

		expect(await execute(params)).toEqual(firstOutput);
	});

	it('replaces the cached body and ETag when the pull request changes', async () => {
		const updated = { ...pullRequest, title: 'Updated title' };
		nock(server).get(`${endpoint}/42`).reply(200, pullRequest, { ETag: etag });
		await execute();
		nock(server)
			.matchHeader('if-none-match', etag)
			.get(`${endpoint}/42`)
			.reply(200, updated, { ETag: '"v2"' });
		expect((await execute())[0][0].json).toEqual(updated);
		nock(server).matchHeader('if-none-match', '"v2"').get(`${endpoint}/42`).reply(304);

		expect((await execute())[0][0].json).toEqual(updated);
	});

	it('does not let changes to output data change the cached body', async () => {
		nock(server).get(`${endpoint}/42`).reply(200, pullRequest, { ETag: etag });
		const output = await execute();
		output[0][0].json.title = 'Changed downstream';
		nock(server).matchHeader('if-none-match', etag).get(`${endpoint}/42`).twice().reply(304);
		const cachedOutput = await execute();
		expect(cachedOutput[0][0].json).toEqual(pullRequest);
		cachedOutput[0][0].json.title = 'Changed downstream again';

		expect((await execute())[0][0].json).toEqual(pullRequest);
	});

	it('keeps filter variants separate', async () => {
		const params = { resource: 'repository', operation: 'getPullRequests' };
		nock(server)
			.get(endpoint)
			.query({ state: 'open', per_page: 10 })
			.reply(200, [pullRequest], { ETag: etag });
		await execute({ ...params, getRepositoryPullRequestsFilters: { state: 'open' } });
		nock(server, { badheaders: ['if-none-match'] })
			.get(endpoint)
			.query({ state: 'closed', per_page: 10 })
			.reply(200, []);
		expect(
			await execute({ ...params, getRepositoryPullRequestsFilters: { state: 'closed' } }),
		).toEqual([[]]);
		nock(server)
			.matchHeader('if-none-match', etag)
			.get(endpoint)
			.query({ state: 'open', per_page: 10 })
			.reply(304);

		expect(
			(await execute({ ...params, getRepositoryPullRequestsFilters: { state: 'open' } }))[0][0]
				.json,
		).toEqual(pullRequest);
	});

	it.each(['credential', 'server', 'endpoint'])(
		'keeps a different %s separate',
		async (variant) => {
			nock(server).get(`${endpoint}/42`).reply(200, pullRequest, { ETag: etag });
			await execute();
			const context = createContext(
				variant === 'endpoint' ? { pullRequestNumber: 43 } : {},
				variant === 'credential' ? 'another-credential' : undefined,
			);
			const nextServer = variant === 'server' ? 'https://github.example.com/api/v3' : server;
			context.getCredentials.mockResolvedValue({ server: nextServer });
			nock(nextServer, { badheaders: ['if-none-match'] })
				.get(`${endpoint}/${variant === 'endpoint' ? 43 : 42}`)
				.reply(200, pullRequest);

			expect((await new Github().execute.call(context))[0][0].json).toEqual(pullRequest);
		},
	);

	it('stops sending an old ETag after a response without one', async () => {
		nock(server).get(`${endpoint}/42`).reply(200, pullRequest, { ETag: etag });
		await execute();
		nock(server).matchHeader('if-none-match', etag).get(`${endpoint}/42`).reply(200, pullRequest);
		await execute();
		nock(server, { badheaders: ['if-none-match'] })
			.get(`${endpoint}/42`)
			.reply(200, pullRequest);

		expect((await execute())[0][0].json).toEqual(pullRequest);
	});

	it.each([401, 403, 404, 500])('still reports HTTP %s after a cached read', async (statusCode) => {
		nock(server).get(`${endpoint}/42`).reply(200, pullRequest, { ETag: etag });
		await execute();
		nock(server)
			.matchHeader('if-none-match', etag)
			.get(`${endpoint}/42`)
			.reply(statusCode, { message: 'Request failed' });

		await expect(execute()).rejects.toMatchObject({ httpCode: String(statusCode) });
	});

	it.each(['getDiff', 'getPatch'])('keeps the raw response for %s', async (operation) => {
		nock(server).get(`${endpoint}/42`).reply(200, pullRequest, { ETag: etag });
		await execute();
		const format = operation === 'getDiff' ? 'diff' : 'patch';
		nock(server, { badheaders: ['if-none-match'] })
			.matchHeader('accept', `application/vnd.github.v3.${format}`)
			.get(`${endpoint}/42`)
			.reply(200, 'raw changes');

		expect((await execute({ operation }))[0][0].json).toEqual({ [format]: 'raw changes' });
	});
});
