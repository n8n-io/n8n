import { readdirSync } from 'fs';
import type { IDataObject, IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';
import { join } from 'path';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

import * as maintenanceWindows from '../actions/maintenance_windows';
import { execute as executeAssignMaintenanceWindows } from '../actions/maintenance_windows/assignMaintenanceWindows.operation';
import { execute as executeCreatePatchManagementMaintenanceWindow } from '../actions/maintenance_windows/createPatchManagementMaintenanceWindow.operation';
import { execute as executeDeleteMaintenanceWindow } from '../actions/maintenance_windows/deleteMaintenanceWindow.operation';
import { execute as executeGetMaintenanceWindowDetails } from '../actions/maintenance_windows/getMaintenanceWindowDetails.operation';
import { execute as executeGetMaintenanceWindowsList } from '../actions/maintenance_windows/getMaintenanceWindowsList.operation';
import { execute as executeGetManuallyApprovedPatches } from '../actions/maintenance_windows/getManuallyApprovedPatches.operation';
import { execute as executeUnassignMaintenanceWindows } from '../actions/maintenance_windows/unassignMaintenanceWindows.operation';
import { execute as executeUpdatePatchManagementMaintenanceWindow } from '../actions/maintenance_windows/updatePatchManagementMaintenanceWindow.operation';
import { gravityZoneApiRequest } from '../transport';
import {
	createMockExecuteFunctions,
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone maintenance windows operations', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	const stubParameters = (params: Record<string, NodeParameterValueType | object>) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(paramName: string, _itemIndex: number, defaultValue?: unknown) => {
				if (Object.prototype.hasOwnProperty.call(params, paramName)) {
					return params[paramName];
				}

				return defaultValue as NodeParameterValueType | object | undefined;
			},
		);
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = createMockExecuteFunctions();
	});

	describe('assignMaintenanceWindows', () => {
		it('should split and trim maintenance window IDs', async () => {
			stubParameters({
				policyId: 'policy-123',
				maintenanceWindowIds: 'mw-1, mw-2, , mw-3 ',
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeAssignMaintenanceWindows.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'assignMaintenanceWindows',
				{
					policyId: 'policy-123',
					maintenanceWindowIds: ['mw-1', 'mw-2', 'mw-3'],
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should handle empty maintenance window IDs', async () => {
			stubParameters({
				policyId: 'policy-123',
				maintenanceWindowIds: ' , ,   ',
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeAssignMaintenanceWindows.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'assignMaintenanceWindows',
				{
					policyId: 'policy-123',
					maintenanceWindowIds: [],
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('unassignMaintenanceWindows', () => {
		it('should split and trim maintenance window IDs', async () => {
			stubParameters({
				policyId: 'policy-456',
				maintenanceWindowIds: 'mw-4, mw-5, , mw-6',
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUnassignMaintenanceWindows.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'unassignMaintenanceWindows',
				{
					policyId: 'policy-456',
					maintenanceWindowIds: ['mw-4', 'mw-5', 'mw-6'],
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should handle empty maintenance window IDs', async () => {
			stubParameters({
				policyId: 'policy-456',
				maintenanceWindowIds: ' ,  ,',
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUnassignMaintenanceWindows.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'unassignMaintenanceWindows',
				{
					policyId: 'policy-456',
					maintenanceWindowIds: [],
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('createPatchManagementMaintenanceWindow', () => {
		it('should build request with parsed settings', async () => {
			stubParameters({
				name: 'Patch Window',
				allowChangeByOtherUsers: false,
				settings: '{"timezone":"UTC","window":"night"}',
			});

			const apiResult: IDataObject = { id: 'mw-1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreatePatchManagementMaintenanceWindow.call(
				mockExecuteFunctions,
				0,
			);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'createPatchManagementMaintenanceWindow',
				{
					name: 'Patch Window',
					allowChangeByOtherUsers: false,
					settings: {
						timezone: 'UTC',
						window: 'night',
					},
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should accept settings objects', async () => {
			const settings: IDataObject = {
				timezone: 'Europe/Bucharest',
				window: 'day',
			};

			stubParameters({
				name: 'Patch Window',
				allowChangeByOtherUsers: true,
				settings,
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreatePatchManagementMaintenanceWindow.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'createPatchManagementMaintenanceWindow',
				{
					name: 'Patch Window',
					allowChangeByOtherUsers: true,
					settings,
				},
			);
		});

		it('should throw when settings is invalid JSON', async () => {
			stubParameters({
				name: 'Patch Window',
				allowChangeByOtherUsers: true,
				settings: '{not-json',
			});

			await expect(
				executeCreatePatchManagementMaintenanceWindow.call(mockExecuteFunctions, 0),
			).rejects.toThrow(/Input 'Settings'\s+must contain a valid JSON/);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when settings is not JSON input', async () => {
			stubParameters({
				name: 'Patch Window',
				allowChangeByOtherUsers: true,
				settings: 42,
			});

			await expect(
				executeCreatePatchManagementMaintenanceWindow.call(mockExecuteFunctions, 0),
			).rejects.toThrow(/Input 'Settings'\s+must contain a valid JSON/);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('updatePatchManagementMaintenanceWindow', () => {
		it('should build request with parsed settings', async () => {
			stubParameters({
				name: 'Updated Window',
				allowChangeByOtherUsers: false,
				settings: '{"timezone":"UTC","window":"evening"}',
			});

			const apiResult: IDataObject = { updated: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUpdatePatchManagementMaintenanceWindow.call(
				mockExecuteFunctions,
				0,
			);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'updatePatchManagementMaintenanceWindow',
				{
					name: 'Updated Window',
					allowChangeByOtherUsers: false,
					settings: {
						timezone: 'UTC',
						window: 'evening',
					},
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should accept settings objects', async () => {
			const settings: IDataObject = {
				timezone: 'Europe/Bucharest',
				window: 'weekend',
			};

			stubParameters({
				name: 'Updated Window',
				allowChangeByOtherUsers: true,
				settings,
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdatePatchManagementMaintenanceWindow.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'updatePatchManagementMaintenanceWindow',
				{
					name: 'Updated Window',
					allowChangeByOtherUsers: true,
					settings,
				},
			);
		});

		it('should throw when settings is invalid JSON', async () => {
			stubParameters({
				name: 'Updated Window',
				allowChangeByOtherUsers: true,
				settings: '{not-json',
			});

			await expect(
				executeUpdatePatchManagementMaintenanceWindow.call(mockExecuteFunctions, 0),
			).rejects.toThrow(/Input 'Settings'\s+must contain a valid JSON/);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when settings is not JSON input', async () => {
			stubParameters({
				name: 'Updated Window',
				allowChangeByOtherUsers: true,
				settings: 101,
			});

			await expect(
				executeUpdatePatchManagementMaintenanceWindow.call(mockExecuteFunctions, 0),
			).rejects.toThrow(/Input 'Settings'\s+must contain a valid JSON/);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('getMaintenanceWindowsList', () => {
		it('should pass pagination and type options', async () => {
			stubParameters({
				options: {
					type: 0,
					page: 2,
					perPage: 25,
				},
			});

			const apiResult: IDataObject = { windows: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetMaintenanceWindowsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'getMaintenanceWindowsList',
				{
					type: 0,
					page: 2,
					perPage: 25,
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include page without other options when provided', async () => {
			stubParameters({
				options: {
					page: 3,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMaintenanceWindowsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'getMaintenanceWindowsList',
				{
					page: 3,
				},
			);
		});

		it('should include perPage without other options when provided', async () => {
			stubParameters({
				options: {
					perPage: 10,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMaintenanceWindowsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'getMaintenanceWindowsList',
				{
					perPage: 10,
				},
			);
		});

		it('should call API with empty params when no options', async () => {
			stubParameters({
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMaintenanceWindowsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'getMaintenanceWindowsList',
				{},
			);
		});

		it('should call API with empty params when options are missing', async () => {
			stubParameters({});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMaintenanceWindowsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'getMaintenanceWindowsList',
				{},
			);
		});
	});

	describe('getMaintenanceWindowDetails', () => {
		it('should include the maintenance window id', async () => {
			stubParameters({ id: 'mw-999' });

			const apiResult: IDataObject = { id: 'mw-999' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetMaintenanceWindowDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'getMaintenanceWindowDetails',
				{
					id: 'mw-999',
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('deleteMaintenanceWindow', () => {
		it('should include the maintenance window id', async () => {
			stubParameters({ id: 'mw-100' });

			const apiResult: IDataObject = { deleted: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeDeleteMaintenanceWindow.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'deleteMaintenanceWindow',
				{
					id: 'mw-100',
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('getManuallyApprovedPatches', () => {
		it('should include the company id', async () => {
			stubParameters({ companyId: 'comp-123' });

			const apiResult: IDataObject = { patches: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetManuallyApprovedPatches.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'maintenanceWindows',
				'getManuallyApprovedPatches',
				{
					companyId: 'comp-123',
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(maintenanceWindows as Record<string, unknown>);

		it('exports every maintenance windows operation module', () => {
			const actionsDir = join(__dirname, '../actions/maintenance_windows');

			const operationFiles = readdirSync(actionsDir).filter((file) =>
				file.endsWith('.operation.ts'),
			);

			const expectedOperations = operationFiles
				.map((file) => file.replace('.operation.ts', ''))
				.sort();

			const exportedOperations = operations.map(({ name }) => name).sort();

			expect(exportedOperations).toEqual(expectedOperations);
		});

		for (const { name, module } of operations) {
			it(`executes ${name}`, async () => {
				await runOperationTest(name, module, mockExecuteFunctions, gravityZoneApiRequestMock);
			});
		}
	});
});
