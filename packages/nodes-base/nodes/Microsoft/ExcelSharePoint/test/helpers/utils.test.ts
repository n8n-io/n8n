import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { resolveWorkbookRoot, validatePathSegment } from '../../helpers/utils';
import * as transport from '../../transport';
import type * as _importType0 from '../../transport';

// Real transport module except the network helper
vi.mock('../../transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

describe('Microsoft Excel (SharePoint) — helpers/utils', () => {
	describe('validatePathSegment', () => {
		const node = mock<INode>();

		it('returns the trimmed value', () => {
			expect(validatePathSegment(node, 'Site', '  contoso.sharepoint.com  ')).toBe(
				'contoso.sharepoint.com',
			);
		});

		it('rejects an empty value', () => {
			expect(() => validatePathSegment(node, 'Site', '')).toThrow("The 'Site' parameter is empty");
		});

		it('rejects a whitespace-only value', () => {
			expect(() => validatePathSegment(node, 'Library', '   ')).toThrow(
				"The 'Library' parameter is empty",
			);
		});

		it.each(['.', '..', '...'])('rejects a dots-only value (%s)', (value) => {
			expect(() => validatePathSegment(node, 'Workbook', value)).toThrow(
				"The 'Workbook' value is not valid",
			);
		});

		it('accepts a value that merely contains dots', () => {
			expect(validatePathSegment(node, 'Workbook', '..foo')).toBe('..foo');
		});
	});

	describe('resolveWorkbookRoot', () => {
		let ctx: DeepMockProxy<IExecuteFunctions>;
		const apiRequest = transport.microsoftApiRequest as Mock;

		const setParams = (
			ctxToSet: DeepMockProxy<IExecuteFunctions>,
			params: Record<string, unknown>,
		) => {
			ctxToSet.getNodeParameter.mockImplementation(
				(name: string, _itemIndex?: number, fallback?: unknown) =>
					(name in params ? params[name] : fallback) as never,
			);
		};

		beforeEach(() => {
			vi.clearAllMocks();
			ctx = mockDeep<IExecuteFunctions>();
			ctx.getNode.mockReturnValue(mock<INode>());
		});

		describe('by ID', () => {
			it('builds the root path from site, library, and workbook IDs, URL-encoding each segment', async () => {
				setParams(ctx, {
					workbook: { mode: 'id', value: 'ITEM 123' },
					site: { mode: 'id', value: 'contoso.sharepoint.com,g1,g2' },
					library: { mode: 'id', value: 'b!drive 1' },
				});

				const root = await resolveWorkbookRoot.call(ctx, 0);

				expect(root).toBe(
					'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive%201/items/ITEM%20123',
				);
				expect(apiRequest).not.toHaveBeenCalled();
			});

			it('rejects an empty Site', async () => {
				setParams(ctx, {
					workbook: { mode: 'id', value: 'ITEM123' },
					site: { mode: 'id', value: '' },
					library: { mode: 'id', value: 'b!drive1' },
				});

				await expect(resolveWorkbookRoot.call(ctx, 0)).rejects.toThrow(
					"The 'Site' parameter is empty",
				);
			});

			it('rejects an empty Library', async () => {
				setParams(ctx, {
					workbook: { mode: 'id', value: 'ITEM123' },
					site: { mode: 'id', value: 'contoso.sharepoint.com,g1,g2' },
					library: { mode: 'id', value: '' },
				});

				await expect(resolveWorkbookRoot.call(ctx, 0)).rejects.toThrow(
					"The 'Library' parameter is empty",
				);
			});

			it('rejects a dots-only Workbook ID', async () => {
				setParams(ctx, {
					workbook: { mode: 'id', value: '..' },
					site: { mode: 'id', value: 'contoso.sharepoint.com,g1,g2' },
					library: { mode: 'id', value: 'b!drive1' },
				});

				await expect(resolveWorkbookRoot.call(ctx, 0)).rejects.toThrow(
					"The 'Workbook' value is not valid",
				);
			});
		});

		describe('by URL', () => {
			it('rejects an empty pasted address', async () => {
				setParams(ctx, { workbook: { mode: 'url', value: '' } });

				await expect(resolveWorkbookRoot.call(ctx, 0)).rejects.toThrow(
					"The 'Workbook' parameter is empty",
				);
				expect(apiRequest).not.toHaveBeenCalled();
			});

			it('resolves the pasted address via the Graph shares endpoint', async () => {
				setParams(ctx, {
					workbook: { mode: 'url', value: 'https://contoso.sharepoint.com/book.xlsx' },
				});
				apiRequest.mockResolvedValue({
					id: 'ITEM123',
					parentReference: { siteId: 'contoso.sharepoint.com,g1,g2', driveId: 'b!drive1' },
				});

				const root = await resolveWorkbookRoot.call(ctx, 0);

				expect(apiRequest).toHaveBeenCalledWith(
					'GET',
					expect.stringMatching(/^\/v1\.0\/shares\/u!/),
					{},
					{ $select: 'id,parentReference' },
				);
				expect(root).toBe(
					'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123',
				);
			});

			it('caches the resolution per execution, across items', async () => {
				setParams(ctx, {
					workbook: { mode: 'url', value: 'https://contoso.sharepoint.com/book.xlsx' },
				});
				apiRequest.mockResolvedValue({
					id: 'ITEM123',
					parentReference: { siteId: 'contoso.sharepoint.com,g1,g2', driveId: 'b!drive1' },
				});

				await resolveWorkbookRoot.call(ctx, 0);
				await resolveWorkbookRoot.call(ctx, 1);

				expect(apiRequest).toHaveBeenCalledTimes(1);
			});

			it('does not share the cache across different executions', async () => {
				const workbook = { mode: 'url', value: 'https://contoso.sharepoint.com/book.xlsx' };
				setParams(ctx, { workbook });
				apiRequest.mockResolvedValue({
					id: 'ITEM123',
					parentReference: { siteId: 'contoso.sharepoint.com,g1,g2', driveId: 'b!drive1' },
				});

				const otherCtx = mockDeep<IExecuteFunctions>();
				otherCtx.getNode.mockReturnValue(mock<INode>());
				setParams(otherCtx, { workbook });

				await resolveWorkbookRoot.call(ctx, 0);
				await resolveWorkbookRoot.call(otherCtx, 0);

				expect(apiRequest).toHaveBeenCalledTimes(2);
			});

			it('rejects when the resolved item is missing a parent site or drive', async () => {
				setParams(ctx, {
					workbook: { mode: 'url', value: 'https://contoso.sharepoint.com/book.xlsx' },
				});
				apiRequest.mockResolvedValue({ id: 'ITEM123', parentReference: {} });

				await expect(resolveWorkbookRoot.call(ctx, 0)).rejects.toThrow(
					'The workbook address could not be resolved',
				);
			});

			it('rejects when the resolved item has no id', async () => {
				setParams(ctx, {
					workbook: { mode: 'url', value: 'https://contoso.sharepoint.com/book.xlsx' },
				});
				apiRequest.mockResolvedValue({
					id: '',
					parentReference: { siteId: 'contoso.sharepoint.com,g1,g2', driveId: 'b!drive1' },
				});

				await expect(resolveWorkbookRoot.call(ctx, 0)).rejects.toThrow(
					'The workbook address could not be resolved',
				);
			});
		});
	});
});
