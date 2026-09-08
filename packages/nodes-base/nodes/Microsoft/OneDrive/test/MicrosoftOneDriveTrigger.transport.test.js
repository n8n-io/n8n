import { mockDeep } from 'vitest-mock-extended';
import { MicrosoftOneDriveTrigger } from '../MicrosoftOneDriveTrigger.node';
// Unlike MicrosoftOneDriveTrigger.node.test.ts (which mocks GenericFunctions), this
// suite uses the REAL transport so the credential-type → auth-helper selection is
// actually exercised. The app-only Service Principal delta call passes an absolute,
// already-scoped uri with NO driveScopeRoot; the helper must still be chosen by
// credential type, so it has to resolve through requestWithAuthentication (not
// requestOAuth2, which would reject a non-oAuth2Api credential at runtime).
describe('MicrosoftOneDriveTrigger transport (real GenericFunctions)', () => {
    let trigger;
    let pollFunctions;
    let requestWithAuthentication;
    let requestOAuth2;
    beforeEach(() => {
        vi.clearAllMocks();
        trigger = new MicrosoftOneDriveTrigger();
        pollFunctions = mockDeep();
        requestWithAuthentication = vi.fn().mockResolvedValue({ value: [] });
        requestOAuth2 = vi.fn().mockResolvedValue({ value: [] });
        pollFunctions.helpers.requestWithAuthentication = requestWithAuthentication;
        pollFunctions.helpers.requestOAuth2 = requestOAuth2;
        pollFunctions.getWorkflowStaticData.mockReturnValue({});
        pollFunctions.getMode.mockReturnValue('manual');
        pollFunctions.getNode.mockReturnValue({ name: 'OneDrive Trigger' });
        pollFunctions.getCredentials.mockResolvedValue({
            accessToken: 'test-access-token',
            graphApiBaseUrl: 'https://graph.microsoft.com',
        });
        const params = {
            authentication: 'microsoftEntraServicePrincipalApi',
            resourceTarget: 'user',
            event: 'fileCreated',
            watch: 'anyFile',
            watchFolder: false,
            'options.folderChild': false,
            simple: false,
        };
        const rlcValues = { userTarget: 'jane@contoso.com' };
        pollFunctions.getNodeParameter.mockImplementation((name, fallback, options) => {
            if (options?.extractValue && name in rlcValues) {
                return rlcValues[name];
            }
            if (name in params) {
                return params[name];
            }
            return fallback;
        });
    });
    it('routes the SP manual-mode delta call through requestWithAuthentication, not requestOAuth2', async () => {
        await trigger.poll.call(pollFunctions);
        expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
        expect(requestWithAuthentication).toHaveBeenCalledWith('microsoftEntraServicePrincipalApi', expect.objectContaining({
            uri: 'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/drive/root/delta',
        }));
        expect(requestOAuth2).not.toHaveBeenCalled();
    });
    it('carries a B2B guest (#EXT#) UPN through the poll path into an encoded delta-root uri', async () => {
        const params = {
            authentication: 'microsoftEntraServicePrincipalApi',
            resourceTarget: 'user',
            event: 'fileCreated',
            watch: 'anyFile',
            watchFolder: false,
            'options.folderChild': false,
            simple: false,
        };
        const rlcValues = {
            userTarget: 'user_contoso.com#EXT#@tenant.onmicrosoft.com',
        };
        pollFunctions.getNodeParameter.mockImplementation((name, fallback, options) => {
            if (options?.extractValue && name in rlcValues) {
                return rlcValues[name];
            }
            if (name in params) {
                return params[name];
            }
            return fallback;
        });
        await trigger.poll.call(pollFunctions);
        expect(requestWithAuthentication).toHaveBeenCalledWith('microsoftEntraServicePrincipalApi', expect.objectContaining({
            uri: 'https://graph.microsoft.com/v1.0/users/user_contoso.com%23EXT%23%40tenant.onmicrosoft.com/drive/root/delta',
        }));
        expect(requestOAuth2).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=MicrosoftOneDriveTrigger.transport.test.js.map