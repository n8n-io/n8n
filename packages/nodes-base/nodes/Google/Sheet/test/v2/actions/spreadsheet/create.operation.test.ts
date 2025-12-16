import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/spreadsheet/create.operation';
import { apiRequest } from '../../../../v2/transport';

jest.mock('../../../../v2/transport', () => ({
	apiRequest: {
		call: jest.fn(),
	},
}));

describe('Spreadsheet Create Operation', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunctions = {
			getInputData: jest.fn().mockReturnValue([{}]),
			getNodeParameter: jest.fn(),
			helpers: {
				constructExecutionMetaData: jest.fn().mockImplementation((data) => data),
			},
		} as unknown as IExecuteFunctions;

		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should create a basic spreadsheet with title only', async () => {
			const mockTitle = 'Test Spreadsheet';
			const mockResponse = { spreadsheetId: '1234', title: mockTitle };

			mockExecuteFunctions.getNodeParameter = jest
				.fn()
				.mockReturnValueOnce(mockTitle)
				.mockReturnValueOnce({})
				.mockReturnValueOnce({});

			(apiRequest.call as jest.Mock).mockResolvedValueOnce(mockResponse);

			const result = await execute.call(mockExecuteFunctions);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				'/v4/spreadsheets',
				{
					properties: {
						title: mockTitle,
						autoRecalc: undefined,
						locale: undefined,
					},
					sheets: [],
				},
			);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ json: mockResponse });
		});

		it('should create spreadsheet with multiple sheets', async () => {
			const mockSheets = {
				sheetValues: [
					{ title: 'Sheet1', hidden: false },
					{ title: 'Sheet2', hidden: true },
				],
			};

			mockExecuteFunctions.getNodeParameter = jest
				.fn()
				.mockReturnValueOnce('Test Spreadsheet')
				.mockReturnValueOnce(mockSheets)
				.mockReturnValueOnce({});

			const mockResponse = { spreadsheetId: '1234' };
			(apiRequest.call as jest.Mock).mockResolvedValueOnce(mockResponse);

			await execute.call(mockExecuteFunctions);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				'/v4/spreadsheets',
				{
					properties: {
						title: 'Test Spreadsheet',
						autoRecalc: undefined,
						locale: undefined,
					},
					sheets: [
						{ properties: { title: 'Sheet1', hidden: false } },
						{ properties: { title: 'Sheet2', hidden: true } },
					],
				},
			);
		});

		it('should handle all options when creating spreadsheet', async () => {
			const mockOptions = {
				locale: 'en_US',
				autoRecalc: 'ON_CHANGE',
			};

			mockExecuteFunctions.getNodeParameter = jest
				.fn()
				.mockReturnValueOnce('Test Spreadsheet')
				.mockReturnValueOnce({})
				.mockReturnValueOnce(mockOptions);

			const mockResponse = { spreadsheetId: '1234' };
			(apiRequest.call as jest.Mock).mockResolvedValueOnce(mockResponse);

			await execute.call(mockExecuteFunctions);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'POST',
				'/v4/spreadsheets',
				{
					properties: {
						title: 'Test Spreadsheet',
						autoRecalc: 'ON_CHANGE',
						locale: 'en_US',
					},
					sheets: [],
				},
			);
		});

		it('should handle multiple input items', async () => {
			mockExecuteFunctions.getInputData = jest.fn().mockReturnValue([{}, {}]);

			const mockResponse1 = { spreadsheetId: '1234' };
			const mockResponse2 = { spreadsheetId: '5678' };

			mockExecuteFunctions.getNodeParameter = jest
				.fn()
				.mockReturnValueOnce('Spreadsheet 1')
				.mockReturnValueOnce({})
				.mockReturnValueOnce({})
				.mockReturnValueOnce('Spreadsheet 2')
				.mockReturnValueOnce({})
				.mockReturnValueOnce({});

			(apiRequest.call as jest.Mock)
				.mockResolvedValueOnce(mockResponse1)
				.mockResolvedValueOnce(mockResponse2);

			const result = await execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(2);
			expect(apiRequest.call).toHaveBeenCalledTimes(2);
			expect(result[0]).toEqual({ json: mockResponse1 });
			expect(result[1]).toEqual({ json: mockResponse2 });
		});

		it('should handle empty sheet properties', async () => {
			mockExecuteFunctions.getNodeParameter = jest
				.fn()
				.mockReturnValueOnce('Test Spreadsheet')
				.mockReturnValueOnce({ sheetValues: [] })
				.mockReturnValueOnce({});

			const mockResponse = { spreadsheetId: '1234' };
			(apiRequest.call as jest.Mock).mockResolvedValueOnce(mockResponse);

			await execute.call(mockExecuteFunctions);

			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'POST',
				'/v4/spreadsheets',
				expect.objectContaining({
					sheets: [],
				}),
			);
		});

		it('should preserve undefined values for optional properties', async () => {
			mockExecuteFunctions.getNodeParameter = jest
				.fn()
				.mockReturnValueOnce('Test Spreadsheet')
				.mockReturnValueOnce({})
				.mockReturnValueOnce({});

			const mockResponse = { spreadsheetId: '1234' };
			(apiRequest.call as jest.Mock).mockResolvedValueOnce(mockResponse);

			await execute.call(mockExecuteFunctions);

			expect(apiRequest.call).toHaveBeenCalledWith(expect.anything(), 'POST', '/v4/spreadsheets', {
				properties: {
					title: 'Test Spreadsheet',
					autoRecalc: undefined,
					locale: undefined,
				},
				sheets: [],
			});
		});
	});
});
