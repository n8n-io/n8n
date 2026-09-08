import { dueDatePreSendAction } from '../GenericFunctions';
describe('dueDatePreSendAction', () => {
    let mockThis;
    beforeEach(() => {
        mockThis = {
            getNode: vi.fn(() => ({
                id: 'mock-node-id',
                name: 'mock-node',
                typeVersion: 1,
                type: 'n8n-nodes-base.mockNode',
                position: [0, 0],
                parameters: {},
            })),
            getNodeParameter: vi.fn(),
            getInputData: vi.fn(),
            helpers: {},
        };
        vi.clearAllMocks();
    });
    it('should add formatted dueDate to requestOptions.body if dueDate is provided directly', async () => {
        mockThis.getNodeParameter.mockReturnValueOnce('2024-12-25');
        const requestOptions = { url: 'https://example.com/api' };
        const result = await dueDatePreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({ dueDate: '2024-12-25T00:00:00+00:00' });
    });
    it('should add formatted dueDate to requestOptions.body if dueDate is provided in updateFields', async () => {
        mockThis.getNodeParameter.mockImplementation((paramName) => {
            if (paramName === 'dueDate')
                return null;
            if (paramName === 'updateFields')
                return { dueDate: '2024-12-25' };
            return undefined;
        });
        const requestOptions = { url: 'https://example.com/api' };
        const result = await dueDatePreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({ dueDate: '2024-12-25T00:00:00+00:00' });
    });
    it('should initialize body as an empty object if it is undefined', async () => {
        mockThis.getNodeParameter.mockReturnValueOnce('2024-12-25');
        const requestOptions = { url: 'https://example.com/api', body: undefined };
        const result = await dueDatePreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({ dueDate: '2024-12-25T00:00:00+00:00' });
    });
});
//# sourceMappingURL=DueDatePreSendAction.test.js.map