import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { fetchWorkbookList, resolveWorkbookSource } from '../../../v2/helpers/workbookSource';
import { microsoftApiRequest } from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({
	microsoftApiRequest: jest.fn(),
}));

describe('resolveWorkbookSource', () => {
	it('uses the explicit source when one is set', () => {
		expect(resolveWorkbookSource('sharePoint', 2.3)).toBe('sharePoint');
		expect(resolveWorkbookSource('oneDrive', 2.3)).toBe('oneDrive');
	});

	it('defaults to OneDrive for existing nodes (< 2.3) when unset', () => {
		expect(resolveWorkbookSource(undefined, 2)).toBe('oneDrive');
		expect(resolveWorkbookSource('', 2.2)).toBe('oneDrive');
	});

	it('defaults to Everything for new nodes (>= 2.3) when unset', () => {
		expect(resolveWorkbookSource(undefined, 2.3)).toBe('all');
		expect(resolveWorkbookSource(undefined, 3)).toBe('all');
	});
});

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

describe('fetchWorkbookList', () => {
	const ctx = mock<ILoadOptionsFunctions>();
	const mockRequest = microsoftApiRequest as jest.MockedFunction<typeof microsoftApiRequest>;

	beforeEach(() => mockRequest.mockReset());

	it('oneDrive: searches the personal drive root and returns bare ids', async () => {
		mockRequest.mockResolvedValue({ value: [{ id: '1', name: 'B.xlsx', webUrl: 'u' }] });

		const { items } = await fetchWorkbookList.call(ctx, 'oneDrive');

		expect(mockRequest).toHaveBeenCalledWith(
			'GET',
			"/drive/root/search(q='.xlsx OR .xlsm OR .xltx OR .xltm')",
			undefined,
			{ select: 'id,name,webUrl', $top: 100 },
		);
		expect(items[0]).toMatchObject({ id: '1', driveId: '', name: 'B.xlsx' });
	});

	it('sharePoint: keeps team-site hits and drops personal-OneDrive hits', async () => {
		mockRequest.mockResolvedValue(
			searchResponse([
				{
					id: 's1',
					name: 'Team.xlsx',
					webUrl: 'https://contoso.sharepoint.com/sites/x/Team.xlsx',
					driveId: 'd1',
				},
				{
					id: 'p1',
					name: 'Mine.xlsx',
					webUrl: 'https://contoso-my.sharepoint.com/personal/u/Mine.xlsx',
					driveId: 'd2',
				},
			]),
		);

		const { items } = await fetchWorkbookList.call(ctx, 'sharePoint');

		expect(items.map((item) => item.id)).toEqual(['s1']);
	});

	it('all: returns every Excel hit as a composite driveId/itemId', async () => {
		mockRequest.mockResolvedValue(
			searchResponse([{ id: '10', name: 'Any.xlsx', webUrl: 'u', driveId: 'd9' }]),
		);

		const { items } = await fetchWorkbookList.call(ctx, 'all');

		expect(items).toEqual([expect.objectContaining({ id: '10', driveId: 'd9', name: 'Any.xlsx' })]);
	});
});
