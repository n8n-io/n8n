import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { searchWorkbooks, getWorksheetsList } from '../../../v2/methods/listSearch';
import { microsoftApiRequest } from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({
	microsoftApiRequest: jest.fn(),
}));

const TYPE_QUERY = '(filetype:xlsx OR filetype:xlsm OR filetype:xltx OR filetype:xltm)';

function searchResponse(
	hits: Array<{ id: string; name: string; webUrl?: string; driveId?: string }>,
) {
	return {
		value: [
			{
				hitsContainers: [
					{
						moreResultsAvailable: false,
						hits: hits.map((h) => ({
							resource: {
								id: h.id,
								name: h.name,
								webUrl: h.webUrl,
								parentReference: h.driveId ? { driveId: h.driveId } : {},
							},
						})),
					},
				],
			},
		],
	};
}

describe('Microsoft Excel V2 - listSearch', () => {
	let mockContext: ILoadOptionsFunctions;
	const mockMicrosoftApiRequest = microsoftApiRequest as jest.MockedFunction<
		typeof microsoftApiRequest
	>;
	const mockGetNodeParameter = jest.fn();

	beforeEach(() => {
		mockContext = mock<ILoadOptionsFunctions>({ getNodeParameter: mockGetNodeParameter });
		mockMicrosoftApiRequest.mockReset();
		mockGetNodeParameter.mockReset();
	});

	describe('searchWorkbooks', () => {
		// Source lives inside the operation's options collection; build a context whose
		// collection params and node version mirror that.
		function pickerContext(params: Record<string, unknown>, typeVersion = 2.3) {
			const getNodeParameter = jest.fn();
			getNodeParameter.mockImplementation((name: string, fallback?: unknown) =>
				name in params ? params[name] : fallback,
			);
			return mock<ILoadOptionsFunctions>({
				getNodeParameter,
				getNode: jest.fn().mockReturnValue(mock<INode>({ typeVersion })),
			});
		}

		it('lists personal OneDrive with bare-id values when Source is OneDrive', async () => {
			mockMicrosoftApiRequest.mockResolvedValue({
				value: [
					{ id: '1', name: 'Book.xlsx', webUrl: 'https://example/book' },
					{ id: '2', name: 'notes.txt' },
				],
			});

			const result = await searchWorkbooks.call(
				pickerContext({ options: { workbookSource: 'oneDrive' } }),
			);

			expect(mockMicrosoftApiRequest).toHaveBeenCalledWith(
				'GET',
				"/drive/root/search(q='.xlsx OR .xlsm OR .xltx OR .xltm')",
				undefined,
				{ select: 'id,name,webUrl', $top: 100 },
			);
			expect(result.results).toEqual([{ name: 'Book', value: '1', url: 'https://example/book' }]);
		});

		it('searches all drives with composite values when Source is Everything', async () => {
			mockMicrosoftApiRequest.mockResolvedValue(
				searchResponse([
					{ id: '10', name: 'Team.xlsx', webUrl: 'https://example/team', driveId: 'drive1' },
				]),
			);

			const result = await searchWorkbooks.call(
				pickerContext({ filters: { workbookSource: 'all' } }),
			);

			expect(mockMicrosoftApiRequest).toHaveBeenCalledWith('POST', '/search/query', {
				requests: [
					{ entityTypes: ['driveItem'], query: { queryString: TYPE_QUERY }, from: 0, size: 100 },
				],
			});
			expect(result.results).toEqual([
				{ name: 'Team', value: 'drive1/10', url: 'https://example/team' },
			]);
		});

		it('defaults to OneDrive when Source is unset on an existing node (< 2.3)', async () => {
			mockMicrosoftApiRequest.mockResolvedValue({ value: [] });

			await searchWorkbooks.call(pickerContext({}, 2));

			expect(mockMicrosoftApiRequest).toHaveBeenCalledWith(
				'GET',
				"/drive/root/search(q='.xlsx OR .xlsm OR .xltx OR .xltm')",
				undefined,
				{ select: 'id,name,webUrl', $top: 100 },
			);
		});

		it('defaults to Everything when Source is unset on a new node (>= 2.3)', async () => {
			mockMicrosoftApiRequest.mockResolvedValue(searchResponse([]));

			await searchWorkbooks.call(pickerContext({}, 2.3));

			expect(mockMicrosoftApiRequest).toHaveBeenCalledWith(
				'POST',
				'/search/query',
				expect.objectContaining({
					requests: [
						{ entityTypes: ['driveItem'], query: { queryString: TYPE_QUERY }, from: 0, size: 100 },
					],
				}),
			);
		});
	});

	describe('getWorksheetsList', () => {
		it('addresses the workbook in its own drive (driveId/itemId value)', async () => {
			mockGetNodeParameter.mockReturnValueOnce({ value: 'drive9/wb1', cachedResultUrl: '' });
			mockMicrosoftApiRequest.mockResolvedValue({ value: [{ id: 's1', name: 'Sheet1' }] });

			const result = await getWorksheetsList.call(mockContext);

			expect(mockMicrosoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/drives/drive9/items/wb1/workbook/worksheets',
				undefined,
				{ select: 'id,name' },
			);
			expect(result.results).toEqual([{ name: 'Sheet1', value: 's1', url: undefined }]);
		});

		it('falls back to personal OneDrive for a bare workbook id', async () => {
			mockGetNodeParameter.mockReturnValueOnce({ value: 'wb2', cachedResultUrl: '' });
			mockMicrosoftApiRequest.mockResolvedValue({ value: [] });

			await getWorksheetsList.call(mockContext);

			expect(mockMicrosoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/drive/items/wb2/workbook/worksheets',
				undefined,
				{ select: 'id,name' },
			);
		});
	});
});
