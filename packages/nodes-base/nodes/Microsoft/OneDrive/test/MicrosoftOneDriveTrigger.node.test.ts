import type { IDataObject, IPollFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';

import { microsoftApiRequest, microsoftApiRequestAllItemsDelta } from '../GenericFunctions';
import { MicrosoftOneDriveTrigger } from '../MicrosoftOneDriveTrigger.node';

vi.mock('../GenericFunctions', async (importActual) => {
	return {
		...(await importActual()),
		microsoftApiRequest: vi.fn(),
		microsoftApiRequestAllItemsDelta: vi.fn(),
		getPath: vi.fn(),
	};
});

describe('MicrosoftOneDriveTrigger', () => {
	let trigger: MicrosoftOneDriveTrigger;
	let pollFunctions: DeepMockProxy<IPollFunctions>;
	let params: Record<string, unknown>;
	// RLC params resolve (with extractValue) to a plain id string in the poll layer.
	let rlcValues: Record<string, string>;

	const driveItem = {
		id: 'file-1',
		name: 'doc.txt',
		file: { mimeType: 'text/plain' },
		fileSystemInfo: {},
		parentReference: { path: '/drive/root:' },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		trigger = new MicrosoftOneDriveTrigger();
		pollFunctions = mockDeep<IPollFunctions>();

		vi.mocked(microsoftApiRequest).mockResolvedValue({ value: [driveItem] });

		pollFunctions.getWorkflowStaticData.mockReturnValue({});
		pollFunctions.getMode.mockReturnValue('manual');
		pollFunctions.getNode.mockReturnValue({ name: 'OneDrive Trigger' } as INode);
		pollFunctions.getCredentials.mockResolvedValue({
			oauthTokenData: { access_token: 'test-access-token' },
		});

		params = {
			authentication: 'microsoftOneDriveOAuth2Api',
			event: 'fileCreated',
			watch: 'anyFile',
			watchFolder: false,
			'options.folderChild': false,
			simple: false,
		};
		rlcValues = {};

		// Signature-aware poll mock: poll's getNodeParameter is (name, fallback, options).
		// Honor BOTH the fallback arg and `extractValue` (return the extracted id for RLC
		// params) — otherwise a poll/extractValue regression would pass green.
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

	it('should use the microsoftOneDriveOAuth2Api credential when selected', async () => {
		params.authentication = 'microsoftOneDriveOAuth2Api';

		await trigger.poll.call(pollFunctions);

		expect(pollFunctions.getCredentials).toHaveBeenCalledWith('microsoftOneDriveOAuth2Api');
	});

	it('should use the generic microsoftOAuth2Api credential when selected', async () => {
		params.authentication = 'microsoftOAuth2Api';

		await trigger.poll.call(pollFunctions);

		expect(pollFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
	});

	it('should fall back to microsoftOneDriveOAuth2Api when authentication is not set', async () => {
		params.authentication = undefined;

		await trigger.poll.call(pollFunctions);

		expect(pollFunctions.getCredentials).toHaveBeenCalledWith('microsoftOneDriveOAuth2Api');
	});

	it('should use the Service Principal credential and a scoped manual-mode delta URL', async () => {
		params.authentication = 'microsoftEntraServicePrincipalApi';
		params.resourceTarget = 'user';
		rlcValues.userTarget = 'jane@contoso.com';
		pollFunctions.getCredentials.mockResolvedValue({ accessToken: 'test-access-token' });

		await trigger.poll.call(pollFunctions);

		expect(pollFunctions.getCredentials).toHaveBeenCalledWith('microsoftEntraServicePrincipalApi');
		// manual mode issues a GET against the scoped, real-extracted-id delta root.
		// `microsoftApiRequest` is invoked via `.call(this, ...)`, so `this` is the
		// context (not an argument) — the recorded args start at the method.
		expect(microsoftApiRequest).toHaveBeenCalledWith(
			'GET',
			'',
			{},
			{},
			'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/drive/root/delta',
		);
	});

	it('returns null when the scoped delta feed has no matching resource', async () => {
		params.authentication = 'microsoftEntraServicePrincipalApi';
		params.resourceTarget = 'drive';
		rlcValues.driveTarget = 'b!abc';
		pollFunctions.getCredentials.mockResolvedValue({ accessToken: 'test-access-token' });
		// folder event but the feed only carries a file → filtered out → no-op
		params.event = 'folderCreated';
		vi.mocked(microsoftApiRequest).mockResolvedValue({ value: [driveItem] });

		const result = await trigger.poll.call(pollFunctions);

		expect(result).toBeNull();
	});

	it('resets a stale OAuth2 LastLink when the Service Principal scope is selected', async () => {
		params.authentication = 'microsoftEntraServicePrincipalApi';
		params.resourceTarget = 'user';
		rlcValues.userTarget = 'jane@contoso.com';
		pollFunctions.getCredentials.mockResolvedValue({ accessToken: 'test-access-token' });
		pollFunctions.getMode.mockReturnValue('trigger');
		// persisted link belongs to the previous /me (OAuth2) scope
		const staticData: IDataObject = {
			LastLink: 'https://graph.microsoft.com/v1.0/me/drive/root/delta?token=PREV',
			lastTimeChecked: '2020-01-01T00:00:00.000Z',
		};
		pollFunctions.getWorkflowStaticData.mockReturnValue(staticData);
		vi.mocked(microsoftApiRequestAllItemsDelta).mockResolvedValue({
			deltaLink:
				'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/drive/root/delta?token=NEW',
			returnData: [],
		});

		await trigger.poll.call(pollFunctions);

		// the stale /me link must be discarded and re-initialised to the scoped feed
		expect(microsoftApiRequestAllItemsDelta).toHaveBeenCalledWith(
			'https://graph.microsoft.com/v1.0/users/jane%40contoso.com/drive/root/delta?token=latest',
			expect.anything(),
			expect.anything(),
		);
	});

	it('reinitialises the delta link when the target id changes between polls', async () => {
		params.authentication = 'microsoftEntraServicePrincipalApi';
		params.resourceTarget = 'drive';
		rlcValues.driveTarget = 'b!NEW';
		pollFunctions.getCredentials.mockResolvedValue({ accessToken: 'test-access-token' });
		pollFunctions.getMode.mockReturnValue('trigger');
		// persisted link is scoped to a DIFFERENT drive id (a /drives/{id} root is
		// already a drive, so the delta path has no extra `/drive` segment)
		const staticData: IDataObject = {
			LastLink: 'https://graph.microsoft.com/v1.0/drives/b!OLD/root/delta?token=PREV',
			lastTimeChecked: '2020-01-01T00:00:00.000Z',
		};
		pollFunctions.getWorkflowStaticData.mockReturnValue(staticData);
		vi.mocked(microsoftApiRequestAllItemsDelta).mockResolvedValue({
			deltaLink: '',
			returnData: [],
		});

		await trigger.poll.call(pollFunctions);

		expect(microsoftApiRequestAllItemsDelta).toHaveBeenCalledWith(
			'https://graph.microsoft.com/v1.0/drives/b!NEW/root/delta?token=latest',
			expect.anything(),
			expect.anything(),
		);
	});

	it('keeps a still-valid scoped LastLink across polls', async () => {
		params.authentication = 'microsoftEntraServicePrincipalApi';
		params.resourceTarget = 'drive';
		rlcValues.driveTarget = 'b!abc';
		pollFunctions.getCredentials.mockResolvedValue({ accessToken: 'test-access-token' });
		pollFunctions.getMode.mockReturnValue('trigger');
		const stillValid = 'https://graph.microsoft.com/v1.0/drives/b!abc/root/delta?token=KEEP';
		const staticData: IDataObject = {
			LastLink: stillValid,
			lastTimeChecked: '2020-01-01T00:00:00.000Z',
		};
		pollFunctions.getWorkflowStaticData.mockReturnValue(staticData);
		vi.mocked(microsoftApiRequestAllItemsDelta).mockResolvedValue({
			deltaLink: '',
			returnData: [],
		});

		await trigger.poll.call(pollFunctions);

		expect(microsoftApiRequestAllItemsDelta).toHaveBeenCalledWith(
			stillValid,
			expect.anything(),
			expect.anything(),
		);
	});
});
