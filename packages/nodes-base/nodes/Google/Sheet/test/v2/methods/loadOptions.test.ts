import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	getSheetHeaderRow,
	getSheetHeaderRowAndAddColumn,
	getSheetHeaderRowAndSkipEmpty,
	getSheetHeaderRowWithGeneratedColumnNames,
	getSheetHeaderRowWithGeneratedColumnNamesForAllSheets,
	getSheets,
} from '../../../v2/methods/loadOptions';

vi.mock('../../../v2/helpers/GoogleSheets.utils');

const mockGoogleSheetInstance = {
	spreadsheetGetSheets: vi.fn(),
	spreadsheetGetSheet: vi.fn(),
	getData: vi.fn(),
	testFilter: vi.fn(),
};

vi.mock('../../../v2/helpers/GoogleSheet', () => ({
	GoogleSheet: vi.fn(function () {
		return mockGoogleSheetInstance;
	}),
}));

describe('Google Sheets Functions', () => {
	let mockLoadOptionsFunctions: Partial<ILoadOptionsFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockLoadOptionsFunctions = {
			getNodeParameter: vi.fn((paramName: string) => {
				if (paramName === 'documentId') {
					return { mode: 'mode', value: 'value' };
				}
				if (paramName === 'sheetName') {
					return { mode: 'Sheet1', value: 'Sheet1' };
				}
			}),
			getNode: vi.fn(),
		};
	});

	describe('getSheets', () => {
		it('should return an empty array if documentId is null', async () => {
			mockLoadOptionsFunctions.getNodeParameter = vi.fn().mockReturnValue(null);

			const result = await getSheets.call(mockLoadOptionsFunctions as ILoadOptionsFunctions);
			expect(result).toEqual([]);
		});

		it('should throw an error if no data is returned', async () => {
			mockGoogleSheetInstance.spreadsheetGetSheets.mockResolvedValue(undefined);

			await expect(
				getSheets.call(mockLoadOptionsFunctions as ILoadOptionsFunctions),
			).rejects.toThrow(NodeOperationError);
		});

		it('should return sheets with GRID type', async () => {
			mockGoogleSheetInstance.spreadsheetGetSheets.mockResolvedValue({
				sheets: [
					{ properties: { sheetType: 'GRID', title: 'Sheet1', sheetId: '123' } },
					{ properties: { sheetType: 'OTHER', title: 'Sheet2', sheetId: '456' } },
				],
			});

			const result = await getSheets.call(mockLoadOptionsFunctions as ILoadOptionsFunctions);
			expect(result).toEqual([{ name: 'Sheet1', value: '123' }]);
		});
	});

	describe('getSheetHeaderRow', () => {
		it('should return an empty array if documentId is null', async () => {
			mockLoadOptionsFunctions.getNodeParameter = vi.fn().mockReturnValue(null);

			const result = await getSheetHeaderRow.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);
			expect(result).toEqual([]);
		});

		it('should return an empty array if sheetName is null', async () => {
			mockLoadOptionsFunctions.getNodeParameter = vi
				.fn()
				.mockReturnValueOnce({ mode: 'mode', value: 'value' }) // documentId
				.mockReturnValueOnce('Sheet1') // sheetName extracted value
				.mockReturnValueOnce(undefined); // sheetName resource locator

			const result = await getSheetHeaderRow.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(result).toEqual([]);
			expect(mockGoogleSheetInstance.spreadsheetGetSheet).not.toHaveBeenCalled();
		});

		it('should throw an error if no data is returned', async () => {
			mockGoogleSheetInstance.spreadsheetGetSheet.mockResolvedValue({
				title: 'Sheet1',
			});
			mockGoogleSheetInstance.getData.mockResolvedValue(undefined);

			await expect(
				getSheetHeaderRow.call(mockLoadOptionsFunctions as ILoadOptionsFunctions),
			).rejects.toThrow(NodeOperationError);
		});

		it('should return column headers', async () => {
			mockGoogleSheetInstance.spreadsheetGetSheet.mockResolvedValue({
				title: 'Sheet1',
			});
			mockGoogleSheetInstance.getData.mockResolvedValue([['Header1', 'Header2', 'Header3']]);
			mockGoogleSheetInstance.testFilter.mockReturnValue(['Header1', 'Header2', 'Header3']);

			const result = await getSheetHeaderRow.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);
			expect(result).toEqual([
				{ name: 'Header1', value: 'Header1' },
				{ name: 'Header2', value: 'Header2' },
				{ name: 'Header3', value: 'Header3' },
			]);
		});
	});

	describe('getSheetHeaderRowAndAddColumn', () => {
		it('should add a new column and exclude the column to match on', async () => {
			mockGoogleSheetInstance.spreadsheetGetSheet.mockResolvedValue({
				title: 'Sheet1',
			});
			mockGoogleSheetInstance.getData.mockResolvedValue([['Header1']]);
			mockGoogleSheetInstance.testFilter.mockReturnValue(['Header1']);

			const result = await getSheetHeaderRowAndAddColumn.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(result).toEqual([
				{ name: 'Header1', value: 'Header1' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'New column ...', value: 'newColumn' },
			]);
		});
	});

	describe('getSheetHeaderRowWithGeneratedColumnNames', () => {
		it('should generate column names for empty values', async () => {
			mockGoogleSheetInstance.spreadsheetGetSheet.mockResolvedValue({
				title: 'Sheet1',
			});
			mockGoogleSheetInstance.getData.mockResolvedValue([['', 'Header1', '']]);
			mockGoogleSheetInstance.testFilter.mockReturnValue(['', 'Header1', '']);

			const result = await getSheetHeaderRowWithGeneratedColumnNames.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(result).toEqual([
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'col_1', value: 'col_1' },
				{ name: 'Header1', value: 'Header1' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'col_3', value: 'col_3' },
			]);
		});
	});

	describe('getSheetHeaderRowWithGeneratedColumnNamesForAllSheets', () => {
		it('should union columns across grid and data-source sheets, naming blanks 0-based to match runtime', async () => {
			// Chart-only (OBJECT) sheet is skipped; GRID and DATA_SOURCE are both read
			mockGoogleSheetInstance.spreadsheetGetSheets.mockResolvedValue({
				sheets: [
					{ properties: { title: 'Sheet1', sheetType: 'GRID' } },
					{ properties: { title: 'Connected', sheetType: 'DATA_SOURCE' } },
					{ properties: { title: 'Chart', sheetType: 'OBJECT' } },
				],
			});
			mockGoogleSheetInstance.getData
				.mockResolvedValueOnce([['', 'Header1', '']])
				.mockResolvedValueOnce([['Extra']]);
			mockGoogleSheetInstance.testFilter
				.mockReturnValueOnce(['', 'Header1', ''])
				.mockReturnValueOnce(['Extra']);

			const result = await getSheetHeaderRowWithGeneratedColumnNamesForAllSheets.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(result).toEqual([
				// Blank headers use `col_<0-based index>`, matching GoogleSheet.lookupValues
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'col_0', value: 'col_0' },
				{ name: 'Header1', value: 'Header1' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'col_2', value: 'col_2' },
				// The DATA_SOURCE sheet is read too, contributing its own column
				{ name: 'Extra', value: 'Extra' },
			]);
		});

		it('should treat a missing sheetType as a grid sheet', async () => {
			mockGoogleSheetInstance.spreadsheetGetSheets.mockResolvedValue({
				sheets: [{ properties: { title: 'Sheet1' } }],
			});
			mockGoogleSheetInstance.getData.mockResolvedValue([['Header1']]);
			mockGoogleSheetInstance.testFilter.mockReturnValue(['Header1']);

			const result = await getSheetHeaderRowWithGeneratedColumnNamesForAllSheets.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(result).toEqual([{ name: 'Header1', value: 'Header1' }]);
		});
	});

	describe('getSheetHeaderRowAndSkipEmpty', () => {
		it('should skip columns with empty values', async () => {
			mockGoogleSheetInstance.spreadsheetGetSheet.mockResolvedValue({
				title: 'Sheet1',
			});
			mockGoogleSheetInstance.getData.mockResolvedValue([['', 'Header1', '']]);
			mockGoogleSheetInstance.testFilter.mockReturnValue(['', 'Header1', '']);

			const result = await getSheetHeaderRowAndSkipEmpty.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(result).toEqual([{ name: 'Header1', value: 'Header1' }]);
		});
	});
});
