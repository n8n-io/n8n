import { taskUpdatePreSendAction } from '../GenericFunctions';
describe('taskUpdatePreSendAction', () => {
    let mockThis;
    beforeEach(() => {
        mockThis = {
            getNodeParameter: vi.fn(),
            helpers: {
                httpRequestWithAuthentication: vi.fn(),
            },
        };
    });
    it('should not modify requestOptions if title and dueDate are provided', async () => {
        const requestOptions = {
            url: 'https://api.example.com',
            body: {
                title: 'Task Title',
                dueDate: '2024-12-25T00:00:00Z',
            },
        };
        const result = await taskUpdatePreSendAction.call(mockThis, requestOptions);
        expect(result).toEqual(requestOptions);
    });
    it('should fetch missing title and dueDate from the API', async () => {
        mockThis.getNodeParameter.mockReturnValueOnce('123').mockReturnValueOnce('456');
        const mockApiResponse = {
            title: 'Fetched Task Title',
            dueDate: '2024-12-25T02:00:00+02:00',
        };
        (mockThis.helpers?.httpRequestWithAuthentication).mockResolvedValue(mockApiResponse);
        const requestOptions = {
            url: 'https://api.example.com',
            body: {
                title: undefined,
                dueDate: undefined,
            },
        };
        const result = await taskUpdatePreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({
            title: 'Fetched Task Title',
            dueDate: '2024-12-25T00:00:00+00:00',
        });
    });
    it('should only fetch title if dueDate is provided', async () => {
        mockThis.getNodeParameter.mockReturnValueOnce('123').mockReturnValueOnce('456');
        const mockApiResponse = {
            title: 'Fetched Task Title',
            dueDate: '2024-12-25T02:00:00+02:00',
        };
        (mockThis.helpers?.httpRequestWithAuthentication).mockResolvedValue(mockApiResponse);
        const requestOptions = {
            url: 'https://api.example.com',
            body: {
                title: undefined,
                dueDate: '2024-12-24T00:00:00Z',
            },
        };
        const result = await taskUpdatePreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({
            title: 'Fetched Task Title',
            dueDate: '2024-12-24T00:00:00Z',
        });
    });
    it('should only fetch dueDate if title is provided', async () => {
        mockThis.getNodeParameter.mockReturnValueOnce('123').mockReturnValueOnce('456');
        const mockApiResponse = {
            title: 'Fetched Task Title',
            dueDate: '2024-12-25T02:00:00+02:00',
        };
        (mockThis.helpers?.httpRequestWithAuthentication).mockResolvedValue(mockApiResponse);
        const requestOptions = {
            url: 'https://api.example.com',
            body: {
                title: 'Existing Task Title',
                dueDate: undefined,
            },
        };
        const result = await taskUpdatePreSendAction.call(mockThis, requestOptions);
        expect(result.body).toEqual({
            title: 'Existing Task Title',
            dueDate: '2024-12-25T00:00:00+00:00',
        });
    });
});
//# sourceMappingURL=TaskUpdatePreSendAction.test.js.map