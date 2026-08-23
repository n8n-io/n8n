import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, IDataObject, NodeParameterValueType } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDrive } from '../../MicrosoftOneDrive.node';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../../GenericFunctions')),
	microsoftApiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(genericFunctions.microsoftApiRequest);

describe('Test MicrosoftOneDrive, file/folder > move (destination resolution)', () => {
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

	// Builds a getNodeParameter implementation honoring both execute signature
	// (name, itemIndex, fallback, options) and the resolveDriveScopeRoot reads.
	// Move exposes a flat `destinationFolderId` string (no Drive ID — cross-drive
	// moves aren't supported); the scope drive id is injected automatically.
	const buildParams = (overrides: Record<string, unknown>) => {
		const base: Record<string, unknown> = {
			resource: 'file',
			operation: 'move',
			fileId: 'item-1',
			folderId: 'item-1',
			destinationFolderId: '',
			additionalFields: {},
			resourceTarget: 'user',
			userTarget: 'jane@contoso.com',
			driveTarget: 'b!targetdrive',
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
		mockApiRequest.mockResolvedValue({ id: 'moved-item' });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('OAuth2: omits driveId from the body and issues a single PATCH (same-drive move)', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			buildParams({
				authentication: 'microsoftOneDriveOAuth2Api',
				destinationFolderId: 'dest-folder',
			}),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(mockApiRequest).toHaveBeenCalledTimes(1);
		const [method, resource, body, , , , , scopeRoot] = mockApiRequest.mock.calls[0];
		expect(method).toBe('PATCH');
		expect(resource).toBe('/drive/items/item-1');
		expect((body as IDataObject).parentReference).toEqual({ id: 'dest-folder' });
		// OAuth2 → no scope root threaded (transport will use /me)
		expect(scopeRoot).toBeUndefined();
	});

	it('SP with Access As: Drive: injects the target drive id as the scope drive, no GET', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			buildParams({
				authentication: 'microsoftEntraServicePrincipalApi',
				resourceTarget: 'drive',
				destinationFolderId: 'dest-folder',
			}),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		// no GET /drive?$select=id — the target id IS the scope drive id
		expect(mockApiRequest).toHaveBeenCalledTimes(1);
		const [method, resource, body, , , , , scopeRoot] = mockApiRequest.mock.calls[0];
		expect(method).toBe('PATCH');
		expect(resource).toBe('/drive/items/item-1');
		expect((body as IDataObject).parentReference).toEqual({
			id: 'dest-folder',
			driveId: 'b!targetdrive',
		});
		expect(scopeRoot).toBe('/drives/b!targetdrive');
	});

	it('SP with Access As: User: resolves the scope drive once via GET then PATCH, cached across items', async () => {
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { n: 1 } }, { json: { n: 2 } }]);
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			buildParams({
				authentication: 'microsoftEntraServicePrincipalApi',
				resourceTarget: 'user',
				destinationFolderId: 'dest-folder',
			}),
		);
		// first call resolves the default drive id; subsequent are PATCHes
		mockApiRequest.mockImplementation(async (_method, resource) => {
			if (resource === '/drive') return { id: 'b!resolved' };
			return { id: 'moved-item' };
		});

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		// 2 items → ONE resolution GET (cached) + 2 PATCHes = 3 calls
		expect(mockApiRequest).toHaveBeenCalledTimes(3);
		const getCalls = mockApiRequest.mock.calls.filter((c) => c[1] === '/drive');
		expect(getCalls).toHaveLength(1);
		// the GET is scoped under the chosen user and selects only id.
		// positional args: [method, resource, body, qs, uri, headers, option, driveScopeRoot]
		expect(getCalls[0][0]).toBe('GET');
		expect(getCalls[0][3]).toEqual({ $select: 'id' });
		expect(getCalls[0][7]).toBe('/users/jane%40contoso.com');
		// both PATCHes carry the resolved scope drive id
		const patchCalls = mockApiRequest.mock.calls.filter((c) => c[0] === 'PATCH');
		expect(patchCalls).toHaveLength(2);
		for (const call of patchCalls) {
			expect((call[2] as IDataObject).parentReference).toEqual({
				id: 'dest-folder',
				driveId: 'b!resolved',
			});
		}
	});

	it('SP unresolvable scope drive: throws a friendly error and issues no mutating PATCH', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			buildParams({
				authentication: 'microsoftEntraServicePrincipalApi',
				resourceTarget: 'user',
				destinationFolderId: 'dest-folder',
			}),
		);
		// resolution GET returns no id
		mockApiRequest.mockImplementation(async (_method, resource) => {
			if (resource === '/drive') return {};
			return { id: 'moved-item' };
		});

		const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);

		expect(error.message).toContain('destination Drive ID');
		// only the resolution GET happened — never a PATCH
		const patchCalls = mockApiRequest.mock.calls.filter((c) => c[0] === 'PATCH');
		expect(patchCalls).toHaveLength(0);
	});

	it('encodes a traversal-style item id in the URL path (.. is escaped)', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			buildParams({
				authentication: 'microsoftOneDriveOAuth2Api',
				fileId: '../secret',
				destinationFolderId: 'dest-folder',
			}),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		const [, resource] = mockApiRequest.mock.calls[0];
		expect(resource).toBe('/drive/items/..%2Fsecret');
	});

	it('applies an optional rename-on-move via additionalFields.name', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			buildParams({
				authentication: 'microsoftOneDriveOAuth2Api',
				destinationFolderId: 'dest-folder',
				additionalFields: { name: 'renamed.txt' },
			}),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		const [, , body] = mockApiRequest.mock.calls[0];
		expect((body as IDataObject).name).toBe('renamed.txt');
	});

	it('moves a folder via folderId and the shared move branch', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			buildParams({
				resource: 'folder',
				authentication: 'microsoftOneDriveOAuth2Api',
				folderId: 'folder-9',
				destinationFolderId: 'dest-folder',
			}),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		const [method, resource] = mockApiRequest.mock.calls[0];
		expect(method).toBe('PATCH');
		expect(resource).toBe('/drive/items/folder-9');
	});

	it('routes a failing move item to output and still moves a valid one under Continue On Fail', async () => {
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { n: 0 } }, { json: { n: 1 } }]);
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(name: string, itemIndex?: number, fallback?: unknown) => {
				const base: Record<string, unknown> = {
					resource: 'file',
					operation: 'move',
					destinationFolderId: 'dest-folder',
					additionalFields: {},
					authentication: 'microsoftOneDriveOAuth2Api',
				};
				if (name === 'fileId') return itemIndex === 0 ? 'good-item' : 'bad-item';
				return (name in base ? base[name] : fallback) as NodeParameterValueType;
			},
		);
		mockApiRequest.mockImplementation(async (_method, resource) => {
			if (resource === '/drive/items/bad-item') throw new Error('Graph 404');
			return { id: 'moved-item' };
		});

		const result = await microsoftOneDrive.execute.call(mockExecuteFunctions);

		// the valid item PATCHed; the failing one surfaced as an error row
		const patchCalls = mockApiRequest.mock.calls.filter((c) => c[1] === '/drive/items/good-item');
		expect(patchCalls).toHaveLength(1);
		expect(result[0][1]).toEqual({ error: 'Graph 404' });
	});

	it.each([
		['file', 'fileId'],
		['folder', 'folderId'],
	] as const)(
		'%s: rejects a no-op move (no destination folder and no name) before any request',
		async (resource, idParam) => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				buildParams({
					resource,
					authentication: 'microsoftOneDriveOAuth2Api',
					[idParam]: 'item-1',
					// no destination folder id, no rename name → silent no-op
					destinationFolderId: '',
					additionalFields: {},
				}),
			);

			const error = await microsoftOneDrive.execute.call(mockExecuteFunctions).catch((e) => e);

			expect(error.constructor.name).toBe('NodeOperationError');
			expect(error.message).toContain('Set a Destination Folder ID');
			expect(mockApiRequest).not.toHaveBeenCalled();
		},
	);

	it('allows a rename-in-place move with no destination folder id', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			buildParams({
				authentication: 'microsoftOneDriveOAuth2Api',
				destinationFolderId: '',
				additionalFields: { name: 'renamed.txt' },
			}),
		);

		await microsoftOneDrive.execute.call(mockExecuteFunctions);

		expect(mockApiRequest).toHaveBeenCalledTimes(1);
		const [method, resource, body] = mockApiRequest.mock.calls[0];
		expect(method).toBe('PATCH');
		expect(resource).toBe('/drive/items/item-1');
		// rename-only: a name, no parentReference
		expect((body as IDataObject).name).toBe('renamed.txt');
		expect((body as IDataObject).parentReference).toBeUndefined();
	});
});
