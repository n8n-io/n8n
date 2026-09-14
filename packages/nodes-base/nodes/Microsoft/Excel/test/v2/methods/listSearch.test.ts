import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { searchWorkbooks } from '../../../v2/methods/listSearch';
import { getExcelCredentialType, microsoftApiRequest } from '../../../v2/transport';

vi.mock('../../../v2/transport', () => ({
	microsoftApiRequest: vi.fn(),
	getExcelCredentialType: vi.fn(),
}));

const WORKBOOK = { id: 'wb1', name: 'Budget.xlsx', webUrl: 'https://c/wb1', file: {} };
const MACRO_WORKBOOK = { id: 'wb2', name: 'Q4.XLSM', webUrl: 'https://c/wb2', file: {} };
const DOUBLE_EXTENSION = {
	id: 'wb3',
	name: 'Report.xlsx.backup.xlsx',
	webUrl: 'https://c/wb3',
	file: {},
};
const SHORTCUT = { id: 'url1', name: 'SPBook.xlsx.url', webUrl: 'https://c/url1', file: {} };
const FOLDER = {
	id: 'f1',
	name: 'Archive.xlsx',
	webUrl: 'https://c/f1',
	folder: { childCount: 2 },
};

const DEFAULT_QUERY = "/drive/root/search(q='.xlsx OR .xlsm')";
const DEFAULT_QS = { select: 'id,name,webUrl,file', $top: 100 };

describe('Microsoft Excel V2 - listSearch', () => {
	let ctx: ILoadOptionsFunctions;
	const apiRequest = microsoftApiRequest as MockedFunction<typeof microsoftApiRequest>;
	const credentialType = getExcelCredentialType as MockedFunction<typeof getExcelCredentialType>;

	beforeEach(() => {
		apiRequest.mockReset();
		credentialType.mockReset();
		credentialType.mockReturnValue('microsoftOAuth2Api');
		ctx = mock<ILoadOptionsFunctions>({
			getNode: vi.fn(() => mock<INode>({ typeVersion: 2 })),
		});
	});

	describe('searchWorkbooks', () => {
		it('lists only workbook files when no search text is given', async () => {
			apiRequest.mockResolvedValue({ value: [WORKBOOK, SHORTCUT, FOLDER] });

			const result = await searchWorkbooks.call(ctx);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				DEFAULT_QUERY,
				undefined,
				DEFAULT_QS,
				undefined,
				undefined,
				0,
			);
			expect(result).toEqual({
				results: [{ name: 'Budget', value: 'wb1', url: 'https://c/wb1' }],
				paginationToken: undefined,
			});
		});

		it('applies the same workbook check to a user search, ignoring case', async () => {
			apiRequest.mockResolvedValue({ value: [MACRO_WORKBOOK, SHORTCUT] });

			const result = await searchWorkbooks.call(ctx, 'q4');

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				"/drive/root/search(q='q4')",
				undefined,
				DEFAULT_QS,
				undefined,
				undefined,
				0,
			);
			expect(result.results).toEqual([{ name: 'Q4', value: 'wb2', url: 'https://c/wb2' }]);
		});

		it('treats a blank search as no search text', async () => {
			apiRequest.mockResolvedValue({ value: [WORKBOOK] });

			await searchWorkbooks.call(ctx, '   ');

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				DEFAULT_QUERY,
				undefined,
				DEFAULT_QS,
				undefined,
				undefined,
				0,
			);
		});

		it('strips only the trailing extension from the display name', async () => {
			apiRequest.mockResolvedValue({ value: [DOUBLE_EXTENSION] });

			const result = await searchWorkbooks.call(ctx);

			expect(result.results).toEqual([
				{ name: 'Report.xlsx.backup', value: 'wb3', url: 'https://c/wb3' },
			]);
		});

		it('follows the pagination token and filters that page too', async () => {
			const token = 'https://graph.microsoft.com/v1.0/me/drive/root/search?$skiptoken=abc';
			const nextLink = 'https://graph.microsoft.com/v1.0/me/drive/root/search?$skiptoken=def';
			apiRequest.mockResolvedValue({ value: [SHORTCUT, WORKBOOK], '@odata.nextLink': nextLink });

			const result = await searchWorkbooks.call(ctx, undefined, token);

			expect(apiRequest).toHaveBeenCalledWith('GET', '', undefined, undefined, token, undefined, 0);
			expect(result).toEqual({
				results: [{ name: 'Budget', value: 'wb1', url: 'https://c/wb1' }],
				paginationToken: nextLink,
			});
		});

		it('returns no results when the response has no value collection', async () => {
			apiRequest.mockResolvedValue({});

			const result = await searchWorkbooks.call(ctx);

			expect(result.results).toEqual([]);
		});

		it('rejects search with the Service Principal credential', async () => {
			credentialType.mockReturnValue('microsoftEntraServicePrincipalApi');

			await expect(searchWorkbooks.call(ctx)).rejects.toThrow(NodeOperationError);
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});
});
