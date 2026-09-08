import { mock } from 'vitest-mock-extended';
import { UnexpectedError } from 'n8n-workflow';
import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDrive } from '../../MicrosoftOneDrive.node';
vi.mock('../../GenericFunctions', async () => ({
    ...(await vi.importActual('../../GenericFunctions')),
    microsoftApiRequest: vi.fn(async function (_, resource) {
        if (resource === '/drive/items/fileID') {
            return {
                name: 'MyFile',
                '@microsoft.graph.downloadUrl': 'https://test.com/file',
                file: {
                    mimeType: 'image/png',
                },
            };
        }
        if (resource === '/drive/items/fileID/content') {
            throw new UnexpectedError('Error');
        }
    }),
}));
describe('Test MicrosoftOneDrive, file > download', () => {
    let mockExecuteFunctions;
    let microsoftOneDrive;
    const httpRequest = vi.fn(async () => ({ body: mock() }));
    const prepareBinaryData = vi.fn(async () => ({ data: 'testBinary' }));
    const mockNode = {
        id: 'test-node-id',
        name: 'Microsoft OneDrive Test',
        type: 'n8n-nodes-base.microsoftOneDrive',
        typeVersion: 1.1,
        position: [0, 0],
        parameters: {},
    };
    beforeEach(() => {
        mockExecuteFunctions = mock();
        microsoftOneDrive = new MicrosoftOneDrive();
        mockExecuteFunctions.helpers = {
            httpRequest,
            prepareBinaryData,
            returnJsonArray: vi.fn((data) => [data]),
            constructExecutionMetaData: vi.fn((data) => data),
        };
        mockExecuteFunctions.getNode.mockReturnValue(mockNode);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    it('should call helpers.httpRequest when request to /drive/items/{fileId}/content fails', async () => {
        const items = [{ json: { data: 'test' } }];
        mockExecuteFunctions.getInputData.mockReturnValue(items);
        mockExecuteFunctions.getNodeParameter.mockImplementation((key) => {
            if (key === 'resource')
                return 'file';
            if (key === 'operation')
                return 'download';
            if (key === 'fileId')
                return 'fileID';
            if (key === 'binaryPropertyName')
                return 'data';
        });
        const result = await microsoftOneDrive.execute.call(mockExecuteFunctions);
        expect(genericFunctions.microsoftApiRequest).toHaveBeenCalledTimes(2);
        expect(httpRequest).toHaveBeenCalledTimes(1);
        expect(httpRequest).toHaveBeenCalledWith({
            encoding: 'arraybuffer',
            json: false,
            method: 'GET',
            returnFullResponse: true,
            url: 'https://test.com/file',
        });
        expect(prepareBinaryData).toHaveBeenCalledTimes(1);
        expect(result).toEqual([
            [{ binary: { data: { data: 'testBinary' } }, json: { data: 'test' } }],
        ]);
    });
});
//# sourceMappingURL=file.download.test.js.map