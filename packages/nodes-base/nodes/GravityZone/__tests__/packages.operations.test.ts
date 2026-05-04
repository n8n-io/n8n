import { readdirSync } from 'fs';
import type {
	IDataObject,
	IExecuteFunctions,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';
import * as path from 'path';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

import * as packages from '../actions/packages';
import { execute as executeCreatePackage } from '../actions/packages/createPackage.operation';
import { execute as executeDeletePackage } from '../actions/packages/deletePackage.operation';
import { execute as executeGetInstallationLinks } from '../actions/packages/getInstallationLinks.operation';
import { execute as executeGetPackageDetails } from '../actions/packages/getPackageDetails.operation';
import { execute as executeGetPackagesList } from '../actions/packages/getPackagesList.operation';
import { execute as executeUpdatePackage } from '../actions/packages/updatePackage.operation';
import { gravityZoneApiRequest } from '../transport';
import {
	createMockExecuteFunctions,
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

const jsonOptionFields = ['modules', 'scanMode', 'settings', 'roles', 'deploymentOptions'] as const;

describe('GravityZone packages operations', () => {
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

	describe('createPackage', () => {
		it('should build request with parsed JSON options', async () => {
			stubParameters({
				packageName: 'Enterprise Package',
				options: {
					description: 'Standard security package',
					language: 'fr_FR',
					modules: '{"firewall":true}',
					scanMode: '{"mode":"quick"}',
					settings: '{"silent":true}',
					roles: '{"admin":true}',
					deploymentOptions: '{"forceRestart":false}',
					productType: 3,
				},
			});

			const apiResult: IDataObject = { packageId: 'pkg-1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreatePackage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'createPackage', {
				packageName: 'Enterprise Package',
				description: 'Standard security package',
				language: 'fr_FR',
				modules: { firewall: true },
				scanMode: { mode: 'quick' },
				settings: { silent: true },
				roles: { admin: true },
				deploymentOptions: { forceRestart: false },
				productType: 3,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should accept object input for JSON options and include productType 0', async () => {
			stubParameters({
				packageName: 'Base Package',
				options: {
					modules: { firewall: false },
					scanMode: { mode: 'full' },
					settings: { telemetry: false },
					roles: { admin: false },
					deploymentOptions: { forceRestart: true },
					productType: 0,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreatePackage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'createPackage', {
				packageName: 'Base Package',
				modules: { firewall: false },
				scanMode: { mode: 'full' },
				settings: { telemetry: false },
				roles: { admin: false },
				deploymentOptions: { forceRestart: true },
				productType: 0,
			});
		});

		it('should omit empty description and language', async () => {
			stubParameters({
				packageName: 'Lean Package',
				options: {
					description: '',
					language: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreatePackage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'createPackage', {
				packageName: 'Lean Package',
			});
		});

		it('should send only required params when options are empty', async () => {
			stubParameters({
				packageName: 'Minimal Package',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreatePackage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'createPackage', {
				packageName: 'Minimal Package',
			});
		});

		it.each(jsonOptionFields)('should throw when %s is invalid JSON', async (field) => {
			const options: IDataObject = { [field]: '{not-json' };

			stubParameters({
				packageName: 'Broken Package',
				options,
			});

			await expect(executeCreatePackage.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it.each(jsonOptionFields)('should throw when %s is not JSON input', async (field) => {
			const options: IDataObject = { [field]: 42 };

			stubParameters({
				packageName: 'Broken Package',
				options,
			});

			await expect(executeCreatePackage.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('deletePackage', () => {
		it('should send the package ID', async () => {
			stubParameters({ packageId: 'pkg-123' });

			const apiResult: IDataObject = { deleted: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeDeletePackage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'deletePackage', {
				packageId: 'pkg-123',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('getInstallationLinks', () => {
		it('should include filters when provided', async () => {
			stubParameters({
				options: {
					companyId: 'company-1',
					packageName: 'Starter Package',
					ringId: 4,
				},
			});

			const apiResult: IDataObject = { links: ['https://example.com/pkg'] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetInstallationLinks.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'getInstallationLinks', {
				companyId: 'company-1',
				packageName: 'Starter Package',
				ringId: 4,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty company ID and package name', async () => {
			stubParameters({
				options: {
					companyId: '',
					packageName: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetInstallationLinks.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'packages',
				'getInstallationLinks',
				{},
			);
		});

		it('should include ringId when set to 0', async () => {
			stubParameters({
				options: {
					ringId: 0,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetInstallationLinks.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'getInstallationLinks', {
				ringId: 0,
			});
		});

		it('should call API with empty params when no options', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetInstallationLinks.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'packages',
				'getInstallationLinks',
				{},
			);
		});
	});

	describe('getPackageDetails', () => {
		it('should send the package ID', async () => {
			stubParameters({ packageId: 'pkg-456' });

			const apiResult: IDataObject = { name: 'Starter Package' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetPackageDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'getPackageDetails', {
				packageId: 'pkg-456',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('getPackagesList', () => {
		it('should include filters when provided', async () => {
			stubParameters({
				options: {
					companyId: 'company-1',
					page: 2,
					perPage: 25,
				},
			});

			const apiResult: IDataObject = { packages: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetPackagesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'getPackagesList', {
				companyId: 'company-1',
				page: 2,
				perPage: 25,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty company ID', async () => {
			stubParameters({
				options: {
					companyId: '',
					page: 1,
					perPage: 50,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetPackagesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'getPackagesList', {
				page: 1,
				perPage: 50,
			});
		});

		it('should call API with empty params when no options', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetPackagesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'getPackagesList', {});
		});

		it('should include numeric options when set to 0', async () => {
			stubParameters({
				options: {
					page: 0,
					perPage: 0,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetPackagesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'getPackagesList', {
				page: 0,
				perPage: 0,
			});
		});
	});

	describe('updatePackage', () => {
		it('should build request with parsed JSON options', async () => {
			stubParameters({
				packageId: 'pkg-789',
				packageName: 'Updated Package',
				options: {
					description: 'Updated description',
					language: 'de_DE',
					modules: '{"contentControl":true}',
					scanMode: '{"mode":"aggressive"}',
					settings: '{"silent":false}',
					roles: '{"admin":false}',
					deploymentOptions: '{"forceRestart":true}',
					productType: 5,
				},
			});

			const apiResult: IDataObject = { updated: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUpdatePackage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'updatePackage', {
				packageId: 'pkg-789',
				packageName: 'Updated Package',
				description: 'Updated description',
				language: 'de_DE',
				modules: { contentControl: true },
				scanMode: { mode: 'aggressive' },
				settings: { silent: false },
				roles: { admin: false },
				deploymentOptions: { forceRestart: true },
				productType: 5,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should accept object input for JSON options and include productType 0', async () => {
			stubParameters({
				packageId: 'pkg-790',
				packageName: 'Updated Package',
				options: {
					modules: { firewall: true },
					scanMode: { mode: 'full' },
					settings: { telemetry: true },
					roles: { admin: true },
					deploymentOptions: { forceRestart: false },
					productType: 0,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdatePackage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'updatePackage', {
				packageId: 'pkg-790',
				packageName: 'Updated Package',
				modules: { firewall: true },
				scanMode: { mode: 'full' },
				settings: { telemetry: true },
				roles: { admin: true },
				deploymentOptions: { forceRestart: false },
				productType: 0,
			});
		});

		it('should omit empty description and language', async () => {
			stubParameters({
				packageId: 'pkg-791',
				packageName: 'Updated Package',
				options: {
					description: '',
					language: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdatePackage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'updatePackage', {
				packageId: 'pkg-791',
				packageName: 'Updated Package',
			});
		});

		it('should send only required params when options are empty', async () => {
			stubParameters({
				packageId: 'pkg-794',
				packageName: 'Updated Package',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdatePackage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('packages', 'updatePackage', {
				packageId: 'pkg-794',
				packageName: 'Updated Package',
			});
		});

		it.each(jsonOptionFields)('should throw when %s is invalid JSON', async (field) => {
			const options: IDataObject = { [field]: '{not-json' };

			stubParameters({
				packageId: 'pkg-792',
				packageName: 'Updated Package',
				options,
			});

			await expect(executeUpdatePackage.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it.each(jsonOptionFields)('should throw when %s is not JSON input', async (field) => {
			const options: IDataObject = { [field]: 42 };

			stubParameters({
				packageId: 'pkg-793',
				packageName: 'Updated Package',
				options,
			});

			await expect(executeUpdatePackage.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('action description', () => {
		it('should list every package action in the action options', () => {
			const actionProperty = packages.description.find((property) => property.name === 'action');

			expect(actionProperty?.default).toBe('getPackagesList');
			expect(actionProperty?.type).toBe('options');

			const optionValues = Array.isArray(actionProperty?.options)
				? actionProperty.options
						.filter(
							(option): option is INodePropertyOptions =>
								typeof option === 'object' && option !== null && 'value' in option,
						)
						.map((option) => option.value)
						.filter((value): value is string => typeof value === 'string')
				: [];

			expect(optionValues).toEqual([
				'createPackage',
				'deletePackage',
				'getInstallationLinks',
				'getPackageDetails',
				'getPackagesList',
				'updatePackage',
			]);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(packages as Record<string, unknown>);

		it('includes all packages operation files', () => {
			const actionsDir = path.join(__dirname, '../actions/packages');

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
