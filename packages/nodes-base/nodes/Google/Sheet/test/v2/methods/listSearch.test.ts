import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { sheetsSearch, spreadSheetsSearch } from '../../../v2/methods/listSearch';
import { apiRequest } from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({
	apiRequest: {
		call: jest.fn(),
	},
}));

describe('Google Sheets Search Functions', () => {
	let mockLoadOptionsFunctions: Partial<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockLoadOptionsFunctions = {
			getNode: jest.fn(),
			getNodeParameter: jest.fn(),
		};
		jest.clearAllMocks();
	});

	describe('spreadSheetsSearch', () => {
		it('should return search results without filter', async () => {
			const mockResponse = {
				files: [
					{ id: '1', name: 'Sheet1', webViewLink: 'https://sheet1.url' },
					{ id: '2', name: 'Sheet2', webViewLink: 'https://sheet2.url' },
				],
				nextPageToken: 'next-page',
			};

			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);

			const result = await spreadSheetsSearch.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
			);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockLoadOptionsFunctions,
				'GET',
				'',
				{},
				{
					q: "mimeType = 'application/vnd.google-apps.spreadsheet'",
					fields: 'nextPageToken, files(id, name, webViewLink)',
					orderBy: 'modifiedByMeTime desc,name_natural',
					includeItemsFromAllDrives: true,
					supportsAllDrives: true,
				},
				'https://www.googleapis.com/drive/v3/files',
			);

			expect(result).toEqual({
				results: [
					{ name: 'Sheet1', value: '1', url: 'https://sheet1.url' },
					{ name: 'Sheet2', value: '2', url: 'https://sheet2.url' },
				],
				paginationToken: 'next-page',
			});
		});

		it('should handle search with filter', async () => {
			const mockResponse = {
				files: [{ id: '1', name: 'TestSheet', webViewLink: 'https://test.url' }],
			};

			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);

			const result = await spreadSheetsSearch.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
				'Test',
			);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockLoadOptionsFunctions,
				'GET',
				'',
				{},
				{
					q: "name contains 'Test' and mimeType = 'application/vnd.google-apps.spreadsheet'",
					fields: 'nextPageToken, files(id, name, webViewLink)',
					orderBy: 'modifiedByMeTime desc,name_natural',
					includeItemsFromAllDrives: true,
					supportsAllDrives: true,
				},
				'https://www.googleapis.com/drive/v3/files',
			);

			expect(result.results).toHaveLength(1);
			expect(result.results[0].name).toBe('TestSheet');
		});

		it('should escape single quotes in filter', async () => {
			const mockResponse = { files: [] };
			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);

			await spreadSheetsSearch.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
				"Test's Sheet",
			);

			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				'',
				{},
				expect.objectContaining({
					q: "name contains 'Test\\'s Sheet' and mimeType = 'application/vnd.google-apps.spreadsheet'",
				}),
				expect.any(String),
			);
		});

		it('should handle pagination token', async () => {
			const mockResponse = { files: [] };
			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);

			await spreadSheetsSearch.call(
				mockLoadOptionsFunctions as ILoadOptionsFunctions,
				undefined,
				'page-token',
			);

			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				'',
				{},
				expect.objectContaining({
					pageToken: 'page-token',
				}),
				expect.any(String),
			);
		});
	});

	describe('sheetsSearch', () => {
		it('should return empty results when no documentId is provided', async () => {
			mockLoadOptionsFunctions.getNodeParameter = jest.fn().mockReturnValue(null);

			const result = await sheetsSearch.call(mockLoadOptionsFunctions as ILoadOptionsFunctions);

			expect(result).toEqual({ results: [] });
			expect(apiRequest.call).not.toHaveBeenCalled();
		});

		it('should return sheets list for valid spreadsheet', async () => {
			mockLoadOptionsFunctions.getNodeParameter = jest.fn().mockReturnValue({
				mode: 'id',
				value: 'spreadsheet-id',
			});

			const mockResponse = {
				sheets: [
					{
						properties: {
							sheetId: 123,
							title: 'Sheet1',
							sheetType: 'GRID',
						},
					},
					{
						properties: {
							sheetId: 456,
							title: 'Sheet2',
							sheetType: 'GRID',
						},
					},
					{
						properties: {
							sheetId: 789,
							title: 'Chart1',
							sheetType: 'CHART',
						},
					},
				],
			};

			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);

			const result = await sheetsSearch.call(mockLoadOptionsFunctions as ILoadOptionsFunctions);

			expect(apiRequest.call).toHaveBeenCalledWith(
				mockLoadOptionsFunctions,
				'GET',
				'/v4/spreadsheets/spreadsheet-id',
				{},
				{ fields: 'sheets.properties' },
			);

			expect(result.results).toHaveLength(2); // Only GRID type sheets
			expect(result.results[0]).toEqual({
				name: 'Sheet1',
				value: 123,
				url: 'https://docs.google.com/spreadsheets/d/spreadsheet-id/edit#gid=123',
			});
		});

		it('should handle default sheet id when sheetId is not provided', async () => {
			mockLoadOptionsFunctions.getNodeParameter = jest.fn().mockReturnValue({
				mode: 'id',
				value: 'spreadsheet-id',
			});

			const mockResponse = {
				sheets: [
					{
						properties: {
							title: 'Sheet1',
							sheetType: 'GRID',
						},
					},
				],
			};

			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);

			const result = await sheetsSearch.call(mockLoadOptionsFunctions as ILoadOptionsFunctions);

			expect(result.results[0].value).toBe('gid=0');
		});

		it('should throw error when no data is returned', async () => {
			mockLoadOptionsFunctions.getNodeParameter = jest.fn().mockReturnValue({
				mode: 'id',
				value: 'spreadsheet-id',
			});
			mockLoadOptionsFunctions.getNode = jest.fn().mockReturnValue({});

			(apiRequest.call as jest.Mock).mockResolvedValue(undefined);

			await expect(
				sheetsSearch.call(mockLoadOptionsFunctions as ILoadOptionsFunctions),
			).rejects.toThrow(
				new NodeOperationError(mockLoadOptionsFunctions.getNode(), 'No data got returned'),
			);
		});

		it('should filter out non-GRID type sheets', async () => {
			mockLoadOptionsFunctions.getNodeParameter = jest.fn().mockReturnValue({
				mode: 'id',
				value: 'spreadsheet-id',
			});

			const mockResponse = {
				sheets: [
					{
						properties: {
							sheetId: 123,
							title: 'Chart',
							sheetType: 'CHART',
						},
					},
					{
						properties: {
							sheetId: 456,
							title: 'Grid',
							sheetType: 'GRID',
						},
					},
				],
			};

			(apiRequest.call as jest.Mock).mockResolvedValue(mockResponse);

			const result = await sheetsSearch.call(mockLoadOptionsFunctions as ILoadOptionsFunctions);

			expect(result.results).toHaveLength(1);
			expect(result.results[0].name).toBe('Grid');
		});
	});
});
