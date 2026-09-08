import { NodeApiError } from 'n8n-workflow';
import { execute } from '../../../../v2/actions/base/getAll.operation';
import { apiRequest } from '../../../../v2/transport';
vi.mock('../../../../v2/transport/index', async () => {
    const originalModule = await vi.importActual('../../../../v2/transport/index');
    return {
        ...originalModule,
        apiRequest: { call: vi.fn() },
    };
});
describe('NocoDB base getAll action', () => {
    let mockExecuteFunctions;
    beforeEach(() => {
        mockExecuteFunctions = {
            getNodeParameter: vi.fn(),
            getInputData: vi.fn(() => [{ json: {} }]),
            continueOnFail: vi.fn(() => false),
            helpers: {
                returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
                constructExecutionMetaData: vi.fn((items) => items),
            },
            getNode: vi.fn(() => { }),
        };
        apiRequest.call.mockClear();
    });
    // Test case 1: workspaceId is provided
    it('should return bases for a given workspaceId', async () => {
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('testWorkspaceId');
        apiRequest.call.mockResolvedValueOnce({
            list: [{ id: 'base1' }, { id: 'base2' }],
        });
        const result = await execute.call(mockExecuteFunctions);
        expect(apiRequest.call).toHaveBeenCalledWith(expect.anything(), 'GET', '/api/v3/meta/workspaces/testWorkspaceId/bases', {}, {});
        expect(result).toEqual([[{ id: 'base1' }, { id: 'base2' }]]);
    });
    // Test case 2: workspaceId is not provided (or 'none')
    it('should return all bases when no workspaceId is provided', async () => {
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('none');
        apiRequest.call.mockResolvedValueOnce({
            list: [{ id: 'baseA' }, { id: 'baseB' }],
        });
        const result = await execute.call(mockExecuteFunctions);
        expect(apiRequest.call).toHaveBeenCalledWith(expect.anything(), 'GET', '/api/v2/meta/bases/', {}, {});
        expect(result).toEqual([[{ id: 'baseA' }, { id: 'baseB' }]]);
    });
    // Test case 3: Error handling with continueOnFail = true
    it('should return error data when apiRequest fails and continueOnFail is true', async () => {
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('testWorkspaceId');
        apiRequest.call.mockRejectedValueOnce(new Error('API Error'));
        mockExecuteFunctions.continueOnFail.mockReturnValueOnce(true);
        const result = await execute.call(mockExecuteFunctions);
        expect(result[0][0]).toHaveProperty('error');
        expect(result[0][0].error).toContain('API Error');
    });
    // Test case 4: Error handling with continueOnFail = false
    it('should throw NodeApiError when apiRequest fails and continueOnFail is false', async () => {
        mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('testWorkspaceId');
        apiRequest.call.mockRejectedValueOnce(new Error('API Error'));
        mockExecuteFunctions.continueOnFail.mockReturnValueOnce(false);
        await expect(execute.call(mockExecuteFunctions)).rejects.toThrow(NodeApiError);
    });
});
//# sourceMappingURL=getAll.test.js.map