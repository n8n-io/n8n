import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeParameters,
	JsonObject,
} from 'n8n-workflow';
import { jsonParse, NodeApiError } from 'n8n-workflow';
import nock from 'nock';
import { mock, mockDeep } from 'vitest-mock-extended';

import { Github } from '../Github.node';

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
		context.getNodeParameter.mockImplementation(
			(name, _index, fallback) => params[name] ?? fallback,
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
		staticData = {};
	});

	afterEach(() => {
		const pending = nock.pendingMocks();
		nock.cleanAll();
		expect(pending).toEqual([]);
	});

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
		// Model the static data saved between scheduled executions.
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
