import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDrive } from '../../MicrosoftOneDrive.node';
import type * as _importType0 from '../../GenericFunctions';

// Per-op SP "unit URL" tests. Because the `resource` string is byte-identical
// between OAuth2 and SP, these pin the threaded `driveScopeRoot` 8th argument so a
// call site that forgot to thread the root (silent /me fallback → 403 app-only)
// is caught. Covers the ops with NO workflow-level coverage.
vi.mock('../../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../../GenericFunctions')),
	microsoftApiRequest: vi.fn(),
	microsoftApiRequestAllItems: vi.fn(async () => []),
}));

const mockApiRequest = vi.mocked(genericFunctions.microsoftApiRequest);
const mockApiRequestAllItems = vi.mocked(genericFunctions.microsoftApiRequestAllItems);

const USER_ROOT = '/users/jane%40contoso.com';

describe('Test MicrosoftOneDrive, per-op Service Principal scope threading', () => {
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

	const params = (overrides: Record<string, unknown>) => {
		const base: Record<string, unknown> = {
			authentication: 'microsoftEntraServicePrincipalApi',
			resourceTarget: 'user',
			userTarget: 'jane@contoso.com',
			...overrides,
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
		mockApiRequest.mockResolvedValue({ id: 'x', name: 'x' });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// delete is a separate call site per resource (fileId vs folderId), so pin the
	// threaded root on BOTH so a missing root in either branch can't regress silently.
	it.each([
		['file', 'fileId'],
		['folder', 'folderId'],
	] as const)(
		'%s:delete threads the user root onto DELETE /drive/items/{id}',
		async (resource, idParam) => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				params({ resource, operation: 'delete', [idParam]: 'item-1' }),
			);

			await microsoftOneDrive.execute.call(mockExecuteFunctions);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'DELETE',
				'/drive/items/item-1',
				{},
				{},
				undefined,
				{},
				{ json: true },
				USER_ROOT,
			);
		},
	);

	it('file:copy encodes the path-interpolated item id (.. is escaped) and threads the root', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			params({
				resource: 'file',
				operation: 'copy',
				fileId: '../secret',
				additionalFields: {},
				// explicit destination driveId so no resolution GET is needed
				parentReference: { id: 'dest', driveId: 'b!explicit' },
			}),
		);
		mockApiRequest.mockResolvedValue({ headers: { location: 'https://graph/monitor/1' } });

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(mockApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/items/..%2Fsecret/copy',
			expect.objectContaining({
				parentReference: expect.objectContaining({ driveId: 'b!explicit' }),
			}),
			{},
			undefined,
			{},
			{ json: true, resolveWithFullResponse: true },
			USER_ROOT,
		);
	});

	it('rename threads the user root onto PATCH /drive/items/{id}', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			params({ resource: 'file', operation: 'rename', itemId: 'item-1', newName: 'new.txt' }),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(mockApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/drive/items/item-1',
			{ name: 'new.txt' },
			{},
			undefined,
			{},
			{ json: true },
			USER_ROOT,
		);
	});

	it('file:get threads the user root onto GET /drive/items/{id}', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			params({ resource: 'file', operation: 'get', fileId: 'item-1' }),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(mockApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/items/item-1',
			{},
			{},
			undefined,
			{},
			{ json: true },
			USER_ROOT,
		);
	});

	it('file:share threads the user root onto POST /drive/items/{id}/createLink', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			params({
				resource: 'file',
				operation: 'share',
				fileId: 'item-1',
				type: 'view',
				scope: 'anonymous',
			}),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(mockApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/items/item-1/createLink',
			{ type: 'view', scope: 'anonymous' },
			{},
			undefined,
			{},
			{ json: true },
			USER_ROOT,
		);
	});

	it('folder:create threads the user root onto POST /drive/root/children', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			params({ resource: 'folder', operation: 'create', name: 'NewFolder', options: {} }),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(mockApiRequest).toHaveBeenCalledWith(
			'POST',
			'/drive/root/children',
			{ name: 'NewFolder', folder: {} },
			{},
			undefined,
			{},
			{ json: true },
			USER_ROOT,
		);
	});

	it('folder:getChildren threads the user root through the paginator', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			params({ resource: 'folder', operation: 'getChildren', folderId: 'folder-1' }),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(mockApiRequestAllItems).toHaveBeenCalledWith(
			'value',
			'GET',
			'/drive/items/folder-1/children',
			{},
			{},
			USER_ROOT,
		);
	});

	it('file:download threads the user root onto both the item GET and the content GET', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			params({
				resource: 'file',
				operation: 'download',
				fileId: 'item-1',
				binaryPropertyName: 'data',
			}),
		);
		mockExecuteFunctions.helpers.prepareBinaryData = vi.fn(async () => ({ data: 'bin' })) as never;
		mockApiRequest.mockImplementation(async (_method, resource) => {
			if (resource === '/drive/items/item-1') {
				return { name: 'f.png', file: { mimeType: 'image/png' } };
			}
			// content path
			return { body: Buffer.from('x'), headers: { 'content-type': 'image/png' } };
		});

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		// item metadata GET scoped under the user root
		expect(mockApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/items/item-1',
			{},
			{},
			undefined,
			{},
			{ json: true },
			USER_ROOT,
		);
		// content GET also scoped under the same root
		expect(mockApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/items/item-1/content',
			{},
			{},
			undefined,
			{},
			{ encoding: null, resolveWithFullResponse: true },
			USER_ROOT,
		);
	});

	it('file:upload (text) threads the user root and preserves the :/path:/ shape', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			params({
				resource: 'file',
				operation: 'upload',
				parentId: 'parent-1',
				binaryData: false,
				fileName: 'report.txt',
				fileContent: 'hello',
			}),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(mockApiRequest).toHaveBeenCalledWith(
			'PUT',
			'/drive/items/parent-1:/report.txt:/content',
			'hello',
			{},
			undefined,
			{ 'Content-Type': 'text/plain' },
			{ json: true },
			USER_ROOT,
		);
	});
});
