import type { IDataObject, IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

import {
	createMockExecuteFunctions,
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';
import * as companies from '../actions/companies';
import { execute as executeGetCompanyDetails } from '../actions/companies/getCompanyDetails.operation';
import { execute as executeUpdateCompanyDetails } from '../actions/companies/updateCompanyDetails.operation';
import { gravityZoneApiRequest } from '../transport';

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone companies operations', () => {
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

	describe('getCompanyDetails', () => {
		it('should include companyId when provided', async () => {
			stubParameters({ companyId: 'comp-123' });

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetCompanyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('companies', 'getCompanyDetails', {
				companyId: 'comp-123',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit companyId when empty', async () => {
			stubParameters({ companyId: '' });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetCompanyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('companies', 'getCompanyDetails', {});
		});

		it('should omit companyId when not provided', async () => {
			stubParameters({});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetCompanyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('companies', 'getCompanyDetails', {});
		});
	});

	describe('updateCompanyDetails', () => {
		it('should build request with options and parsed JSON values', async () => {
			stubParameters({
				options: {
					name: 'Acme Corp',
					address: '123 Market St',
					phone: '+1-555-0100',
					industry: 101,
					country: 'RO',
					state: 'NY',
					enforce2FA: false,
					skip2FAPeriod: 0,
					contactPersonJson: '{"name":"Ada Lovelace","email":"ada@example.com"}',
					mdrContactInformationJson: '{"email":"mdr@example.com","phone":"+1-555-0199"}',
				},
			});

			const apiResult: IDataObject = { updated: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUpdateCompanyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('companies', 'updateCompanyDetails', {
				name: 'Acme Corp',
				address: '123 Market St',
				phone: '+1-555-0100',
				industry: 101,
				country: 'RO',
				state: 'NY',
				enforce2FA: false,
				skip2FAPeriod: 0,
				contactPerson: {
					name: 'Ada Lovelace',
					email: 'ada@example.com',
				},
				mdrContactInformation: {
					email: 'mdr@example.com',
					phone: '+1-555-0199',
				},
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include falsey option values when provided', async () => {
			stubParameters({
				options: {
					name: '',
					industry: 0,
					enforce2FA: false,
					skip2FAPeriod: 0,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateCompanyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('companies', 'updateCompanyDetails', {
				name: '',
				industry: 0,
				enforce2FA: false,
				skip2FAPeriod: 0,
			});
		});

		it('should accept pre-parsed contact objects', async () => {
			const contactPerson: IDataObject = {
				name: 'Ada Lovelace',
				email: 'ada@example.com',
			};
			const mdrContactInformation: IDataObject = {
				email: 'mdr@example.com',
				phone: '+1-555-0199',
			};

			stubParameters({
				options: {
					contactPersonJson: contactPerson,
					mdrContactInformationJson: mdrContactInformation,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateCompanyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('companies', 'updateCompanyDetails', {
				contactPerson,
				mdrContactInformation,
			});
		});

		it('should omit empty pre-parsed contact objects', async () => {
			const contactPerson: IDataObject = {};
			const mdrContactInformation: IDataObject = {};

			stubParameters({
				options: {
					contactPersonJson: contactPerson,
					mdrContactInformationJson: mdrContactInformation,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateCompanyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'companies',
				'updateCompanyDetails',
				{},
			);
		});

		it('should omit empty contact objects', async () => {
			stubParameters({
				options: {
					name: 'Acme Corp',
					contactPersonJson: '{}',
					mdrContactInformationJson: '{}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateCompanyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('companies', 'updateCompanyDetails', {
				name: 'Acme Corp',
			});
		});

		it('should call API with empty params when no options are provided', async () => {
			stubParameters({});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateCompanyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'companies',
				'updateCompanyDetails',
				{},
			);
		});

		it('should throw when contactPersonJson is invalid JSON', async () => {
			stubParameters({
				options: {
					contactPersonJson: '{not-json',
				},
			});

			await expect(executeUpdateCompanyDetails.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when mdrContactInformationJson is invalid JSON', async () => {
			stubParameters({
				options: {
					mdrContactInformationJson: '{not-json',
				},
			});

			await expect(executeUpdateCompanyDetails.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when contactPersonJson is not JSON input', async () => {
			stubParameters({
				options: {
					contactPersonJson: 42,
				},
			});

			await expect(executeUpdateCompanyDetails.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when mdrContactInformationJson is not JSON input', async () => {
			stubParameters({
				options: {
					mdrContactInformationJson: 42,
				},
			});

			await expect(executeUpdateCompanyDetails.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(companies as Record<string, unknown>);

		for (const { name, module } of operations) {
			it(`executes ${name}`, async () => {
				await runOperationTest(name, module, mockExecuteFunctions, gravityZoneApiRequestMock);
			});
		}
	});
});
