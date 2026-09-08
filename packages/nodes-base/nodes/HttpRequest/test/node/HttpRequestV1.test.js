import { HttpRequestV1 } from '../../V1/HttpRequestV1.node';
describe('HttpRequestV1', () => {
    let node;
    let executeFunctions;
    beforeEach(() => {
        const baseDescription = {
            displayName: 'HTTP Request',
            name: 'httpRequest',
            description: 'Makes an HTTP request and returns the response data',
            group: [],
        };
        node = new HttpRequestV1(baseDescription);
        executeFunctions = {
            getInputData: vi.fn(),
            getNodeParameter: vi.fn(),
            getNode: vi.fn(() => {
                return {
                    type: 'n8n-nodes-base.httpRequest',
                    typeVersion: 1,
                };
            }),
            getCredentials: vi.fn(),
            helpers: {
                request: vi.fn(),
                requestOAuth1: vi.fn(async () => await Promise.resolve({
                    success: true,
                })),
                requestOAuth2: vi.fn(async () => await Promise.resolve({
                    success: true,
                })),
                requestWithAuthentication: vi.fn(),
                requestWithAuthenticationPaginated: vi.fn(),
                assertBinaryData: vi.fn(),
                getBinaryStream: vi.fn(),
                getBinaryMetadata: vi.fn(),
                binaryToString: vi.fn((buffer) => {
                    return buffer.toString();
                }),
                prepareBinaryData: vi.fn(),
            },
            getContext: vi.fn(),
            sendMessageToUI: vi.fn(),
            continueOnFail: vi.fn(),
            getMode: vi.fn(),
        };
    });
    describe('URL Parameter Validation', () => {
        it('should throw error when URL is only whitespace', async () => {
            executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
            executeFunctions.getNodeParameter.mockImplementation((paramName) => {
                switch (paramName) {
                    case 'responseFormat':
                        return 'json';
                    case 'requestMethod':
                        return 'GET';
                    case 'url':
                        return '   ';
                    case 'jsonParameters':
                        return false;
                    case 'options':
                        return {};
                    default:
                        return undefined;
                }
            });
            executeFunctions.getCredentials.mockRejectedValue(new Error('No credentials'));
            await expect(node.execute.call(executeFunctions)).rejects.toThrow('URL parameter cannot be empty');
        });
        it('should trim whitespace from valid URL', async () => {
            executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
            executeFunctions.getNodeParameter.mockImplementation((paramName) => {
                switch (paramName) {
                    case 'responseFormat':
                        return 'json';
                    case 'requestMethod':
                        return 'GET';
                    case 'url':
                        return '  http://example.com  ';
                    case 'jsonParameters':
                        return false;
                    case 'options':
                        return {};
                    case 'bodyParametersUi':
                    case 'headerParametersUi':
                    case 'queryParametersUi':
                        return { parameter: [] };
                    default:
                        return undefined;
                }
            });
            executeFunctions.getCredentials.mockRejectedValue(new Error('No credentials'));
            const response = {
                success: true,
            };
            executeFunctions.helpers.request.mockResolvedValue(response);
            const result = await node.execute.call(executeFunctions);
            expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
            expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(1);
            const requestArgs = executeFunctions.helpers.request.mock.calls[0][0];
            expect(requestArgs.uri ?? requestArgs.url).toBe('http://example.com');
        });
        it.each([
            { url: undefined, expectedType: 'undefined' },
            { url: null, expectedType: 'null' },
            { url: 42, expectedType: 'number' },
        ])('should throw error when URL is $expectedType', async ({ url, expectedType }) => {
            executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
            executeFunctions.getNodeParameter.mockImplementation((paramName) => {
                switch (paramName) {
                    case 'responseFormat':
                        return 'json';
                    case 'requestMethod':
                        return 'GET';
                    case 'url':
                        return url;
                    case 'jsonParameters':
                        return false;
                    case 'options':
                        return {};
                    case 'bodyParametersUi':
                    case 'headerParametersUi':
                    case 'queryParametersUi':
                        return { parameter: [] };
                    default:
                        return undefined;
                }
            });
            executeFunctions.getCredentials.mockRejectedValue(new Error('No credentials'));
            await expect(node.execute.call(executeFunctions)).rejects.toThrow(`URL parameter must be a string, got ${expectedType}`);
        });
    });
    describe('credential selection', () => {
        const setupRequest = (authentication) => {
            executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
            executeFunctions.getNodeParameter.mockImplementation((paramName) => {
                switch (paramName) {
                    case 'authentication':
                        return authentication;
                    case 'responseFormat':
                        return 'json';
                    case 'requestMethod':
                        return 'GET';
                    case 'url':
                        return 'http://example.com';
                    case 'jsonParameters':
                        return false;
                    case 'options':
                        return {};
                    case 'bodyParametersUi':
                    case 'headerParametersUi':
                    case 'queryParametersUi':
                        return { parameter: [] };
                    default:
                        return undefined;
                }
            });
            executeFunctions.helpers.request.mockResolvedValue({ success: true });
        };
        it('should retrieve only the selected credential type', async () => {
            setupRequest('headerAuth');
            executeFunctions.getCredentials.mockResolvedValue({
                name: 'Authorization',
                value: 'Bearer secret',
            });
            await node.execute.call(executeFunctions);
            expect(executeFunctions.getCredentials).toHaveBeenCalledOnce();
            expect(executeFunctions.getCredentials).toHaveBeenCalledWith('httpHeaderAuth');
        });
        it("should not retrieve credentials when authentication is 'none'", async () => {
            setupRequest('none');
            await node.execute.call(executeFunctions);
            expect(executeFunctions.getCredentials).not.toHaveBeenCalled();
        });
        it('should continue without authentication when the selected credential cannot be retrieved', async () => {
            setupRequest('headerAuth');
            executeFunctions.getCredentials.mockRejectedValue(new Error('No credentials'));
            await node.execute.call(executeFunctions);
            expect(executeFunctions.getCredentials).toHaveBeenCalledOnce();
            expect(executeFunctions.getCredentials).toHaveBeenCalledWith('httpHeaderAuth');
            expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(1);
        });
    });
});
//# sourceMappingURL=HttpRequestV1.test.js.map