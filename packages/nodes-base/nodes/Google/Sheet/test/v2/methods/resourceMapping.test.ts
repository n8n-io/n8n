import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { getMappingColumns } from '../../../v2/methods/resourceMapping';

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

describe('Google Sheets, getMappingColumns', () => {
	let loadOptionsFunctions: MockProxy<ILoadOptionsFunctions>;

	beforeEach(() => {
		loadOptionsFunctions = mock<ILoadOptionsFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should map columns and add row number for update operation', async () => {
		loadOptionsFunctions.getNode.mockReturnValue({} as INode);
		loadOptionsFunctions.getNodeParameter
			.mockReturnValueOnce({ mode: 'id', value: 'spreadsheetId' }) // documentId
			.mockReturnValueOnce({ mode: 'name', value: 'Sheet1' }) // sheetName
			.mockReturnValueOnce({ mode: 'name' }) // sheetName mode
			.mockReturnValueOnce({}) // options.locationDefine.values
			.mockReturnValueOnce('update'); // operation

		mockGoogleSheetInstance.spreadsheetGetSheet.mockResolvedValueOnce({
			title: 'Sheet1',
			sheetId: 1,
		});
		mockGoogleSheetInstance.getData.mockResolvedValueOnce([['id', 'name', 'email']]);
		mockGoogleSheetInstance.testFilter.mockReturnValueOnce(['id', 'name', 'email']);

		const result = await getMappingColumns.call(loadOptionsFunctions);

		expect(result.fields).toHaveLength(4);
		expect(result.fields).toEqual([
			{
				canBeUsedToMatch: true,
				defaultMatch: true,
				display: true,
				displayName: 'id',
				id: 'id',
				required: false,
				type: 'string',
			},
			{
				canBeUsedToMatch: true,
				defaultMatch: false,
				display: true,
				displayName: 'name',
				id: 'name',
				required: false,
				type: 'string',
			},
			{
				canBeUsedToMatch: true,
				defaultMatch: false,
				display: true,
				displayName: 'email',
				id: 'email',
				required: false,
				type: 'string',
			},
			{
				canBeUsedToMatch: true,
				defaultMatch: false,
				display: true,
				displayName: 'row_number',
				id: 'row_number',
				readOnly: true,
				removed: true,
				required: false,
				type: 'number',
			},
		]);
	});

	it('should map columns and add row number for appendOrUpdate operation', async () => {
		loadOptionsFunctions.getNode.mockReturnValue({} as INode);
		loadOptionsFunctions.getNodeParameter
			.mockReturnValueOnce({ mode: 'id', value: 'spreadsheetId' }) // documentId
			.mockReturnValueOnce({ mode: 'name', value: 'Sheet1' }) // sheetName
			.mockReturnValueOnce({ mode: 'name' }) // sheetName mode
			.mockReturnValueOnce({ headerRow: 10 }) // options.locationDefine.values
			.mockReturnValueOnce('appendOrUpdate'); // operation

		mockGoogleSheetInstance.spreadsheetGetSheet.mockResolvedValueOnce({
			title: 'Sheet1',
			sheetId: 1,
		});
		mockGoogleSheetInstance.getData.mockResolvedValueOnce([['id', 'name', 'email']]);
		mockGoogleSheetInstance.testFilter.mockReturnValueOnce(['id', 'name', 'email']);

		const result = await getMappingColumns.call(loadOptionsFunctions);

		expect(result.fields).toHaveLength(3);
		expect(mockGoogleSheetInstance.getData).toHaveBeenCalledWith('Sheet1!10:10', 'FORMATTED_VALUE');
	});
});
