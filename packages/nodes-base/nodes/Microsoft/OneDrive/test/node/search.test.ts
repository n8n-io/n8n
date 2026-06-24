import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDrive } from '../../MicrosoftOneDrive.node';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../../GenericFunctions')),
	microsoftApiRequest: vi.fn(),
	microsoftApiRequestAllItems: vi.fn(async () => []),
}));

const mockApiRequest = vi.mocked(genericFunctions.microsoftApiRequest);
const mockApiRequestAllItems = vi.mocked(genericFunctions.microsoftApiRequestAllItems);

describe('Test MicrosoftOneDrive, search guard under Service Principal', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let microsoftOneDrive: MicrosoftOneDrive;

	const mockNode = {
		id: 'test-node-id',
		name: 'Microsoft OneDrive Test',
		type: 'n8n-nodes-base.microsoftOneDrive',
		typeVersion: 1.1,
		position: [0, 0] as [number, number],
		parameters: {},
	};

	const spParams = (resource: 'file' | 'folder') => {
		const base: Record<string, unknown> = {
			resource,
			operation: 'search',
			authentication: 'microsoftEntraServicePrincipalApi',
			resourceTarget: 'user',
			userTarget: 'jane@contoso.com',
			query: 'report',
		};
		return (name: string, _itemIndex?: number, fallback?: unknown) =>
			(name in base ? base[name] : fallback) as NodeParameterValueType;
	};

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		microsoftOneDrive = new MicrosoftOneDrive();
		mockExecuteFunctions.helpers = {
			returnJsonArray: vi.fn((data) => [data]),
			constructExecutionMetaData: vi.fn((data) => data),
		} as never;
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it.each(['file', 'folder'] as const)(
		'blocks %s search with a friendly error before any Graph call',
		async (resource) => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(spParams(resource));

			const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);

			expect(error.message).toContain('Search is not supported with the Service Principal');
			// search uses the paginator — it must never fire
			expect(mockApiRequestAllItems).not.toHaveBeenCalled();
			expect(mockApiRequest).not.toHaveBeenCalled();
		},
	);

	it.each(['file', 'folder'] as const)(
		'routes the %s search block error to output under Continue On Fail',
		async (resource) => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			mockExecuteFunctions.getNodeParameter.mockImplementation(spParams(resource));

			const result = await microsoftOneDrive.execute.call(mockExecuteFunctions);

			expect(mockApiRequestAllItems).not.toHaveBeenCalled();
			expect(result[0][0]).toEqual({
				error: expect.stringContaining('Search is not supported with the Service Principal'),
			});
		},
	);
});
