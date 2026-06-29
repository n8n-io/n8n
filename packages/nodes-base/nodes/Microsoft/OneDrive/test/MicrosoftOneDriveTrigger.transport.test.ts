import type { IPollFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { MicrosoftOneDriveTrigger } from '../MicrosoftOneDriveTrigger.node';

// Unlike MicrosoftOneDriveTrigger.node.test.ts (which mocks GenericFunctions), this
// suite uses the REAL transport so the credential-type → auth-helper selection is
// actually exercised. The app-only Service Principal delta call passes an absolute,
// already-scoped uri with NO driveScopeRoot; the helper must still be chosen by
// credential type, so it has to resolve through requestWithAuthentication (not
// requestOAuth2, which would reject a non-oAuth2Api credential at runtime).
describe('MicrosoftOneDriveTrigger transport (real GenericFunctions)', () => {
	let trigger: MicrosoftOneDriveTrigger;
	let pollFunctions: DeepMockProxy<IPollFunctions>;
	let requestWithAuthentication: Mock;
	let requestOAuth2: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		trigger = new MicrosoftOneDriveTrigger();
		pollFunctions = mockDeep<IPollFunctions>();

		requestWithAuthentication = vi.fn().mockResolvedValue({ value: [] });
		requestOAuth2 = vi.fn().mockResolvedValue({ value: [] });
		pollFunctions.helpers.requestWithAuthentication = requestWithAuthentication as never;
		pollFunctions.helpers.requestOAuth2 = requestOAuth2 as never;

		pollFunctions.getWorkflowStaticData.mockReturnValue({});
		pollFunctions.getMode.mockReturnValue('manual');
		pollFunctions.getNode.mockReturnValue({ name: 'OneDrive Trigger' } as INode);
		pollFunctions.getCredentials.mockResolvedValue({
			accessToken: 'test-access-token',
			graphApiBaseUrl: 'https://graph.microsoft.com',
		});

		const params: Record<string, unknown> = {
			authentication: 'microsoftEntraServicePrincipalApi',
			resourceTarget: 'user',
			event: 'fileCreated',
			watch: 'anyFile',
			watchFolder: false,
			'options.folderChild': false,
			simple: false,
		};
		const rlcValues: Record<string, string> = { userTarget: 'jane@contoso.com' };
		pollFunctions.getNodeParameter.mockImplementation(
			(name: string, fallback?: unknown, options?: { extractValue?: boolean }) => {
				if (options?.extractValue && name in rlcValues) {
					return rlcValues[name];
				}
				if (name in params) {
					return params[name] as NodeParameterValueType;
				}
				return fallback as NodeParameterValueType;
			},
		);
	});

	it('routes the SP manual-mode delta call through requestWithAuthentication, not requestOAuth2', async () => {
		await trigger.poll.call(pollFunctions);

		expect(requestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'microsoftEntraServicePrincipalApi',
			expect.objectContaining({
				uri: 'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/drive/root/delta',
			}),
		);
		expect(requestOAuth2).not.toHaveBeenCalled();
	});
});
