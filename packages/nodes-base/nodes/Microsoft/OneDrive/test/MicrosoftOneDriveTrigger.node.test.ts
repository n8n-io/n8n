import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import type { IPollFunctions, INode } from 'n8n-workflow';

import { microsoftApiRequest } from '../GenericFunctions';
import type * as GenericFunctions from '../GenericFunctions';
import { MicrosoftOneDriveTrigger } from '../MicrosoftOneDriveTrigger.node';

jest.mock('../GenericFunctions', () => {
	const actual = jest.requireActual<typeof GenericFunctions>('../GenericFunctions');
	return {
		...actual,
		microsoftApiRequest: jest.fn(),
		microsoftApiRequestAllItemsDelta: jest.fn(),
		getPath: jest.fn(),
	};
});

describe('MicrosoftOneDriveTrigger', () => {
	let trigger: MicrosoftOneDriveTrigger;
	let pollFunctions: DeepMockProxy<IPollFunctions>;
	let params: Record<string, string | boolean | undefined>;

	const driveItem = {
		id: 'file-1',
		name: 'doc.txt',
		file: { mimeType: 'text/plain' },
		fileSystemInfo: {},
		parentReference: { path: '/drive/root:' },
	};

	beforeEach(() => {
		jest.clearAllMocks();
		trigger = new MicrosoftOneDriveTrigger();
		pollFunctions = mockDeep<IPollFunctions>();

		jest.mocked(microsoftApiRequest).mockResolvedValue({ value: [driveItem] });

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
		pollFunctions.getNodeParameter.mockImplementation((name) => params[name]);
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
});
