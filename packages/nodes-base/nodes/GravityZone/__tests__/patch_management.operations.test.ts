import { readdirSync } from 'fs';
import type {
	IDataObject,
	IExecuteFunctions,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';
import * as path from 'path';

import {
	createMockExecuteFunctions,
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';
import * as patchManagement from '../actions/patch_management';
import { execute as executeGetInstalledPatches } from '../actions/patch_management/getInstalledPatches.operation';
import { execute as executeGetMissingPatches } from '../actions/patch_management/getMissingPatches.operation';
import { gravityZoneApiRequest } from '../transport';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone patch management operations', () => {
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
	});

	describe.each([
		{ name: 'getMissingPatches', execute: executeGetMissingPatches },
		{ name: 'getInstalledPatches', execute: executeGetInstalledPatches },
	])('$name', ({ name, execute }) => {
		it('includes parsed endpoint IDs, filters, and pagination', async () => {
			stubParameters({
				endpointsIds: 'id-1, id-2, , id-3 ',
				options: {
					filterType: 0,
					filterSeverity: 4,
					page: 2,
					perPage: 20,
				},
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('patchManagement', name, {
				endpointsIds: ['id-1', 'id-2', 'id-3'],
				filters: { type: 0, severity: 4 },
				page: 2,
				perPage: 20,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('includes endpoints when options are omitted', async () => {
			stubParameters({
				endpointsIds: 'endpoint-1, endpoint-2',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await execute.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('patchManagement', name, {
				endpointsIds: ['endpoint-1', 'endpoint-2'],
			});
		});

		it('includes only filter type when severity defaults to all', async () => {
			stubParameters({
				endpointsIds: 'endpoint-1',
				options: {
					filterType: 1,
					filterSeverity: -1,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await execute.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('patchManagement', name, {
				endpointsIds: ['endpoint-1'],
				filters: { type: 1 },
			});
		});

		it('includes zero-valued severity filters', async () => {
			stubParameters({
				endpointsIds: 'endpoint-9',
				options: {
					filterType: -1,
					filterSeverity: 0,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await execute.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('patchManagement', name, {
				endpointsIds: ['endpoint-9'],
				filters: { severity: 0 },
			});
		});

		it('includes only filter severity when type defaults to all', async () => {
			stubParameters({
				endpointsIds: ' ',
				options: {
					filterType: -1,
					filterSeverity: 5,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await execute.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('patchManagement', name, {
				filters: { severity: 5 },
			});
		});

		it('omits empty endpoints and filters when defaults are used', async () => {
			stubParameters({
				endpointsIds: ', ,',
				options: {
					filterType: -1,
					filterSeverity: -1,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await execute.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('patchManagement', name, {});
		});

		it('includes pagination without filters or endpoints when provided', async () => {
			stubParameters({
				endpointsIds: '',
				options: {
					page: 3,
					perPage: 100,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await execute.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('patchManagement', name, {
				page: 3,
				perPage: 100,
			});
		});

		it('wraps array responses and preserves item index', async () => {
			stubParameters({
				endpointsIds: 'endpoint-5',
			});

			const apiResult = [{ id: 'patch-1' }, { id: 'patch-2' }] as IDataObject[];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await execute.call(mockExecuteFunctions, 2);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 2 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 2));
		});
	});

	describe('action description', () => {
		it('lists patch management actions in the action options', () => {
			const actionProperty = patchManagement.description.find(
				(property) => property.name === 'action',
			);

			expect(actionProperty?.default).toBe('getMissingPatches');
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

			expect(optionValues).toEqual(['getInstalledPatches', 'getMissingPatches']);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(patchManagement as Record<string, unknown>);

		it('includes all patch management operation files', () => {
			const actionsDir = path.join(__dirname, '../actions/patch_management');

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
