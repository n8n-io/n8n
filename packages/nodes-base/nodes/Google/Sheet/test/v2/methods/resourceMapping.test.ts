import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { getMappingColumns } from '../../../v2/methods/resourceMapping';

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

describe('Google Sheets, getMappingColumns', () => {
	let loadOptionsFunctions: MockProxy<ILoadOptionsFunctions>;

	beforeEach(() => {
		loadOptionsFunctions = mock<ILoadOptionsFunctions>();
	});

	afterEach(() => {
		vi.clearAllMocks();
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
