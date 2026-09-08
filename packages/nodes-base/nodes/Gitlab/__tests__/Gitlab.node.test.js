import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import * as GenericFunctions from '../GenericFunctions';
import { Gitlab } from '../Gitlab.node';
vi.mock('../GenericFunctions', async () => ({
    ...(await vi.importActual('../GenericFunctions')),
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
function createMockExecuteFunction(params) {
    const merged = {
        authentication: 'accessToken',
        owner: 'test-owner',
        repository: 'test-repo',
        ...params,
    };
    return {
        getNodeParameter: vi.fn((paramName, _itemIndex, fallback) => {
            return paramName in merged ? merged[paramName] : fallback;
        }),
        getInputData: vi.fn().mockReturnValue([{ json: {} }]),
        getNode: vi.fn().mockReturnValue({
            id: 'test-node-id',
            name: 'Gitlab',
            type: 'n8n-nodes-base.gitlab',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
        }),
        helpers: {
            requestWithAuthentication: vi.fn(),
            requestOAuth2: vi.fn(),
            returnJsonArray: vi.fn((data) => {
                if (Array.isArray(data)) {
                    return data.map((item) => ({ json: item }));
                }
                return [{ json: data }];
            }),
            constructExecutionMetaData: vi.fn((data) => data),
            assertBinaryData: vi.fn(),
            getBinaryDataBuffer: vi.fn(),
            prepareBinaryData: vi.fn(),
        },
        getCredentials: vi.fn().mockResolvedValue({
            accessToken: 'test-token',
            server: 'https://gitlab.example.com',
        }),
        continueOnFail: vi.fn().mockReturnValue(false),
    };
}
describe('Gitlab Node - Cross-cutting / Auth', () => {
    let gitlab;
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
            GenericFunctions.gitlabApiRequest.mockResolvedValue({
                iid: 1,
                title: 'Issue 1',
            });
            await gitlab.execute.call(mock);
            expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith('GET', '/projects/test-owner%2Ftest-repo/issues/1', {}, {});
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
            GenericFunctions.gitlabApiRequest.mockResolvedValue({ iid: 1 });
            await gitlab.execute.call(mock);
            expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith('GET', '/projects/my-group%2Fsubgroup%2Ftest-repo/issues/1', {}, {});
        });
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
            GenericFunctions.gitlabApiRequest.mockRejectedValue(new NodeApiError(mock.getNode(), { statusCode: 500, message: 'boom' }));
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
            GenericFunctions.gitlabApiRequest.mockRejectedValue(new NodeApiError(mock.getNode(), { statusCode: 500, message: 'boom' }));
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
        ])('should register %s:%s as an overwriteDataOperation', async (resource, op, issueNumber, responseBody) => {
            const mock = createMockExecuteFunction({
                resource,
                operation: op,
                ...buildParamsFor(resource, op, issueNumber),
            });
            GenericFunctions.gitlabApiRequest.mockResolvedValue(responseBody);
            const result = await gitlab.execute.call(mock);
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveLength(1);
            expect(result[0][0].json).toEqual(responseBody);
        });
    });
    describe('overwriteDataOperationsArray Coverage', () => {
        it('should return an array of items for release:getAll', async () => {
            const mock = createMockExecuteFunction({
                resource: 'release',
                operation: 'getAll',
                projectId: '1',
                returnAll: true,
            });
            GenericFunctions.gitlabApiRequestAllItems.mockResolvedValue([
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
            GenericFunctions.gitlabApiRequestAllItems.mockResolvedValue([
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
            GenericFunctions.gitlabApiRequest.mockResolvedValue([{ id: 1, name: 'r1' }]);
            const result = await gitlab.execute.call(mock);
            expect(GenericFunctions.gitlabApiRequest).toHaveBeenCalledWith('GET', '/users/test-owner/projects', {}, {});
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
            GenericFunctions.gitlabApiRequestAllItems.mockResolvedValue([
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
function buildParamsFor(resource, op, issueNumber) {
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
        if (op === 'create')
            return { releaseTag: 'v1.0.0', additionalFields: {} };
        if (op === 'delete')
            return { projectId: '1', tag_name: 'v1.0.0' };
        if (op === 'get')
            return { projectId: '1', tag_name: 'v1.0.0' };
        if (op === 'update')
            return { projectId: '1', tag_name: 'v1.0.0', additionalFields: {} };
    }
    if (resource === 'repository' && op === 'get') {
        return {};
    }
    return {};
}
//# sourceMappingURL=Gitlab.node.test.js.map