import { readdirSync } from 'fs';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
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
import * as reports from '../actions/reports';
import { execute as executeCreateReport } from '../actions/reports/createReport.operation';
import { execute as executeDeleteReport } from '../actions/reports/deleteReport.operation';
import { execute as executeGetDownloadLinks } from '../actions/reports/getDownloadLinks.operation';
import { execute as executeGetReportsList } from '../actions/reports/getReportsList.operation';
import { gravityZoneApiRequest } from '../transport';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone reports operations', () => {
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

	const expectDisplayOptions = (description: INodeProperties[], action: string) => {
		for (const property of description) {
			expect(property.displayOptions?.show?.category).toEqual(['reports']);
			expect(property.displayOptions?.show?.action).toEqual([action]);
		}
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = createMockExecuteFunctions();
	});

	describe('createReport', () => {
		it('builds payload with trimmed target IDs', async () => {
			stubParameters({
				name: 'Monthly Status',
				type: 12,
				targetIds: 'id-1, id-2, , id-3 ',
				additionalFields: {},
			});

			const apiResult: IDataObject = { id: 'report-1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateReport.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'createReport', {
				name: 'Monthly Status',
				type: 12,
				targetIds: ['id-1', 'id-2', 'id-3'],
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('adds scheduled info, options, and email list when provided', async () => {
			stubParameters({
				name: 'Scheduled Report',
				type: 24,
				targetIds: 'id-10',
				additionalFields: {
					scheduledInfo: '{"frequency":"daily","timezone":"UTC"}',
					options: '{"includeDetails":true}',
					emailList: 'first@example.com, second@example.com , ',
				},
			});

			const apiResult: IDataObject = { id: 'report-2' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateReport.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'createReport', {
				name: 'Scheduled Report',
				type: 24,
				targetIds: ['id-10'],
				scheduledInfo: { frequency: 'daily', timezone: 'UTC' },
				options: { includeDetails: true },
				emailList: ['first@example.com', 'second@example.com'],
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('accepts object scheduled info and options', async () => {
			stubParameters({
				name: 'Object Extras',
				type: 18,
				targetIds: 'id-55',
				additionalFields: {
					scheduledInfo: { frequency: 'weekly' },
					options: { includeDetails: false },
					emailList: 'solo@example.com',
				},
			});

			const apiResult: IDataObject = { id: 'report-3' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateReport.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'createReport', {
				name: 'Object Extras',
				type: 18,
				targetIds: ['id-55'],
				scheduledInfo: { frequency: 'weekly' },
				options: { includeDetails: false },
				emailList: ['solo@example.com'],
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('adds email list without scheduled info or options', async () => {
			stubParameters({
				name: 'Email Only',
				type: 2,
				targetIds: 'id-90',
				additionalFields: {
					emailList: 'first@example.com, second@example.com ',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateReport.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'createReport', {
				name: 'Email Only',
				type: 2,
				targetIds: ['id-90'],
				emailList: ['first@example.com', 'second@example.com'],
			});
		});

		it('omits empty additional field objects and email list', async () => {
			stubParameters({
				name: 'Empty Extras',
				type: 1,
				targetIds: 'id-22',
				additionalFields: {
					scheduledInfo: '{}',
					options: '{}',
					emailList: '   ',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateReport.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'createReport', {
				name: 'Empty Extras',
				type: 1,
				targetIds: ['id-22'],
			});
		});

		it('omits empty additional field objects when provided as objects', async () => {
			stubParameters({
				name: 'Empty Objects',
				type: 13,
				targetIds: 'id-88',
				additionalFields: {
					scheduledInfo: {},
					options: {},
					emailList: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateReport.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'createReport', {
				name: 'Empty Objects',
				type: 13,
				targetIds: ['id-88'],
			});
		});

		it('throws when scheduled info is invalid JSON', async () => {
			stubParameters({
				name: 'Invalid Scheduled',
				type: 7,
				targetIds: 'id-33',
				additionalFields: {
					scheduledInfo: '{invalid-json',
				},
			});

			await expect(executeCreateReport.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Scheduled Info'.*valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('throws when scheduled info is not JSON input', async () => {
			stubParameters({
				name: 'Invalid Scheduled Type',
				type: 9,
				targetIds: 'id-66',
				additionalFields: {
					scheduledInfo: 123,
				},
			});

			await expect(executeCreateReport.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Scheduled Info'.*valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('throws when options are invalid JSON', async () => {
			stubParameters({
				name: 'Invalid Options',
				type: 7,
				targetIds: 'id-44',
				additionalFields: {
					options: '{bad-json',
				},
			});

			await expect(executeCreateReport.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Options'.*valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('throws when options are not JSON input', async () => {
			stubParameters({
				name: 'Invalid Options Type',
				type: 11,
				targetIds: 'id-77',
				additionalFields: {
					options: 500,
				},
			});

			await expect(executeCreateReport.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Options'.*valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('wraps array responses and preserves item index', async () => {
			stubParameters({
				name: 'Batch Report',
				type: 10,
				targetIds: 'id-5, id-6',
				additionalFields: {},
			});

			const apiResult: IDataObject[] = [{ id: 'report-5' }, { id: 'report-6' }];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await executeCreateReport.call(mockExecuteFunctions, 2);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 2 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 2));
		});
	});

	describe('getReportsList', () => {
		it('includes all provided options', async () => {
			stubParameters({
				options: {
					name: 'Weekly',
					type: 5,
					page: 2,
					perPage: 20,
				},
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetReportsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'getReportsList', {
				name: 'Weekly',
				type: 5,
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

		it('includes only name when provided', async () => {
			stubParameters({
				options: {
					name: 'Monthly',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetReportsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'getReportsList', {
				name: 'Monthly',
			});
		});

		it('includes only page when perPage is omitted', async () => {
			stubParameters({
				options: {
					page: 4,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetReportsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'getReportsList', {
				page: 4,
			});
		});

		it('includes only perPage when page is omitted', async () => {
			stubParameters({
				options: {
					perPage: 75,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetReportsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'getReportsList', {
				perPage: 75,
			});
		});

		it('includes only type when provided', async () => {
			stubParameters({
				options: {
					type: 8,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetReportsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'getReportsList', {
				type: 8,
			});
		});

		it('omits empty names and unknown options', async () => {
			stubParameters({
				options: {
					name: '',
					type: 6,
					page: 1,
					unexpected: 'ignore',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetReportsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'getReportsList', {
				type: 6,
				page: 1,
			});
		});

		it('sends an empty payload when options are omitted', async () => {
			stubParameters({});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetReportsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'getReportsList', {});
		});

		it('wraps array responses and preserves item index', async () => {
			stubParameters({});

			const apiResult: IDataObject[] = [{ id: 'report-1' }, { id: 'report-2' }];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await executeGetReportsList.call(mockExecuteFunctions, 3);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 3 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 3));
		});
	});

	describe('getDownloadLinks', () => {
		it('requests download links for a report', async () => {
			stubParameters({ reportId: 'report-55' });

			const apiResult: IDataObject = { downloadUrl: 'https://example.com/report' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetDownloadLinks.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'getDownloadLinks', {
				reportId: 'report-55',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('wraps array responses and preserves item index', async () => {
			stubParameters({ reportId: 'report-56' });

			const apiResult: IDataObject[] = [
				{ downloadUrl: 'https://example.com/report-1' },
				{ downloadUrl: 'https://example.com/report-2' },
			];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await executeGetDownloadLinks.call(mockExecuteFunctions, 1);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 1 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 1));
		});
	});

	describe('deleteReport', () => {
		it('requests delete for the report ID', async () => {
			stubParameters({ reportId: 'report-77' });

			const apiResult: IDataObject = { deleted: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeDeleteReport.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('reports', 'deleteReport', {
				reportId: 'report-77',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('wraps array responses and preserves item index', async () => {
			stubParameters({ reportId: 'report-78' });

			const apiResult: IDataObject[] = [{ deleted: true }, { deleted: false }];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await executeDeleteReport.call(mockExecuteFunctions, 4);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 4 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 4));
		});
	});

	describe('display options', () => {
		it('applies reports display options to createReport fields', () => {
			expectDisplayOptions(reports.createReport.description, 'createReport');
		});

		it('applies reports display options to deleteReport fields', () => {
			expectDisplayOptions(reports.deleteReport.description, 'deleteReport');
		});

		it('applies reports display options to getDownloadLinks fields', () => {
			expectDisplayOptions(reports.getDownloadLinks.description, 'getDownloadLinks');
		});

		it('applies reports display options to getReportsList fields', () => {
			expectDisplayOptions(reports.getReportsList.description, 'getReportsList');
		});
	});

	describe('action description', () => {
		it('lists reports actions in the action options', () => {
			const actionProperty = reports.description.find((property) => property.name === 'action');

			expect(actionProperty?.default).toBe('getReportsList');
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
				'createReport',
				'deleteReport',
				'getDownloadLinks',
				'getReportsList',
			]);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(reports as Record<string, unknown>);

		it('includes all reports operation files', () => {
			const actionsDir = path.join(__dirname, '../actions/reports');

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
