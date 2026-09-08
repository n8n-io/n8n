import { mockDeep } from 'vitest-mock-extended';
import { getPollResponse } from '../../trigger/GenericFunctions';
// Drives the REAL getPollResponse through the REAL v2 transport (only
// requestWithAuthentication is mocked) so the outgoing URL is genuinely built. The
// two existing trigger tests mock the transport and can only see the relative
// /messages path, so they cannot prove the Service Principal /users/{mailbox} rewrite.
describe('MicrosoftOutlookTrigger transport - Service Principal mailbox rewrite', () => {
    let mockPollFunctions;
    let mockRequestWithAuthentication;
    let mockNode;
    const pollStartDate = '2023-01-01T00:00:00Z';
    const pollEndDate = '2023-01-02T00:00:00Z';
    const messages = [
        {
            id: 'msg1',
            conversationId: 'conv1',
            subject: 'Test',
            bodyPreview: 'preview',
            from: { emailAddress: { name: 'Sender', address: 'sender@example.com' } },
            toRecipients: [{ emailAddress: { name: 'Rcpt', address: 'rcpt@example.com' } }],
            categories: [],
            hasAttachments: false,
        },
    ];
    const setupParams = (params) => {
        mockPollFunctions.getNodeParameter.mockImplementation(((name, fallback) => {
            if (name === 'authentication')
                return 'microsoftEntraServicePrincipalApi';
            if (name === 'mailbox')
                return 'user@example.com';
            return name in params ? params[name] : fallback;
        }));
    };
    beforeEach(() => {
        mockPollFunctions = mockDeep();
        mockRequestWithAuthentication = vi.fn().mockResolvedValue({ value: messages });
        mockPollFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;
        mockPollFunctions.helpers.returnJsonArray = vi
            .fn()
            .mockImplementation((data) => data.map((item, index) => ({ json: item, pairedItem: { item: index } })));
        mockNode = {
            id: 'test-node',
            name: 'Microsoft Outlook Trigger',
            type: 'n8n-nodes-base.microsoftOutlookTrigger',
            typeVersion: 1,
            position: [0, 0],
            parameters: {},
        };
        mockPollFunctions.getNode.mockReturnValue(mockNode);
        mockPollFunctions.getCredentials.mockResolvedValue({
            accessToken: 'test-access-token',
            graphApiBaseUrl: 'https://graph.microsoft.com',
        });
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.resetAllMocks();
    });
    it('targets /users/{encoded-mailbox}/messages in manual mode and resolves the SP credential', async () => {
        mockPollFunctions.getMode.mockReturnValue('manual');
        setupParams({ filters: {}, options: {}, output: 'simple' });
        await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);
        expect(mockRequestWithAuthentication).toHaveBeenCalledWith('microsoftEntraServicePrincipalApi', expect.objectContaining({
            method: 'GET',
            uri: 'https://graph.microsoft.com/v1.0/users/user%40example.com/messages',
            qs: expect.objectContaining({ $top: 1 }),
        }));
    });
    it('carries a B2B guest (#EXT#) mailbox through the poll path into an encoded /users/{mailbox}/messages uri', async () => {
        mockPollFunctions.getMode.mockReturnValue('manual');
        mockPollFunctions.getNodeParameter.mockImplementation(((name, fallback) => {
            if (name === 'authentication')
                return 'microsoftEntraServicePrincipalApi';
            if (name === 'mailbox')
                return 'user_contoso.com#EXT#@tenant.onmicrosoft.com';
            if (name === 'filters')
                return {};
            if (name === 'options')
                return {};
            if (name === 'output')
                return 'simple';
            return fallback;
        }));
        await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);
        expect(mockRequestWithAuthentication).toHaveBeenCalledWith('microsoftEntraServicePrincipalApi', expect.objectContaining({
            uri: 'https://graph.microsoft.com/v1.0/users/user_contoso.com%23EXT%23%40tenant.onmicrosoft.com/messages',
        }));
    });
    it('targets /users/{encoded-mailbox}/mailFolders/{id}/messages when folders are included', async () => {
        mockPollFunctions.getMode.mockReturnValue('manual');
        const folderId = 'AAMkADYyN2Q4ZTZl';
        setupParams({ filters: { foldersToInclude: [folderId] }, options: {}, output: 'simple' });
        await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);
        expect(mockRequestWithAuthentication).toHaveBeenCalledWith('microsoftEntraServicePrincipalApi', expect.objectContaining({
            uri: `https://graph.microsoft.com/v1.0/users/user%40example.com/mailFolders/${folderId}/messages`,
        }));
    });
    it('includes the date $filter and uses the /users/{mailbox} form in scheduled mode', async () => {
        mockPollFunctions.getMode.mockReturnValue('trigger');
        setupParams({ filters: {}, options: {}, output: 'simple' });
        await getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate);
        const callArgs = mockRequestWithAuthentication.mock.calls[0];
        expect(callArgs[0]).toBe('microsoftEntraServicePrincipalApi');
        expect(callArgs[1].uri).toBe('https://graph.microsoft.com/v1.0/users/user%40example.com/messages');
        const qs = callArgs[1].qs;
        expect(qs.$filter).toBe(`receivedDateTime ge ${pollStartDate} and receivedDateTime lt ${pollEndDate}`);
    });
    it('rejects with the required-mailbox error and makes no request when the mailbox is empty', async () => {
        mockPollFunctions.getMode.mockReturnValue('manual');
        mockPollFunctions.getNodeParameter.mockImplementation(((name, fallback) => {
            if (name === 'authentication')
                return 'microsoftEntraServicePrincipalApi';
            if (name === 'mailbox')
                return '';
            if (name === 'filters')
                return {};
            if (name === 'options')
                return {};
            if (name === 'output')
                return 'simple';
            return fallback;
        }));
        await expect(getPollResponse.call(mockPollFunctions, pollStartDate, pollEndDate)).rejects.toThrow('A mailbox is required for the Service Principal');
        expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=MicrosoftOutlookTrigger.transport.test.js.map