import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import * as GenericFunctions from '../GenericFunctions';
import type * as _importType0 from '../GenericFunctions';
import { Gitlab } from '../Gitlab.node';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../GenericFunctions')),
	gitlabApiRequest: vi.fn(),
	gitlabApiRequestAllItems: vi.fn(),
}));

/**
 * Build a mock IExecuteFunctions whose getNodeParameter returns the supplied
 * values. Unspecified parameters fall back to the default ('' / 0 / false).
 *
 * Mirrors the helper used by Github.pullRequest.test.ts and the existing
 * Gitlab.file.create.test.ts so behaviour stays consistent across the
 * GitLab test suite.
 */
function createMockExecuteFunction(params: Record<string, any>, typeVersion = 1) {
	const merged: Record<string, any> = {
		authentication: 'accessToken',
		owner: 'test-owner',
		repository: 'test-repo',
		...params,
	};

	return {
		getNodeParameter: vi.fn((paramName: string, _itemIndex?: number, fallback?: any) => {
			return paramName in merged ? merged[paramName] : fallback;
		}),
		getInputData: vi.fn().mockReturnValue([{ json: {} }]),
		getNode: vi.fn().mockReturnValue({
			id: 'test-node-id',
			name: 'Gitlab',
			type: 'n8n-nodes-base.gitlab',
			typeVersion,
			position: [0, 0],
			parameters: {},
		}),
		helpers: {
			requestWithAuthentication: vi.fn(),
			requestOAuth2: vi.fn(),
			returnJsonArray: vi.fn((data: any) => {
				if (Array.isArray(data)) {
					return data.map((item) => ({ json: item }));
				}
				return [{ json: data }];
			}),
			constructExecutionMetaData: vi.fn((data: any) => data),
			assertBinaryData: vi.fn(),
			getBinaryDataBuffer: vi.fn(),
			prepareBinaryData: vi.fn(),
		},
		getCredentials: vi.fn().mockResolvedValue({
			accessToken: 'test-token',
			server: 'https://gitlab.example.com',
		}),
		continueOnFail: vi.fn().mockReturnValue(false),
	} as any;
}

describe('Gitlab Node - Cross-cutting / Auth', () => {
	let gitlab: Gitlab;

	beforeEach(() => {
		gitlab = new Gitlab();
		vi.clearAllMocks();
	});

	describe('Authentication Routing', () => {
		it('should use accessToken credential and build the v4 URI for accessToken auth', async () => {
			const mock = createMockExecuteFunction({
				operation: 'get',
				resource: 'issue',
				issueNumber: 1,
			});
			(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({
				iid: 1,
				title: 'Issue 1',
			});

			await gitlab.execute.call(mock);

			expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
				'GET',
				expect.objectContaining({ value: '/projects/test-owner%2Ftest-repo/issues/1' }),
				{},
				{},
			);
		});
	});

	describe('Owner Encoding (Subgroups)', () => {
		it('should encode slashes in owner as %2F (for subgroups)', async () => {
			const mock = createMockExecuteFunction({
				owner: 'my-group/subgroup',
				operation: 'get',
				resource: 'issue',
				issueNumber: 1,
			});
			(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({ iid: 1 });

			await gitlab.execute.call(mock);

			expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
				'GET',
				expect.objectContaining({ value: '/projects/my-group%2Fsubgroup%2Ftest-repo/issues/1' }),
				{},
				{},
			);
		});
	});

	describe('Encoded Path Values', () => {
		const encodedOwner = {
			owner: 'my-group%2Fsubgroup',
			resource: 'issue',
			operation: 'get',
			issueNumber: 1,
		};
		const encodedRelease = {
			resource: 'release',
			operation: 'get',
			projectId: 'acme%2Fbilling-service',
			tag_name: 'release%2F1.0',
		};
		const encodedTwice = {
			resource: 'release',
			operation: 'get',
			projectId: 'acme%252Fbilling',
			tag_name: 'v1',
		};
		const invalidEncoding = {
			resource: 'release',
			operation: 'get',
			projectId: '50%',
			tag_name: 'v1',
		};
		const filePath = {
			resource: 'file',
			operation: 'get',
			filePath: 'c++/a.md',
			additionalParameters: {},
		};

		it.each([
			[1, 'an encoded owner', encodedOwner, '/projects/my-group%2Fsubgroup%2Ftest-repo/issues/1'],
			[
				1,
				'an encoded project ID and tag name',
				encodedRelease,
				'/projects/acme%2Fbilling-service/releases/release%2F1.0',
			],
			[
				1,
				'a project ID that is encoded twice',
				encodedTwice,
				'/projects/acme%252Fbilling/releases/v1',
			],
			[
				1,
				'a project ID that is not valid percent-encoding',
				invalidEncoding,
				'/projects/50%25/releases/v1',
			],
			[
				1,
				'a file path with plus signs',
				filePath,
				'/projects/test-owner%2Ftest-repo/repository/files/c%2B%2B%2Fa.md',
			],
			[
				1.1,
				'an encoded owner',
				encodedOwner,
				'/projects/my-group%252Fsubgroup%2Ftest-repo/issues/1',
			],
			[
				1.1,
				'an encoded project ID and tag name',
				encodedRelease,
				'/projects/acme%252Fbilling-service/releases/release%252F1.0',
			],
			[
				1.1,
				'a project ID that is encoded twice',
				encodedTwice,
				'/projects/acme%25252Fbilling/releases/v1',
			],
			[
				1.1,
				'a project ID that is not valid percent-encoding',
				invalidEncoding,
				'/projects/50%25/releases/v1',
			],
			[
				1.1,
				'a file path with plus signs',
				filePath,
				'/projects/test-owner%2Ftest-repo/repository/files/c%2B%2B%2Fa.md',
			],
		])(
			'should build the endpoint in version %s for %s',
			async (typeVersion, _, params, expectedEndpoint) => {
				const mock = createMockExecuteFunction(params, typeVersion);
				(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({});

				await gitlab.execute.call(mock);

				expect(String((GenericFunctions.gitlabApiRequest as Mock).mock.calls[0][1])).toBe(
					expectedEndpoint,
				);
			},
		);
	});

	describe('Unknown Resource', () => {
		it('should throw NodeOperationError for an unknown resource value', async () => {
			const mock = createMockExecuteFunction({
				resource: 'unknown-resource',
				operation: 'whatever',
			});

			await expect(gitlab.execute.call(mock)).rejects.toBeInstanceOf(NodeOperationError);
			expect(GenericFunctions.gitlabApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('continueOnFail Behavior', () => {
		it('should not throw and should attach an error item when continueOnFail=true and the API errors (overwrite op)', async () => {
			const mock = createMockExecuteFunction({
				operation: 'get',
				resource: 'issue',
				issueNumber: 1,
			});
			mock.continueOnFail = vi.fn().mockReturnValue(true);
			(GenericFunctions.gitlabApiRequest as Mock).mockRejectedValue(
				new NodeApiError(mock.getNode() as any, { statusCode: 500, message: 'boom' } as any),
			);

			const result = await gitlab.execute.call(mock);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ error: expect.any(String) });
		});

		it('should rethrow as NodeApiError when continueOnFail=false and the API errors', async () => {
			const mock = createMockExecuteFunction({
				operation: 'get',
				resource: 'issue',
				issueNumber: 1,
			});
			(GenericFunctions.gitlabApiRequest as Mock).mockRejectedValue(
				new NodeApiError(mock.getNode() as any, { statusCode: 500, message: 'boom' } as any),
			);

			await expect(gitlab.execute.call(mock)).rejects.toBeInstanceOf(NodeApiError);
		});
	});

	describe('overwriteDataOperations Coverage', () => {
		it.each([
			['issue', 'create', 1234, { iid: 1234, title: 'New issue' }],
			['issue', 'createComment', 1234, { id: 1, body: 'comment' }],
			['issue', 'edit', 1234, { iid: 1234 }],
			['issue', 'get', 1234, { iid: 1234 }],
			['release', 'create', undefined, { tag_name: 'v1.0.0' }],
			['release', 'delete', undefined, {}],
			['release', 'get', undefined, { tag_name: 'v1.0.0' }],
			['release', 'update', undefined, { tag_name: 'v1.0.0' }],
			['repository', 'get', undefined, { id: 1, name: 'r' }],
		])(
			'should register %s:%s as an overwriteDataOperation',
			async (resource, op, issueNumber, responseBody) => {
				const mock = createMockExecuteFunction({
					resource,
					operation: op,
					...buildParamsFor(resource, op, issueNumber),
				});
				(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue(responseBody);

				const result = await gitlab.execute.call(mock);
				expect(result).toHaveLength(1);
				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toEqual(responseBody);
			},
		);
	});

	describe('overwriteDataOperationsArray Coverage', () => {
		it('should return an array of items for release:getAll', async () => {
			const mock = createMockExecuteFunction({
				resource: 'release',
				operation: 'getAll',
				projectId: '1',
				returnAll: true,
			});
			(GenericFunctions.gitlabApiRequestAllItems as Mock).mockResolvedValue([
				{ tag_name: 'v1.0.0' },
				{ tag_name: 'v1.0.1' },
			]);

			const result = await gitlab.execute.call(mock);

			expect(GenericFunctions.gitlabApiRequestAllItems).toHaveBeenCalled();
			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).toEqual({ tag_name: 'v1.0.0' });
			expect(result[0][1].json).toEqual({ tag_name: 'v1.0.1' });
		});

		it('should return an array of items for repository:getIssues', async () => {
			const mock = createMockExecuteFunction({
				resource: 'repository',
				operation: 'getIssues',
				returnAll: true,
			});
			(GenericFunctions.gitlabApiRequestAllItems as Mock).mockResolvedValue([
				{ iid: 1, title: 'Issue 1' },
				{ iid: 2, title: 'Issue 2' },
			]);

			const result = await gitlab.execute.call(mock);

			expect(GenericFunctions.gitlabApiRequestAllItems).toHaveBeenCalled();
			expect(result[0]).toHaveLength(2);
		});

		it('should return a single item for user:getRepositories', async () => {
			const mock = createMockExecuteFunction({
				resource: 'user',
				operation: 'getRepositories',
			});
			(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue([{ id: 1, name: 'r1' }]);

			const result = await gitlab.execute.call(mock);

			expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith(
				'GET',
				expect.objectContaining({ value: '/users/test-owner/projects' }),
				{},
				{},
			);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ id: 1, name: 'r1' });
		});

		it('should return an array of items for file:list', async () => {
			const mock = createMockExecuteFunction({
				resource: 'file',
				operation: 'list',
				returnAll: true,
				filePath: '',
			});
			(GenericFunctions.gitlabApiRequestAllItems as Mock).mockResolvedValue([
				{ id: 'a', name: 'README.md', type: 'blob', path: 'README.md' },
				{ id: 'b', name: 'src', type: 'tree', path: 'src' },
			]);

			const result = await gitlab.execute.call(mock);

			expect(GenericFunctions.gitlabApiRequestAllItems).toHaveBeenCalled();
			expect(result[0]).toHaveLength(2);
		});
	});
});

/**
 * Helper: build the parameter set needed to dispatch a given resource+operation
 * without throwing inside the node (e.g. issueNumber for issue ops,
 * releaseTag/projectId/tag_name for release ops, etc.).
 */
function buildParamsFor(
	resource: string,
	op: string,
	issueNumber: number | undefined,
): Record<string, any> {
	if (resource === 'issue') {
		if (op === 'create') {
			return { title: 'T', body: 'B', due_date: '', labels: [], assignee_ids: [] };
		}
		if (op === 'createComment') {
			return { issueNumber, body: 'hi' };
		}
		if (op === 'edit') {
			return { issueNumber, editFields: { title: 'New' } };
		}
		if (op === 'get') {
			return { issueNumber };
		}
	}
	if (resource === 'release') {
		if (op === 'create') return { releaseTag: 'v1.0.0', additionalFields: {} };
		if (op === 'delete') return { projectId: '1', tag_name: 'v1.0.0' };
		if (op === 'get') return { projectId: '1', tag_name: 'v1.0.0' };
		if (op === 'update') return { projectId: '1', tag_name: 'v1.0.0', additionalFields: {} };
	}
	if (resource === 'repository' && op === 'get') {
		return {};
	}
	return {};
}
