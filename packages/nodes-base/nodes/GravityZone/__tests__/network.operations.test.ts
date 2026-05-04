import { readdirSync } from 'fs';
import type { IDataObject, IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';
import * as path from 'path';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

import * as network from '../actions/network';
import { execute as executeAddIntegrators } from '../actions/network/addIntegrators.operation';
import { execute as executeAssignPolicy } from '../actions/network/assignPolicy.operation';
import { execute as executeCreateCustomGroup } from '../actions/network/createCustomGroup.operation';
import { execute as executeCreateReconfigureClientTask } from '../actions/network/createReconfigureClientTask.operation';
import { execute as executeCreateScanTask } from '../actions/network/createScanTask.operation';
import { execute as executeCreateScanTaskByMac } from '../actions/network/createScanTaskByMac.operation';
import { execute as executeCreateSubmitToSandboxAnalyzerTask } from '../actions/network/createSubmitToSandboxAnalyzerTask.operation';
import { execute as executeDeleteCustomGroup } from '../actions/network/deleteCustomGroup.operation';
import { execute as executeDeleteEndpoint } from '../actions/network/deleteEndpoint.operation';
import { execute as executeDeleteTask } from '../actions/network/deleteTask.operation';
import { execute as executeGetCustomGroupsList } from '../actions/network/getCustomGroupsList.operation';
import { execute as executeGetEndpointsList } from '../actions/network/getEndpointsList.operation';
import { execute as executeGetIntegrators } from '../actions/network/getIntegrators.operation';
import { execute as executeGetManagedEndpointDetails } from '../actions/network/getManagedEndpointDetails.operation';
import { execute as executeGetNetworkInventoryItems } from '../actions/network/getNetworkInventoryItems.operation';
import { execute as executeGetScanTasksList } from '../actions/network/getScanTasksList.operation';
import { execute as executeGetTaskStatus } from '../actions/network/getTaskStatus.operation';
import { execute as executeKillProcess } from '../actions/network/killProcess.operation';
import { execute as executeMoveCustomGroup } from '../actions/network/moveCustomGroup.operation';
import { execute as executeMoveEndpoints } from '../actions/network/moveEndpoints.operation';
import { execute as executeRemoveIntegrators } from '../actions/network/removeIntegrators.operation';
import { execute as executeRunLiveSearchQuery } from '../actions/network/runLiveSearchQuery.operation';
import { execute as executeSetEndpointLabel } from '../actions/network/setEndpointLabel.operation';
import { gravityZoneApiRequest } from '../transport';
import {
	createMockExecuteFunctions,
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone network operations', () => {
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

	describe('addIntegrators', () => {
		it('should split and trim target IDs', async () => {
			stubParameters({
				integrationId: 'integration-1',
				targetIds: 'id-1, id-2, , id-3 ',
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeAddIntegrators.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'addIntegrators', {
				integrationId: 'integration-1',
				targetIds: ['id-1', 'id-2', 'id-3'],
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('assignPolicy', () => {
		it('should include policy options and parsed target IDs', async () => {
			stubParameters({
				targetIds: 'id-1, id-2, , ',
				options: {
					policyId: 'policy-1',
					inheritFromAbove: false,
					forcePolicyInheritance: true,
				},
			});

			const apiResult: IDataObject = { updated: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeAssignPolicy.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'assignPolicy', {
				targetIds: ['id-1', 'id-2'],
				policyId: 'policy-1',
				inheritFromAbove: false,
				forcePolicyInheritance: true,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty policy ID', async () => {
			stubParameters({
				targetIds: 'id-10',
				options: {
					policyId: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeAssignPolicy.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'assignPolicy', {
				targetIds: ['id-10'],
			});
		});

		it('should include boolean options when explicitly set', async () => {
			stubParameters({
				targetIds: 'id-11',
				options: {
					inheritFromAbove: true,
					forcePolicyInheritance: false,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeAssignPolicy.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'assignPolicy', {
				targetIds: ['id-11'],
				inheritFromAbove: true,
				forcePolicyInheritance: false,
			});
		});

		it('should omit policy options when none are provided', async () => {
			stubParameters({
				targetIds: 'id-12',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeAssignPolicy.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'assignPolicy', {
				targetIds: ['id-12'],
			});
		});
	});

	describe('createCustomGroup', () => {
		it('should include parent ID when provided', async () => {
			stubParameters({
				groupName: 'Ops Group',
				parentId: 'parent-1',
			});

			const apiResult: IDataObject = { groupId: 'group-1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateCustomGroup.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'createCustomGroup', {
				groupName: 'Ops Group',
				parentId: 'parent-1',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty parent ID', async () => {
			stubParameters({
				groupName: 'Ops Group',
				parentId: '',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateCustomGroup.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'createCustomGroup', {
				groupName: 'Ops Group',
			});
		});
	});

	describe('createReconfigureClientTask', () => {
		it('should include parsed JSON options and product type', async () => {
			const scheduler = { timezone: 'UTC' };
			const modules = { firewall: true };
			const scanMode = { type: 'quick' };
			const roles = { desktop: true };

			stubParameters({
				targetIds: 'id-1, id-2, , ',
				options: {
					scheduler: JSON.stringify(scheduler),
					modules: JSON.stringify(modules),
					scanMode: JSON.stringify(scanMode),
					roles: JSON.stringify(roles),
					productType: 3,
				},
			});

			const apiResult: IDataObject = { taskId: 'task-1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateReconfigureClientTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'createReconfigureClientTask',
				{
					targetIds: ['id-1', 'id-2'],
					scheduler,
					modules,
					scanMode,
					roles,
					productType: 3,
				},
				'v1.1',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty JSON options', async () => {
			stubParameters({
				targetIds: 'id-3',
				options: {
					scheduler: '{}',
					modules: '{}',
					scanMode: '{}',
					roles: '{}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateReconfigureClientTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'createReconfigureClientTask',
				{
					targetIds: ['id-3'],
				},
				'v1.1',
			);
		});

		it('should send only target IDs when options are empty', async () => {
			stubParameters({
				targetIds: 'id-3b',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateReconfigureClientTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'createReconfigureClientTask',
				{
					targetIds: ['id-3b'],
				},
				'v1.1',
			);
		});

		it('should include product type when set to 0', async () => {
			stubParameters({
				targetIds: 'id-4',
				options: {
					productType: 0,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateReconfigureClientTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'createReconfigureClientTask',
				{
					targetIds: ['id-4'],
					productType: 0,
				},
				'v1.1',
			);
		});

		it.each([
			['Scheduler', { scheduler: '{not-json' }],
			['Modules', { modules: '{not-json' }],
			['Scan Mode', { scanMode: '{not-json' }],
			['Roles', { roles: '{not-json' }],
		])('should throw when %s is invalid JSON', async (label, invalidOptions) => {
			stubParameters({
				targetIds: 'id-5',
				options: invalidOptions,
			});

			await expect(
				executeCreateReconfigureClientTask.call(mockExecuteFunctions, 0),
			).rejects.toThrow(new RegExp(`Input '${label}'\\s+must contain a valid JSON`));
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('createScanTask', () => {
		it('should include scan options and parsed settings', async () => {
			const customScanSettings = { paths: ['C:\\temp'] };

			stubParameters({
				targetIds: 'id-1, id-2, , ',
				type: 4,
				options: {
					name: 'Weekly scan',
					customScanSettings: JSON.stringify(customScanSettings),
					returnAllTaskIds: true,
				},
			});

			const apiResult: IDataObject = { taskIds: ['task-1'] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateScanTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'createScanTask', {
				targetIds: ['id-1', 'id-2'],
				type: 4,
				name: 'Weekly scan',
				customScanSettings,
				returnAllTaskIds: true,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty custom scan settings', async () => {
			stubParameters({
				targetIds: 'id-3',
				type: 1,
				options: {
					name: '',
					customScanSettings: '{}',
					returnAllTaskIds: false,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateScanTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'createScanTask', {
				targetIds: ['id-3'],
				type: 1,
				returnAllTaskIds: false,
			});
		});

		it('should send only required params when options are empty', async () => {
			stubParameters({
				targetIds: 'id-4',
				type: 2,
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateScanTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'createScanTask', {
				targetIds: ['id-4'],
				type: 2,
			});
		});

		it('should throw when custom scan settings is invalid JSON', async () => {
			stubParameters({
				targetIds: 'id-5',
				type: 4,
				options: {
					customScanSettings: '{not-json',
				},
			});

			await expect(executeCreateScanTask.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Custom Scan Settings'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('createScanTaskByMac', () => {
		it('should include scan options and parsed MAC addresses', async () => {
			const customScanSettings = { depth: 'full' };

			stubParameters({
				macAddresses: '00:11:22:33:44:55, , 00:11:22:33:44:66, ',
				type: 2,
				options: {
					name: 'MAC scan',
					customScanSettings: JSON.stringify(customScanSettings),
					returnTaskId: true,
				},
			});

			const apiResult: IDataObject = { taskId: 'task-2' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateScanTaskByMac.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'createScanTaskByMac', {
				macAddresses: ['00:11:22:33:44:55', '00:11:22:33:44:66'],
				type: 2,
				name: 'MAC scan',
				customScanSettings,
				returnTaskId: true,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty custom scan settings', async () => {
			stubParameters({
				macAddresses: '00:11:22:33:44:77',
				type: 1,
				options: {
					name: '',
					customScanSettings: '{}',
					returnTaskId: false,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateScanTaskByMac.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'createScanTaskByMac', {
				macAddresses: ['00:11:22:33:44:77'],
				type: 1,
				returnTaskId: false,
			});
		});

		it('should send only required params when options are empty', async () => {
			stubParameters({
				macAddresses: '00:11:22:33:44:99',
				type: 3,
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateScanTaskByMac.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'createScanTaskByMac', {
				macAddresses: ['00:11:22:33:44:99'],
				type: 3,
			});
		});

		it('should throw when custom scan settings is invalid JSON', async () => {
			stubParameters({
				macAddresses: '00:11:22:33:44:aa',
				type: 4,
				options: {
					customScanSettings: '{not-json',
				},
			});

			await expect(executeCreateScanTaskByMac.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Custom Scan Settings'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('createSubmitToSandboxAnalyzerTask', () => {
		it('should split sample paths and command lines', async () => {
			stubParameters({
				targetId: 'endpoint-1',
				samplePaths: 'C:\\file1.exe, , C:\\file2.dll, ',
				options: {
					commandLines: 'C:\\file1.exe -arg, , C:\\file2.dll -arg2, ',
					taskName: 'Sandbox Task',
				},
			});

			const apiResult: IDataObject = { taskId: 'task-3' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateSubmitToSandboxAnalyzerTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'createSubmitToSandboxAnalyzerTask',
				{
					targetId: 'endpoint-1',
					samplePaths: ['C:\\file1.exe', 'C:\\file2.dll'],
					commandLines: ['C:\\file1.exe -arg', 'C:\\file2.dll -arg2'],
					taskName: 'Sandbox Task',
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty option values', async () => {
			stubParameters({
				targetId: 'endpoint-2',
				samplePaths: 'C:\\file3.exe',
				options: {
					commandLines: '',
					taskName: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateSubmitToSandboxAnalyzerTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'createSubmitToSandboxAnalyzerTask',
				{
					targetId: 'endpoint-2',
					samplePaths: ['C:\\file3.exe'],
				},
			);
		});

		it('should include task name without command lines', async () => {
			stubParameters({
				targetId: 'endpoint-3',
				samplePaths: 'C:\\file4.exe',
				options: {
					taskName: 'Sandbox only name',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateSubmitToSandboxAnalyzerTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'createSubmitToSandboxAnalyzerTask',
				{
					targetId: 'endpoint-3',
					samplePaths: ['C:\\file4.exe'],
					taskName: 'Sandbox only name',
				},
			);
		});

		it('should omit options when none are provided', async () => {
			stubParameters({
				targetId: 'endpoint-4',
				samplePaths: 'C:\\file5.exe',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateSubmitToSandboxAnalyzerTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'createSubmitToSandboxAnalyzerTask',
				{
					targetId: 'endpoint-4',
					samplePaths: ['C:\\file5.exe'],
				},
			);
		});
	});

	describe('deleteCustomGroup', () => {
		it('should include force option when provided', async () => {
			stubParameters({
				groupId: 'group-1',
				options: {
					force: true,
				},
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeDeleteCustomGroup.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'deleteCustomGroup', {
				groupId: 'group-1',
				force: true,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include force when false', async () => {
			stubParameters({
				groupId: 'group-1b',
				options: {
					force: false,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeDeleteCustomGroup.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'deleteCustomGroup', {
				groupId: 'group-1b',
				force: false,
			});
		});

		it('should omit force when not provided', async () => {
			stubParameters({
				groupId: 'group-2',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeDeleteCustomGroup.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'deleteCustomGroup', {
				groupId: 'group-2',
			});
		});
	});

	describe('deleteEndpoint', () => {
		it('should send endpoint ID', async () => {
			stubParameters({
				endpointId: 'endpoint-3',
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeDeleteEndpoint.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'deleteEndpoint', {
				endpointId: 'endpoint-3',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('deleteTask', () => {
		it('should send task ID', async () => {
			stubParameters({
				taskId: 'task-4',
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeDeleteTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'deleteTask', {
				taskId: 'task-4',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('getCustomGroupsList', () => {
		it('should include parent ID when provided', async () => {
			stubParameters({
				options: {
					parentId: 'parent-2',
				},
			});

			const apiResult: IDataObject = { groups: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetCustomGroupsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'getCustomGroupsList', {
				parentId: 'parent-2',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit parent ID when empty', async () => {
			stubParameters({
				options: {
					parentId: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetCustomGroupsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'getCustomGroupsList', {});
		});

		it('should omit parent ID when options are empty', async () => {
			stubParameters({
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetCustomGroupsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'getCustomGroupsList', {});
		});
	});

	describe('getEndpointsList', () => {
		it('should include filters, options, and pagination', async () => {
			const filters = { status: 'managed' };
			const queryOptions = { sort: 'name' };

			stubParameters({
				options: {
					parentId: 'parent-3',
					isManaged: false,
					filters: JSON.stringify(filters),
					queryOptions: JSON.stringify(queryOptions),
					page: 2,
					perPage: 25,
				},
			});

			const apiResult: IDataObject = { endpoints: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetEndpointsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getEndpointsList',
				{
					parentId: 'parent-3',
					isManaged: false,
					filters,
					options: queryOptions,
					page: 2,
					perPage: 25,
				},
				'v1.1',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty JSON options', async () => {
			stubParameters({
				options: {
					parentId: '',
					filters: '{}',
					queryOptions: '{}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetEndpointsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getEndpointsList',
				{},
				'v1.1',
			);
		});

		it('should omit all params when options are empty', async () => {
			stubParameters({
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetEndpointsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getEndpointsList',
				{},
				'v1.1',
			);
		});

		it('should include isManaged when true', async () => {
			stubParameters({
				options: {
					isManaged: true,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetEndpointsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getEndpointsList',
				{
					isManaged: true,
				},
				'v1.1',
			);
		});

		it('should throw when filters is invalid JSON', async () => {
			stubParameters({
				options: {
					filters: '{not-json',
				},
			});

			await expect(executeGetEndpointsList.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Filters'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when query options is invalid JSON', async () => {
			stubParameters({
				options: {
					queryOptions: '{not-json',
				},
			});

			await expect(executeGetEndpointsList.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Options'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('getIntegrators', () => {
		it('should send integration ID', async () => {
			stubParameters({
				integrationId: 'integration-2',
			});

			const apiResult: IDataObject = { integrators: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetIntegrators.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'getIntegrators', {
				integrationId: 'integration-2',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('getManagedEndpointDetails', () => {
		it('should include scan log option', async () => {
			stubParameters({
				endpointId: 'endpoint-4',
				options: {
					includeScanLogs: true,
				},
			});

			const apiResult: IDataObject = { endpointId: 'endpoint-4' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetManagedEndpointDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getManagedEndpointDetails',
				{
					endpointId: 'endpoint-4',
					options: {
						includeScanLogs: true,
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

		it('should include scan log option when false', async () => {
			stubParameters({
				endpointId: 'endpoint-4b',
				options: {
					includeScanLogs: false,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetManagedEndpointDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getManagedEndpointDetails',
				{
					endpointId: 'endpoint-4b',
					options: {
						includeScanLogs: false,
					},
				},
			);
		});

		it('should omit options when empty', async () => {
			stubParameters({
				endpointId: 'endpoint-5',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetManagedEndpointDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getManagedEndpointDetails',
				{
					endpointId: 'endpoint-5',
				},
			);
		});
	});

	describe('getNetworkInventoryItems', () => {
		it('should include filters, options, and pagination', async () => {
			const filters = { type: 'host' };
			const queryOptions = { includeDetails: true };

			stubParameters({
				options: {
					parentId: 'parent-4',
					filters: JSON.stringify(filters),
					queryOptions: JSON.stringify(queryOptions),
					page: 3,
					perPage: 20,
				},
			});

			const apiResult: IDataObject = { items: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetNetworkInventoryItems.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getNetworkInventoryItems',
				{
					parentId: 'parent-4',
					page: 3,
					perPage: 20,
					filters,
					options: queryOptions,
				},
				'v1.1',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty JSON options', async () => {
			stubParameters({
				options: {
					parentId: '',
					filters: '{}',
					queryOptions: '{}',
					page: 1,
					perPage: 10,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetNetworkInventoryItems.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getNetworkInventoryItems',
				{
					page: 1,
					perPage: 10,
				},
				'v1.1',
			);
		});

		it('should omit pagination when options are empty', async () => {
			stubParameters({
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetNetworkInventoryItems.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getNetworkInventoryItems',
				{},
				'v1.1',
			);
		});

		it('should throw when filters is invalid JSON', async () => {
			stubParameters({
				options: {
					filters: '{not-json',
				},
			});

			await expect(executeGetNetworkInventoryItems.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Filters'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when query options is invalid JSON', async () => {
			stubParameters({
				options: {
					queryOptions: '{not-json',
				},
			});

			await expect(executeGetNetworkInventoryItems.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Options'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('getScanTasksList', () => {
		it('should include filters and pagination', async () => {
			stubParameters({
				options: {
					name: 'Weekly',
					status: 2,
					page: 2,
					perPage: 15,
				},
			});

			const apiResult: IDataObject = { tasks: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetScanTasksList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'getScanTasksList', {
				name: 'Weekly',
				status: 2,
				page: 2,
				perPage: 15,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty name filter', async () => {
			stubParameters({
				options: {
					name: '',
					status: 1,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetScanTasksList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'getScanTasksList', {
				status: 1,
			});
		});

		it('should omit filters when options are empty', async () => {
			stubParameters({
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetScanTasksList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'getScanTasksList', {});
		});
	});

	describe('getTaskStatus', () => {
		it('should include task options and subtask filters', async () => {
			const subtaskFilters = { status: 'done' };

			stubParameters({
				taskId: 'task-5',
				options: {
					returnSubtasks: true,
					page: 2,
					perPage: 10,
					subtaskFilters: JSON.stringify(subtaskFilters),
				},
			});

			const apiResult: IDataObject = { status: 'running' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetTaskStatus.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getTaskStatus',
				{
					taskId: 'task-5',
					options: {
						returnSubtasks: true,
						page: 2,
						perPage: 10,
					},
					subtaskFilters,
				},
				'v1.1',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include returnSubtasks when false', async () => {
			stubParameters({
				taskId: 'task-5b',
				options: {
					returnSubtasks: false,
					page: 1,
					perPage: 5,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetTaskStatus.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getTaskStatus',
				{
					taskId: 'task-5b',
					options: {
						returnSubtasks: false,
						page: 1,
						perPage: 5,
					},
				},
				'v1.1',
			);
		});

		it('should include subtask filters without task options', async () => {
			const subtaskFilters = { status: 'queued' };

			stubParameters({
				taskId: 'task-5c',
				options: {
					subtaskFilters: JSON.stringify(subtaskFilters),
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetTaskStatus.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getTaskStatus',
				{
					taskId: 'task-5c',
					subtaskFilters,
				},
				'v1.1',
			);
		});

		it('should omit empty subtask filters and options', async () => {
			stubParameters({
				taskId: 'task-6',
				options: {
					subtaskFilters: '{}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetTaskStatus.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'network',
				'getTaskStatus',
				{
					taskId: 'task-6',
				},
				'v1.1',
			);
		});

		it('should throw when subtask filters is invalid JSON', async () => {
			stubParameters({
				taskId: 'task-7',
				options: {
					subtaskFilters: '{not-json',
				},
			});

			await expect(executeGetTaskStatus.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Subtask Filters'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('killProcess', () => {
		it('should include incident ID when provided', async () => {
			stubParameters({
				processId: 'process-1',
				path: 'C:\\programs\\app.exe',
				endpointId: 'endpoint-6',
				options: {
					incidentId: 'incident-1',
				},
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeKillProcess.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'killProcess', {
				processId: 'process-1',
				path: 'C:\\programs\\app.exe',
				endpointId: 'endpoint-6',
				incidentId: 'incident-1',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty incident ID', async () => {
			stubParameters({
				processId: 'process-2',
				path: 'C:\\programs\\app.exe',
				endpointId: 'endpoint-7',
				options: {
					incidentId: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeKillProcess.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'killProcess', {
				processId: 'process-2',
				path: 'C:\\programs\\app.exe',
				endpointId: 'endpoint-7',
			});
		});

		it('should omit incident ID when options are empty', async () => {
			stubParameters({
				processId: 'process-3',
				path: 'C:\\programs\\app.exe',
				endpointId: 'endpoint-8',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeKillProcess.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'killProcess', {
				processId: 'process-3',
				path: 'C:\\programs\\app.exe',
				endpointId: 'endpoint-8',
			});
		});
	});

	describe('moveCustomGroup', () => {
		it('should move group under parent', async () => {
			stubParameters({
				groupId: 'group-3',
				parentId: 'parent-5',
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeMoveCustomGroup.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'moveCustomGroup', {
				groupId: 'group-3',
				parentId: 'parent-5',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('moveEndpoints', () => {
		it('should split and trim endpoint IDs', async () => {
			stubParameters({
				endpointIds: 'id-1, id-2, , id-3',
				groupId: 'group-4',
			});

			const apiResult: IDataObject = { moved: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeMoveEndpoints.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'moveEndpoints', {
				endpointIds: ['id-1', 'id-2', 'id-3'],
				groupId: 'group-4',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('removeIntegrators', () => {
		it('should split and trim target IDs', async () => {
			stubParameters({
				targetIds: 'id-4, id-5, , id-6',
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeRemoveIntegrators.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'removeIntegrators', {
				targetIds: ['id-4', 'id-5', 'id-6'],
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('runLiveSearchQuery', () => {
		it('should include endpoint and OS filters', async () => {
			const s3UploadConfig = { bucket: 'logs', region: 'us-east-1' };

			stubParameters({
				companyId: 'company-1',
				query: 'SELECT * FROM processes;',
				s3UploadConfig: JSON.stringify(s3UploadConfig),
				options: {
					endpoints: 'id-7, , id-8, ',
					operatingSystems: 'windows, , linux, ',
				},
			});

			const apiResult: IDataObject = { queryId: 'query-1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeRunLiveSearchQuery.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'runLiveSearchQuery', {
				companyId: 'company-1',
				query: 'SELECT * FROM processes;',
				endpoints: ['id-7', 'id-8'],
				operatingSystems: ['windows', 'linux'],
				s3UploadConfig,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should default to empty endpoint and OS lists', async () => {
			const s3UploadConfig = { bucket: 'logs', region: 'us-east-1' };

			stubParameters({
				companyId: 'company-2',
				query: 'SELECT 1;',
				s3UploadConfig: JSON.stringify(s3UploadConfig),
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeRunLiveSearchQuery.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'runLiveSearchQuery', {
				companyId: 'company-2',
				query: 'SELECT 1;',
				endpoints: [],
				operatingSystems: [],
				s3UploadConfig,
			});
		});

		it('should throw when S3 upload config is invalid JSON', async () => {
			stubParameters({
				companyId: 'company-3',
				query: 'SELECT 1;',
				s3UploadConfig: '{not-json',
				options: {},
			});

			await expect(executeRunLiveSearchQuery.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'S3 Upload Config'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('setEndpointLabel', () => {
		it('should set endpoint label', async () => {
			stubParameters({
				endpointId: 'endpoint-8',
				label: 'Finance',
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeSetEndpointLabel.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('network', 'setEndpointLabel', {
				endpointId: 'endpoint-8',
				label: 'Finance',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(network as Record<string, unknown>);

		it('includes all network operation files', () => {
			const actionsDir = path.join(__dirname, '../actions/network');

			const operationFiles = readdirSync(actionsDir).filter(
				(file) => file.endsWith('.operation.ts') || file.endsWith('.operation.js'),
			);

			const expected = operationFiles
				.map((file) => file.replace(/\.operation\.(ts|js)$/, ''))
				.sort();

			const exported = operations.map(({ name }) => name).sort();

			expect(exported).toEqual(expected);
		});

		for (const { name, module } of operations) {
			it(`executes ${name}`, async () => {
				await runOperationTest(name, module, mockExecuteFunctions, gravityZoneApiRequestMock);
			});
		}
	});
});
