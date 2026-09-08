/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { NodeApiError, } from 'n8n-workflow';
import { getCustomFields, mailerliteApiRequest, mailerliteApiRequestAllItems, } from '../GenericFunctions';
describe('MailerLite -> mailerliteApiRequest', () => {
    let mockExecuteFunctions;
    const setupMockFunctions = (typeVersion) => {
        mockExecuteFunctions = {
            getNode: vi.fn().mockReturnValue({ typeVersion }),
            helpers: {
                httpRequestWithAuthentication: vi.fn(),
            },
        };
        vi.clearAllMocks();
    };
    beforeEach(() => {
        setupMockFunctions(1);
    });
    it('should make a successful API request for type version 1', async () => {
        const method = 'GET';
        const path = '/test';
        const body = {};
        const qs = {};
        const responseData = { success: true };
        mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(responseData);
        const result = await mailerliteApiRequest.call(mockExecuteFunctions, method, path, body, qs);
        expect(result).toEqual(responseData);
        expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith('mailerLiteApi', {
            method,
            qs,
            url: 'https://api.mailerlite.com/api/v2/test',
            json: true,
        });
    });
    it('should make a successful API request for type version 2', async () => {
        setupMockFunctions(2);
        const method = 'GET';
        const path = '/test';
        const body = {};
        const qs = {};
        const responseData = { success: true };
        mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(responseData);
        const result = await mailerliteApiRequest.call(mockExecuteFunctions, method, path, body, qs);
        expect(result).toEqual(responseData);
        expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith('mailerLiteApi', {
            method,
            qs,
            url: 'https://connect.mailerlite.com/api/test',
            json: true,
        });
    });
    it('should make an API request with an empty body', async () => {
        const method = 'GET';
        const path = '/test';
        const body = {};
        const qs = {};
        const responseData = { success: true };
        mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(responseData);
        const result = await mailerliteApiRequest.call(mockExecuteFunctions, method, path, body, qs);
        expect(result).toEqual(responseData);
        expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith('mailerLiteApi', {
            method,
            qs,
            url: 'https://api.mailerlite.com/api/v2/test',
            json: true,
        });
    });
    it('should throw an error if the API request fails', async () => {
        const method = 'GET';
        const path = '/test';
        const body = {};
        const qs = {};
        const errorResponse = { message: 'Error' };
        mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue(errorResponse);
        await expect(mailerliteApiRequest.call(mockExecuteFunctions, method, path, body, qs)).rejects.toThrow(NodeApiError);
    });
});
describe('MailerLite -> mailerliteApiRequestAllItems', () => {
    let mockExecuteFunctions;
    const setupMockFunctions = (typeVersion) => {
        mockExecuteFunctions = {
            getNode: vi.fn().mockReturnValue({ typeVersion }),
            helpers: {
                httpRequestWithAuthentication: vi.fn(),
            },
        };
        vi.clearAllMocks();
    };
    beforeEach(() => {
        setupMockFunctions(1);
    });
    it('should handle pagination for type version 1', async () => {
        const method = 'GET';
        const endpoint = '/test';
        const body = {};
        const query = {};
        const responseDataPage1 = [{ id: 1 }, { id: 2 }];
        const responseDataPage2 = [{ id: 3 }, { id: 4 }];
        mockExecuteFunctions.helpers.httpRequestWithAuthentication
            .mockResolvedValueOnce(responseDataPage1)
            .mockResolvedValueOnce(responseDataPage2)
            .mockResolvedValueOnce([]);
        const result = await mailerliteApiRequestAllItems.call(mockExecuteFunctions, method, endpoint, body, query);
        expect(result).toEqual([...responseDataPage1, ...responseDataPage2]);
    });
    it('should handle pagination for type version 2', async () => {
        setupMockFunctions(2);
        const method = 'GET';
        const endpoint = '/test';
        const body = {};
        const query = {};
        const responseDataPage1 = {
            data: [{ id: 1 }, { id: 2 }],
            meta: { next_cursor: 'cursor1' },
            links: { next: 'nextLink1' },
        };
        const responseDataPage2 = {
            data: [{ id: 3 }, { id: 4 }],
            meta: { next_cursor: null },
            links: { next: null },
        };
        mockExecuteFunctions.helpers.httpRequestWithAuthentication
            .mockResolvedValueOnce(responseDataPage1)
            .mockResolvedValueOnce(responseDataPage2);
        const result = await mailerliteApiRequestAllItems.call(mockExecuteFunctions, method, endpoint, body, query);
        expect(result).toEqual([...responseDataPage1.data, ...responseDataPage2.data]);
    });
});
describe('MailerLite -> getCustomFields', () => {
    let mockExecuteFunctions;
    const v1FieldResponse = [
        { name: 'Field1', key: 'field1' },
        { name: 'Field2', key: 'field2' },
    ];
    const v2FieldResponse = {
        data: v1FieldResponse,
    };
    const setupMockFunctions = (typeVersion) => {
        mockExecuteFunctions = {
            getNode: vi.fn().mockReturnValue({ typeVersion }),
            helpers: {
                httpRequestWithAuthentication: vi
                    .fn()
                    .mockResolvedValue(typeVersion === 1 ? v1FieldResponse : v2FieldResponse),
            },
        };
        vi.clearAllMocks();
    };
    beforeEach(() => {
        setupMockFunctions(1);
    });
    it('should return custom fields for type version 1', async () => {
        const result = await getCustomFields.call(mockExecuteFunctions);
        expect(result).toEqual([
            { name: 'field1', value: 'field1' },
            { name: 'field2', value: 'field2' },
        ]);
    });
    it('should return custom fields for type version 2', async () => {
        setupMockFunctions(2);
        const result = await getCustomFields.call(mockExecuteFunctions);
        expect(result).toEqual([
            { name: 'Field1', value: 'field1' },
            { name: 'Field2', value: 'field2' },
        ]);
    });
});
//# sourceMappingURL=GenericFunctions.test.js.map