import { mockDeep } from 'vitest-mock-extended';
import { execute } from '../../../../v2/actions/messageAttachment/add.operation';
// Direct unit test for the large-file (chunked) upload path under the Service Principal
// credential. We let the REAL transport run (mocking only requestWithAuthentication) so the
// outgoing createUploadSession URL is genuinely rewritten to /users/{encoded-mailbox}/...,
// then assert the returned (non-Graph) uploadUrl is PUT to verbatim — never re-prefixed.
describe('Microsoft Outlook V2 - Service Principal MessageAttachment:add (large file)', () => {
    let mockExecuteFunctions;
    let mockRequestWithAuthentication;
    const mockNode = {
        id: 'test-node-id',
        name: 'Microsoft Outlook Test',
        type: 'n8n-nodes-base.microsoftOutlook',
        typeVersion: 2,
        position: [0, 0],
        parameters: {},
    };
    const messageId = 'AAMkAGI2TG93BBB=';
    // A non-Graph host, as Graph actually returns for attachment upload sessions.
    const uploadUrl = "https://outlook.office.com/api/v2.0/Users('user-id')/Messages('AAMkAGI2TG93BBB=')/AttachmentSessions('session-id')?authtoken=token";
    beforeEach(() => {
        mockExecuteFunctions = mockDeep();
        mockRequestWithAuthentication = vi.fn();
        mockExecuteFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;
        vi.clearAllMocks();
        mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
        mockExecuteFunctions.getNode.mockReturnValue(mockNode);
        mockExecuteFunctions.continueOnFail.mockReturnValue(false);
        mockExecuteFunctions.getNodeParameter.mockImplementation(((paramName) => {
            const params = {
                authentication: 'microsoftEntraServicePrincipalApi',
                mailbox: 'user@example.com',
                messageId,
                binaryPropertyName: 'data',
                options: {},
            };
            return params[paramName];
        }));
        mockExecuteFunctions.getCredentials.mockResolvedValue({
            accessToken: 'test-access-token',
            graphApiBaseUrl: 'https://graph.microsoft.com',
        });
        const largeBinaryData = Buffer.alloc(4 * 1024 * 1024);
        mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue({
            data: largeBinaryData.toString('base64'),
            mimeType: 'application/octet-stream',
            fileName: 'large-file.bin',
            fileExtension: 'bin',
        });
        mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(largeBinaryData);
        mockExecuteFunctions.helpers.constructExecutionMetaData.mockImplementation((data) => data);
        mockExecuteFunctions.helpers.returnJsonArray.mockImplementation((data) => [
            { json: data },
        ]);
        // First transport call (createUploadSession) returns the non-Graph uploadUrl.
        mockRequestWithAuthentication.mockResolvedValue({
            '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#microsoft.graph.uploadSession',
            expirationDateTime: '2023-12-19T13:00:00.0000000Z',
            nextExpectedRanges: ['0-'],
            uploadUrl,
        });
        // Chunked PUT goes through helpers.request, bypassing the transport entirely.
        mockExecuteFunctions.helpers.request.mockResolvedValue({
            id: 'attachment-id',
            name: 'large-file.bin',
        });
    });
    afterEach(() => {
        vi.resetAllMocks();
    });
    it('rewrites createUploadSession to /users/{encoded-mailbox} and PUTs to the uploadUrl verbatim', async () => {
        await execute.call(mockExecuteFunctions, 0, [{ json: {} }]);
        // createUploadSession was sent to the SP-rewritten, encoded-mailbox URL.
        expect(mockRequestWithAuthentication).toHaveBeenCalledWith('microsoftEntraServicePrincipalApi', expect.objectContaining({
            method: 'POST',
            uri: `https://graph.microsoft.com/v1.0/users/user%40example.com/messages/${messageId}/attachments/createUploadSession`,
        }));
        // The chunked PUT used the returned uploadUrl exactly, with no mailbox prefixing.
        expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(uploadUrl, expect.objectContaining({ method: 'PUT' }));
        const putUrl = mockExecuteFunctions.helpers.request.mock.calls[0][0];
        expect(putUrl).toBe(uploadUrl);
        expect(putUrl).not.toContain('/users/user%40example.com');
        expect(putUrl).not.toContain('graph.microsoft');
    });
});
//# sourceMappingURL=addLargeAttachment.test.js.map