import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDrive } from '../../MicrosoftOneDrive.node';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../../GenericFunctions')),
	microsoftApiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(genericFunctions.microsoftApiRequest);

describe('Test MicrosoftOneDrive, file > copy item-id encoding', () => {
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

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		microsoftOneDrive = new MicrosoftOneDrive();
		mockExecuteFunctions.helpers = {
			returnJsonArray: vi.fn((data) => [data]),
			constructExecutionMetaData: vi.fn((data) => data),
		} as never;
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockApiRequest.mockResolvedValue({ headers: { location: 'https://graph/monitor/1' } });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('OAuth2: encodes an item id containing a slash in the copy URL path', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(((name: string) => {
			const base: Record<string, unknown> = {
				resource: 'file',
				operation: 'copy',
				authentication: 'microsoftOneDriveOAuth2Api',
				fileId: 'a/secret',
				additionalFields: {},
				parentReference: {},
			};
			return base[name];
		}) as never);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		const [method, resource, , , , , , scopeRoot] = mockApiRequest.mock.calls[0];
		expect(method).toBe('POST');
		expect(String(resource)).toBe('/items/a%2Fsecret/copy');
		expect(scopeRoot).toBeUndefined();
	});

	it('OAuth2: leaves an exclamation-mark item id intact (matches existing behavior)', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(((name: string) => {
			const base: Record<string, unknown> = {
				resource: 'file',
				operation: 'copy',
				authentication: 'microsoftOneDriveOAuth2Api',
				fileId: '170B5C65E30736A3!257',
				additionalFields: {},
				parentReference: {},
			};
			return base[name] as NodeParameterValueType;
		}) as never);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		const [, resource] = mockApiRequest.mock.calls[0];
		// encodeURIComponent leaves `!` untouched, so common OneDrive ids are unchanged
		expect(String(resource)).toBe('/items/170B5C65E30736A3!257/copy');
	});
});
