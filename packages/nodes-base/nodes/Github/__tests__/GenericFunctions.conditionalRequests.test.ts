import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { githubApiRequest } from '../GenericFunctions';

const pullRequest = { number: 42, title: 'Update documentation', state: 'open' };

// NODE-5738: Scheduled reads must revalidate unchanged pull requests.
describe.each([
	{
		operation: 'pullRequest:get',
		endpoint: requestPath`/repos/test-owner/test-repo/pulls/42`,
		query: {},
		body: pullRequest,
	},
	{
		operation: 'repository:getPullRequests',
		endpoint: requestPath`/repos/test-owner/test-repo/pulls`,
		query: { state: 'open', per_page: 10 },
		body: [pullRequest],
	},
])('githubApiRequest conditional requests ($operation)', ({ endpoint, query, body }) => {
	const etag = 'W/"unchanged-pull-requests"';
	let staticData: IDataObject;
	let conditionalHeaders: unknown[];
	let responseStatuses: number[];

	function createExecutionContext() {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getNode.mockReturnValue(
			mock<INode>({
				id: 'github-node',
				name: 'GitHub',
				credentials: { githubApi: { id: 'github-credential', name: 'GitHub' } },
			}),
		);
		context.getCredentials.mockResolvedValue({ server: 'https://api.github.com' });
		context.getWorkflowStaticData.mockReturnValue(staticData);
		context.helpers.requestWithAuthentication.mockImplementation(
			async (_credentialType, options) => {
				const conditionalHeader = Object.entries(options.headers ?? {}).find(
					([name]) => name.toLowerCase() === 'if-none-match',
				)?.[1];
				conditionalHeaders.push(conditionalHeader);

				const statusCode = conditionalHeader === etag ? 304 : 200;
				responseStatuses.push(statusCode);
				const responseBody = statusCode === 304 ? '' : body;
				const response = { statusCode, headers: { etag }, body: responseBody };
				if (statusCode === 304 && options.simple !== false) {
					throw Object.assign(new Error('Not Modified'), { statusCode, response });
				}
				return options.resolveWithFullResponse ? response : responseBody;
			},
		);
		return context;
	}

	beforeEach(() => {
		staticData = {};
		conditionalHeaders = [];
		responseStatuses = [];
	});

	it('should return the pull request data on the first read', async () => {
		const context = createExecutionContext();

		const result = await githubApiRequest.call(context, 'GET', endpoint, {}, query);

		expect(result).toEqual(body);
		expect(conditionalHeaders).toEqual([undefined]);
		expect(responseStatuses).toEqual([200]);
		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'githubApi',
			expect.objectContaining({
				method: 'GET',
				uri: expect.objectContaining({ value: `https://api.github.com${endpoint}` }),
				qs: query,
			}),
		);
	});

	it('should send the stored ETag on the next execution and return the body after a 304', async () => {
		const firstResult = await githubApiRequest.call(
			createExecutionContext(),
			'GET',
			endpoint,
			{},
			query,
		);
		expect(firstResult).toEqual(body);

		const nextResult = await githubApiRequest.call(
			createExecutionContext(),
			'GET',
			endpoint,
			{},
			query,
		);

		expect(conditionalHeaders).toEqual([undefined, etag]);
		expect(responseStatuses).toEqual([200, 304]);
		expect(nextResult).toEqual(body);
	});
});
