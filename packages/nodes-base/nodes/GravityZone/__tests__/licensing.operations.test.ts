import type {
	IDataObject,
	IExecuteFunctions,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

import {
	createMockExecuteFunctions,
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';
import * as licensing from '../actions/licensing';
import { execute as executeAddProductKey } from '../actions/licensing/addProductKey.operation';
import { execute as executeGetLicenseInfo } from '../actions/licensing/getLicenseInfo.operation';
import { execute as executeGetMonthlyUsage } from '../actions/licensing/getMonthlyUsage.operation';
import { execute as executeGetMonthlyUsagePerProductType } from '../actions/licensing/getMonthlyUsagePerProductType.operation';
import { execute as executeRemoveProductKey } from '../actions/licensing/removeProductKey.operation';
import { execute as executeSetLicenseKey } from '../actions/licensing/setLicenseKey.operation';
import { gravityZoneApiRequest } from '../transport';

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone licensing operations', () => {
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

	describe('getLicenseInfo', () => {
		it('should include pagination and returnAllProducts when provided', async () => {
			stubParameters({
				options: {
					returnAllProducts: false,
					page: 2,
					perPage: 25,
				},
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetLicenseInfo.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getLicenseInfo', {
				returnAllProducts: false,
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

		it('should include pagination without returnAllProducts when omitted', async () => {
			stubParameters({
				options: {
					page: 4,
					perPage: 80,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetLicenseInfo.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getLicenseInfo', {
				page: 4,
				perPage: 80,
			});
		});

		it('should include returnAllProducts when set without pagination', async () => {
			stubParameters({
				options: {
					returnAllProducts: true,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetLicenseInfo.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getLicenseInfo', {
				returnAllProducts: true,
			});
		});

		it('should include page without perPage when provided', async () => {
			stubParameters({
				options: {
					page: 3,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetLicenseInfo.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getLicenseInfo', {
				page: 3,
			});
		});

		it('should include perPage without page when provided', async () => {
			stubParameters({
				options: {
					perPage: 75,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetLicenseInfo.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getLicenseInfo', {
				perPage: 75,
			});
		});

		it('should call API with empty params when no options are provided', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetLicenseInfo.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getLicenseInfo', {});
		});
	});

	describe('setLicenseKey', () => {
		it('should send license key and parsed MDR contact info', async () => {
			stubParameters({
				licenseKey: 'LIC-123',
				options: {
					mdrContactInformationJson: '{"email":"mdr@example.com"}',
				},
			});

			const apiResult: IDataObject = { updated: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeSetLicenseKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'setLicenseKey', {
				licenseKey: 'LIC-123',
				mdrContactInformation: { email: 'mdr@example.com' },
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should accept pre-parsed MDR contact info objects', async () => {
			const mdrContactInformation: IDataObject = {
				email: 'security@example.com',
				phone: '+1-555-0100',
			};

			stubParameters({
				licenseKey: 'LIC-456',
				options: {
					mdrContactInformationJson: mdrContactInformation,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeSetLicenseKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'setLicenseKey', {
				licenseKey: 'LIC-456',
				mdrContactInformation,
			});
		});

		it('should omit empty MDR contact info payloads', async () => {
			stubParameters({
				licenseKey: 'LIC-789',
				options: {
					mdrContactInformationJson: '{}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeSetLicenseKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'setLicenseKey', {
				licenseKey: 'LIC-789',
			});
		});

		it('should omit empty MDR contact info objects', async () => {
			stubParameters({
				licenseKey: 'LIC-654',
				options: {
					mdrContactInformationJson: {},
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeSetLicenseKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'setLicenseKey', {
				licenseKey: 'LIC-654',
			});
		});

		it('should send only the license key when no options are provided', async () => {
			stubParameters({
				licenseKey: 'LIC-000',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeSetLicenseKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'setLicenseKey', {
				licenseKey: 'LIC-000',
			});
		});

		it('should throw when MDR contact info is invalid JSON', async () => {
			stubParameters({
				licenseKey: 'LIC-987',
				options: {
					mdrContactInformationJson: '{not-json',
				},
			});

			await expect(executeSetLicenseKey.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when MDR contact info is not JSON input', async () => {
			stubParameters({
				licenseKey: 'LIC-321',
				options: {
					mdrContactInformationJson: 42,
				},
			});

			await expect(executeSetLicenseKey.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('addProductKey', () => {
		it('should include replaceIncompatibleKeys and parsed contact info', async () => {
			stubParameters({
				licenseKey: 'PROD-123',
				options: {
					replaceIncompatibleKeys: false,
					mdrContactInformationJson: '{"email":"ops@example.com"}',
				},
			});

			const apiResult: IDataObject = { added: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeAddProductKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'addProductKey', {
				licenseKey: 'PROD-123',
				replaceIncompatibleKeys: false,
				mdrContactInformation: { email: 'ops@example.com' },
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should accept pre-parsed MDR contact info objects', async () => {
			const mdrContactInformation: IDataObject = { email: 'alerts@example.com' };

			stubParameters({
				licenseKey: 'PROD-456',
				options: {
					mdrContactInformationJson: mdrContactInformation,
					replaceIncompatibleKeys: true,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeAddProductKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'addProductKey', {
				licenseKey: 'PROD-456',
				replaceIncompatibleKeys: true,
				mdrContactInformation,
			});
		});

		it('should omit empty MDR contact info payloads', async () => {
			stubParameters({
				licenseKey: 'PROD-789',
				options: {
					mdrContactInformationJson: {},
					replaceIncompatibleKeys: true,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeAddProductKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'addProductKey', {
				licenseKey: 'PROD-789',
				replaceIncompatibleKeys: true,
			});
		});

		it('should include replaceIncompatibleKeys without MDR contact info', async () => {
			stubParameters({
				licenseKey: 'PROD-222',
				options: {
					replaceIncompatibleKeys: false,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeAddProductKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'addProductKey', {
				licenseKey: 'PROD-222',
				replaceIncompatibleKeys: false,
			});
		});

		it('should send only the license key when no options are provided', async () => {
			stubParameters({
				licenseKey: 'PROD-101',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeAddProductKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'addProductKey', {
				licenseKey: 'PROD-101',
			});
		});

		it('should throw when MDR contact info is invalid JSON', async () => {
			stubParameters({
				licenseKey: 'PROD-999',
				options: {
					mdrContactInformationJson: '{not-json',
				},
			});

			await expect(executeAddProductKey.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when MDR contact info is not JSON input', async () => {
			stubParameters({
				licenseKey: 'PROD-777',
				options: {
					mdrContactInformationJson: 77,
				},
			});

			await expect(executeAddProductKey.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('removeProductKey', () => {
		it('should remove a product key for the company', async () => {
			stubParameters({ licenseKey: 'PROD-REMOVE' });

			const apiResult: IDataObject = { removed: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeRemoveProductKey.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'removeProductKey', {
				licenseKey: 'PROD-REMOVE',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('getMonthlyUsage', () => {
		it('should include targetMonth and optional filters', async () => {
			stubParameters({
				targetMonth: '04/2026',
				options: {
					usageCoverageType: 3,
					companyRegistrationStartDate: '2026-04-01T12:06:33',
					companyRegistrationEndDate: '2026-04-02T12:06:33',
				},
			});

			const apiResult: IDataObject = { usage: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetMonthlyUsage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getMonthlyUsage', {
				targetMonth: '04/2026',
				usageCoverageType: 3,
				companyRegistrationStartDate: '2026-04-01T12:06:33',
				companyRegistrationEndDate: '2026-04-02T12:06:33',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include only the start date when end date is missing', async () => {
			stubParameters({
				targetMonth: '07/2026',
				options: {
					companyRegistrationStartDate: '2026-07-01T00:00:00',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonthlyUsage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getMonthlyUsage', {
				targetMonth: '07/2026',
				companyRegistrationStartDate: '2026-07-01T00:00:00',
			});
		});

		it('should include only the end date when start date is missing', async () => {
			stubParameters({
				targetMonth: '08/2026',
				options: {
					companyRegistrationEndDate: '2026-08-31T23:59:59',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonthlyUsage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getMonthlyUsage', {
				targetMonth: '08/2026',
				companyRegistrationEndDate: '2026-08-31T23:59:59',
			});
		});

		it('should omit empty date filters but include coverage type', async () => {
			stubParameters({
				targetMonth: '05/2026',
				options: {
					usageCoverageType: 0,
					companyRegistrationStartDate: '',
					companyRegistrationEndDate: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonthlyUsage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getMonthlyUsage', {
				targetMonth: '05/2026',
				usageCoverageType: 0,
			});
		});

		it('should send only targetMonth when no options are provided', async () => {
			stubParameters({
				targetMonth: '06/2026',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonthlyUsage.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('licensing', 'getMonthlyUsage', {
				targetMonth: '06/2026',
			});
		});
	});

	describe('getMonthlyUsagePerProductType', () => {
		it('should include targetMonth when provided', async () => {
			stubParameters({
				options: {
					targetMonth: '03/2026',
				},
			});

			const apiResult: IDataObject = { usage: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetMonthlyUsagePerProductType.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'licensing',
				'getMonthlyUsagePerProductType',
				{ targetMonth: '03/2026' },
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty targetMonth values', async () => {
			stubParameters({
				options: {
					targetMonth: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonthlyUsagePerProductType.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'licensing',
				'getMonthlyUsagePerProductType',
				{},
			);
		});

		it('should call API with empty params when no targetMonth is set', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonthlyUsagePerProductType.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'licensing',
				'getMonthlyUsagePerProductType',
				{},
			);
		});
	});

	describe('action description', () => {
		it('should list every licensing action in the action options', () => {
			const actionProperty = licensing.description.find((property) => property.name === 'action');

			expect(actionProperty?.default).toBe('getLicenseInfo');
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
				'addProductKey',
				'getLicenseInfo',
				'getMonthlyUsage',
				'getMonthlyUsagePerProductType',
				'removeProductKey',
				'setLicenseKey',
			]);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(licensing as Record<string, unknown>);

		it('should include all licensing operations', () => {
			const operationNames = operations.map(({ name }) => name).sort();
			expect(operationNames).toEqual([
				'addProductKey',
				'getLicenseInfo',
				'getMonthlyUsage',
				'getMonthlyUsagePerProductType',
				'removeProductKey',
				'setLicenseKey',
			]);
		});

		for (const { name, module } of operations) {
			it(`executes ${name}`, async () => {
				await runOperationTest(name, module, mockExecuteFunctions, gravityZoneApiRequestMock);
			});
		}
	});
});
