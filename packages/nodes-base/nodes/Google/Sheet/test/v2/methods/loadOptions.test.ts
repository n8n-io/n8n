import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	getSheetHeaderRow,
	getSheetHeaderRowAndAddColumn,
	getSheetHeaderRowAndSkipEmpty,
	getSheetHeaderRowWithGeneratedColumnNames,
	getSheets,
} from '../../../v2/methods/loadOptions';

jest.mock('../../../v2/helpers/GoogleSheets.utils');

const mockGoogleSheetInstance = {
	spreadsheetGetSheets: jest.fn(),
	spreadsheetGetSheet: jest.fn(),
	getData: jest.fn(),
	testFilter: jest.fn(),
};

jest.mock('../../../v2/helpers/GoogleSheet', () => ({
	GoogleSheet: jest.fn().mockImplementation(() => mockGoogleSheetInstance),
}));

describe('Google Sheets Functions', () => {
	let mockLoadOptionsFunctions: Partial<ILoadOptionsFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockLoadOptionsFunctions = {
			getNodeParameter: jest.fn((paramName: string) => {
				if (paramName === 'documentId') {
					return { mode: 'mode', value: 'value' };
				}
				if (paramName === 'sheetName') {
					return { mode: 'Sheet1', value: 'Sheet1' };
				}
			}),
			getNode: jest.fn(),
		};
	});

	describe('getSheets', () => {
		it('should return an empty array if documentId is null', async () => {
			mockLoadOptionsFunctions.getNodeParameter = jest.fn().mockReturnValue(null);

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
			mockLoadOptionsFunctions.getNodeParameter = jest.fn().mockReturnValue(null);

			const result = await getSheetHeaderRow.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);
			expect(result).toEqual([]);
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
