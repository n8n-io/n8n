import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getWorksheetColumnRow } from '../../../v2/methods/loadOptions';
import { microsoftApiRequest } from '../../../v2/transport';

// Mock the transport module
jest.mock('../../../v2/transport', () => ({
	microsoftApiRequest: jest.fn(),
}));

describe('Microsoft Excel V2 - loadOptions', () => {
	let mockContext: ILoadOptionsFunctions;
	const mockMicrosoftApiRequest = microsoftApiRequest as jest.MockedFunction<
		typeof microsoftApiRequest
	>;
	const mockGetNodeParameter = jest.fn();

	beforeEach(() => {
		mockContext = mock<ILoadOptionsFunctions>({
			getNodeParameter: mockGetNodeParameter,
		});
		mockMicrosoftApiRequest.mockReset();
		mockGetNodeParameter.mockReset();
	});

	describe('getWorksheetColumnRow', () => {
		it('should get columns from usedRange when range is empty', async () => {
			// Arrange
			const workbookId = 'test-workbook-id';
			const worksheetId = 'test-worksheet-id';
			const range = '';

			mockGetNodeParameter
				.mockReturnValueOnce(workbookId)
				.mockReturnValueOnce(worksheetId)
				.mockReturnValueOnce(range);

			const mockResponse = {
				values: [['Column A', 'Column B', 'Column C']],
			};

			mockMicrosoftApiRequest.mockResolvedValue(mockResponse);

			const result = await getWorksheetColumnRow.call(mockContext);

			expect(mockMicrosoftApiRequest).toHaveBeenCalledWith(
				'GET',
				`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/usedRange`,
				undefined,
				{ select: 'values' },
			);

			expect(result).toEqual([
				{ name: 'Column A', value: 'Column A' },
				{ name: 'Column B', value: 'Column B' },
				{ name: 'Column C', value: 'Column C' },
			]);
		});

		it('should get columns from specific range when range is provided', async () => {
			const workbookId = 'test-workbook-id';
			const worksheetId = 'test-worksheet-id';
			const range = 'A1:C1';

			mockGetNodeParameter
				.mockReturnValueOnce(workbookId)
				.mockReturnValueOnce(worksheetId)
				.mockReturnValueOnce(range);

			const mockResponse = {
				values: [['Header 1', 'Header 2', 'Header 3']],
			};

			mockMicrosoftApiRequest.mockResolvedValue(mockResponse);

			const result = await getWorksheetColumnRow.call(mockContext);

			expect(mockMicrosoftApiRequest).toHaveBeenCalledWith(
				'PATCH',
				`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
				{ select: 'values' },
			);

			expect(result).toEqual([
				{ name: 'Header 1', value: 'Header 1' },
				{ name: 'Header 2', value: 'Header 2' },
				{ name: 'Header 3', value: 'Header 3' },
			]);
		});

		it('should handle empty columns array', async () => {
			const workbookId = 'test-workbook-id';
			const worksheetId = 'test-worksheet-id';
			const range = '';

			mockGetNodeParameter
				.mockReturnValueOnce(workbookId)
				.mockReturnValueOnce(worksheetId)
				.mockReturnValueOnce(range);

			const mockResponse = {
				values: [[]],
			};

			mockMicrosoftApiRequest.mockResolvedValue(mockResponse);

			const result = await getWorksheetColumnRow.call(mockContext);

			expect(result).toEqual([]);
		});

		it('should handle single column', async () => {
			const workbookId = 'test-workbook-id';
			const worksheetId = 'test-worksheet-id';
			const range = 'A1:A1';

			mockGetNodeParameter
				.mockReturnValueOnce(workbookId)
				.mockReturnValueOnce(worksheetId)
				.mockReturnValueOnce(range);

			const mockResponse = {
				values: [['Single Column']],
			};

			mockMicrosoftApiRequest.mockResolvedValue(mockResponse);

			const result = await getWorksheetColumnRow.call(mockContext);

			expect(result).toEqual([{ name: 'Single Column', value: 'Single Column' }]);
		});
	});
});
