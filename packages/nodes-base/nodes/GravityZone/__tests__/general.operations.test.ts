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
import * as general from '../actions/general';
import { execute as executeGenerateEmailVerificationCode } from '../actions/general/generateEmailVerificationCode.operation';
import { execute as executeGetApiKeyDetails } from '../actions/general/getApiKeyDetails.operation';
import { gravityZoneApiRequest } from '../transport';

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone general operations', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let constructExecutionMetaDataMock: jest.SpyInstance;

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

	const wrapExecutionData = (data: IDataObject | IDataObject[]) =>
		(Array.isArray(data) ? data : [data]).map((item) => ({ json: item }));

	const wrapPairedExecutionData = (data: IDataObject | IDataObject[], itemIndex: number) =>
		wrapExecutionData(data).map((item) => ({
			...item,
			pairedItem: { item: itemIndex },
		}));

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = createMockExecuteFunctions();

		constructExecutionMetaDataMock = jest.spyOn(
			mockExecuteFunctions.helpers,
			'constructExecutionMetaData',
		);
	});

	describe('getApiKeyDetails', () => {
		it('should request API key details with empty body', async () => {
			const apiResult: IDataObject = { id: 'key-123', name: 'Primary Key' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetApiKeyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('general', 'getApiKeyDetails', {});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should wrap array responses and preserve item index', async () => {
			const apiResult = [{ id: 'key-1' }, { id: 'key-2' }] as IDataObject[];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const result = await executeGetApiKeyDetails.call(mockExecuteFunctions, 3);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('general', 'getApiKeyDetails', {});
			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 3 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 3));
		});
	});

	describe('generateEmailVerificationCode', () => {
		it('should send the email and purpose payload', async () => {
			stubParameters({
				email: 'security@example.com',
				purpose: 1,
			});

			const apiResult: IDataObject = { status: 'sent' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGenerateEmailVerificationCode.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'general',
				'generateEmailVerificationCode',
				{ email: 'security@example.com', purpose: 1 },
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should forward non-default purpose values', async () => {
			stubParameters({
				email: 'alerts@example.com',
				purpose: 99,
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGenerateEmailVerificationCode.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'general',
				'generateEmailVerificationCode',
				{ email: 'alerts@example.com', purpose: 99 },
			);
		});

		it('should wrap responses and include the item index', async () => {
			stubParameters({
				email: 'primary@example.com',
				purpose: 1,
			});

			const apiResult = [{ status: 'queued' }] as IDataObject[];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const result = await executeGenerateEmailVerificationCode.call(mockExecuteFunctions, 2);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 2 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 2));
		});
	});

	describe('action description', () => {
		it('should list every general action in the action options', () => {
			const actionProperty = general.description.find((property) => property.name === 'action');

			expect(actionProperty?.default).toBe('getApiKeyDetails');
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

			expect(optionValues).toEqual(['generateEmailVerificationCode', 'getApiKeyDetails']);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(general as Record<string, unknown>);

		it('should include all general operations', () => {
			const operationNames = operations.map(({ name }) => name).sort();
			expect(operationNames).toEqual(['generateEmailVerificationCode', 'getApiKeyDetails']);
		});

		for (const { name, module } of operations) {
			it(`executes ${name}`, async () => {
				await runOperationTest(name, module, mockExecuteFunctions, gravityZoneApiRequestMock);
			});
		}
	});
});
