import { mock } from 'vitest-mock-extended';
import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDrive } from '../../MicrosoftOneDrive.node';
vi.mock('../../GenericFunctions', async () => ({
    ...(await vi.importActual('../../GenericFunctions')),
    microsoftApiRequest: vi.fn(),
    microsoftApiRequestAllItems: vi.fn(async () => []),
}));
const mockApiRequest = vi.mocked(genericFunctions.microsoftApiRequest);
const mockApiRequestAllItems = vi.mocked(genericFunctions.microsoftApiRequestAllItems);
describe('Test MicrosoftOneDrive, search guard under Service Principal', () => {
    let mockExecuteFunctions;
    let microsoftOneDrive;
    const mockNode = {
        id: 'test-node-id',
        name: 'Microsoft OneDrive Test',
        type: 'n8n-nodes-base.microsoftOneDrive',
        typeVersion: 1.1,
        position: [0, 0],
        parameters: {},
    };
    const spParams = (resource) => {
        const base = {
            resource,
            operation: 'search',
            authentication: 'microsoftEntraServicePrincipalApi',
            resourceTarget: 'user',
            userTarget: 'jane@contoso.com',
            query: 'report',
        };
        return (name, _itemIndex, fallback) => (name in base ? base[name] : fallback);
    };
    beforeEach(() => {
        mockExecuteFunctions = mock();
        microsoftOneDrive = new MicrosoftOneDrive();
        mockExecuteFunctions.helpers = {
            returnJsonArray: vi.fn((data) => [data]),
            constructExecutionMetaData: vi.fn((data) => data),
        };
        mockExecuteFunctions.getNode.mockReturnValue(mockNode);
        mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    it.each(['file', 'folder'])('blocks %s search with a friendly error before any Graph call', async (resource) => {
        mockExecuteFunctions.getNodeParameter.mockImplementation(spParams(resource));
        const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);
        expect(error.message).toContain('Search is not supported with the Service Principal');
        // search uses the paginator — it must never fire
        expect(mockApiRequestAllItems).not.toHaveBeenCalled();
        expect(mockApiRequest).not.toHaveBeenCalled();
    });
    it.each(['file', 'folder'])('routes the %s search block error to output under Continue On Fail', async (resource) => {
        mockExecuteFunctions.continueOnFail.mockReturnValue(true);
        mockExecuteFunctions.getNodeParameter.mockImplementation(spParams(resource));
        const result = await microsoftOneDrive.execute.call(mockExecuteFunctions);
        expect(mockApiRequestAllItems).not.toHaveBeenCalled();
        expect(result[0][0]).toEqual({
            error: expect.stringContaining('Search is not supported with the Service Principal'),
        });
    });
});
//# sourceMappingURL=search.test.js.map