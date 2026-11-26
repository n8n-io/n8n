import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDrive } from '../../MicrosoftOneDrive.node';
import type * as _importType0 from '../../GenericFunctions';

jest.mock('../../GenericFunctions', () => ({
	...jest.requireActual<typeof _importType0>('../../GenericFunctions'),
	microsoftApiRequest: jest.fn(),
	microsoftApiRequestAllItems: jest.fn(async () => []),
}));

const mockApiRequestAllItems = jest.mocked(genericFunctions.microsoftApiRequestAllItems);

describe('Test MicrosoftOneDrive, search query escaping', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let microsoftOneDrive: MicrosoftOneDrive;

	const oauthParams = (resource: 'file' | 'folder', query: string) => {
		const base: Record<string, unknown> = {
			resource,
			operation: 'search',
			authentication: 'microsoftOneDriveOAuth2Api',
			query,
		};
		return (name: string, _itemIndex?: number, fallback?: unknown) =>
			(name in base ? base[name] : fallback) as NodeParameterValueType;
	};

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		microsoftOneDrive = new MicrosoftOneDrive();
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'Microsoft OneDrive Test',
			type: 'n8n-nodes-base.microsoftOneDrive',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {},
		});
		mockExecuteFunctions.helpers = {
			returnJsonArray: jest.fn((data) => [data]),
			constructExecutionMetaData: jest.fn((data) => data),
		} as never;
		jest.clearAllMocks();
		mockApiRequestAllItems.mockResolvedValue([]);
	});

	const sentPath = () => String(mockApiRequestAllItems.mock.calls[0][2]);

	it.each(['file', 'folder'] as const)(
		'keeps a quote in the %s query inside its literal',
		async (resource) => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(oauthParams(resource, "a'b"));

			await microsoftOneDrive.execute.call(mockExecuteFunctions);

			expect(sentPath()).toBe("/root/search(q='a''b')");
		},
	);

	it('percent-encodes a character that would otherwise rewrite the URL', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(oauthParams('file', 'a?b#c'));

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(sentPath()).toBe("/root/search(q='a%3Fb%23c')");
	});
});
