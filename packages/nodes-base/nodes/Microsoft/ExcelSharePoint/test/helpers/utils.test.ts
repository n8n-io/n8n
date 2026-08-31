import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { resolveSiteId, resolveWorkbookRoot, validatePathSegment } from '../../helpers/utils';
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

			it('resolves a pasted Site address before building the root path', async () => {
				setParams(ctx, {
					workbook: { mode: 'id', value: 'ITEM123' },
					site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/mysite' },
					library: { mode: 'id', value: 'b!drive1' },
				});
				apiRequest.mockResolvedValue({ id: 'contoso.sharepoint.com,g1,g2' });

				const root = await resolveWorkbookRoot.call(ctx, 0);

				expect(apiRequest).toHaveBeenCalledWith(
					'GET',
					'/v1.0/sites/contoso.sharepoint.com:/sites/mysite',
					{},
					{ $select: 'id' },
				);
				expect(root).toBe(
					'/v1.0/sites/contoso.sharepoint.com%2Cg1%2Cg2/drives/b!drive1/items/ITEM123',
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

			it('caches the resolution per execution, across items, when the caller shares its cache', async () => {
				setParams(ctx, {
					workbook: { mode: 'url', value: 'https://contoso.sharepoint.com/book.xlsx' },
				});
				apiRequest.mockResolvedValue({
					id: 'ITEM123',
					parentReference: { siteId: 'contoso.sharepoint.com,g1,g2', driveId: 'b!drive1' },
				});

				// The caller (readRows' execute()) hoists this once per run and passes
				// the same instance for every item — that's what makes it a per-run cache.
				const workbookRootCache = new Map<string, string>();
				await resolveWorkbookRoot.call(ctx, 0, workbookRootCache);
				await resolveWorkbookRoot.call(ctx, 1, workbookRootCache);

				expect(apiRequest).toHaveBeenCalledTimes(1);
			});

			it('resolves again when no cache is passed, or a fresh one is', async () => {
				const workbook = { mode: 'url', value: 'https://contoso.sharepoint.com/book.xlsx' };
				setParams(ctx, { workbook });
				apiRequest.mockResolvedValue({
					id: 'ITEM123',
					parentReference: { siteId: 'contoso.sharepoint.com,g1,g2', driveId: 'b!drive1' },
				});

				await resolveWorkbookRoot.call(ctx, 0);
				await resolveWorkbookRoot.call(ctx, 0, new Map());

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

	describe('resolveSiteId', () => {
		let ctx: DeepMockProxy<IExecuteFunctions>;
		const apiRequest = transport.microsoftApiRequest as Mock;

		const setParams = (
			ctxToSet: DeepMockProxy<IExecuteFunctions> | DeepMockProxy<ILoadOptionsFunctions>,
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

		it('returns an ID as given, from the "By ID" mode', async () => {
			setParams(ctx, { site: { mode: 'id', value: 'contoso.sharepoint.com,g1,g2' } });

			await expect(resolveSiteId.call(ctx, 0)).resolves.toBe('contoso.sharepoint.com,g1,g2');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('returns an ID as given, from a "From List" pick', async () => {
			setParams(ctx, { site: { mode: 'list', value: 'contoso.sharepoint.com,g1,g2' } });

			await expect(resolveSiteId.call(ctx, 0)).resolves.toBe('contoso.sharepoint.com,g1,g2');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('rejects an empty Site ID', async () => {
			setParams(ctx, { site: { mode: 'id', value: '' } });

			await expect(resolveSiteId.call(ctx, 0)).rejects.toThrow("The 'Site' parameter is empty");
		});

		it('rejects a dots-only Site ID', async () => {
			setParams(ctx, { site: { mode: 'id', value: '..' } });

			await expect(resolveSiteId.call(ctx, 0)).rejects.toThrow("The 'Site' value is not valid");
		});

		it('rejects an empty pasted address', async () => {
			setParams(ctx, { site: { mode: 'url', value: '' } });

			await expect(resolveSiteId.call(ctx, 0)).rejects.toThrow("The 'Site' parameter is empty");
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('rejects an address that is not a valid URL', async () => {
			setParams(ctx, { site: { mode: 'url', value: 'not a url' } });

			await expect(resolveSiteId.call(ctx, 0)).rejects.toThrow('The site address is not valid');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it("resolves a pasted address via Graph's hostname:path site addressing", async () => {
			setParams(ctx, {
				site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/mysite' },
			});
			apiRequest.mockResolvedValue({ id: 'contoso.sharepoint.com,g1,g2' });

			const siteId = await resolveSiteId.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/v1.0/sites/contoso.sharepoint.com:/sites/mysite',
				{},
				{ $select: 'id' },
			);
			expect(siteId).toBe('contoso.sharepoint.com,g1,g2');
		});

		it('resolves the root site when the address has no path', async () => {
			setParams(ctx, { site: { mode: 'url', value: 'https://contoso.sharepoint.com' } });
			apiRequest.mockResolvedValue({ id: 'contoso.sharepoint.com,root' });

			await resolveSiteId.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/v1.0/sites/contoso.sharepoint.com',
				{},
				{ $select: 'id' },
			);
		});

		it('caches the resolution per execution, across items, when the caller shares its cache', async () => {
			setParams(ctx, {
				site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/mysite' },
			});
			apiRequest.mockResolvedValue({ id: 'contoso.sharepoint.com,g1,g2' });

			// The caller hoists this once per run and passes the same instance for
			// every item — that's what makes it a per-run cache, not the function itself.
			const siteIdCache = new Map<string, string>();
			await resolveSiteId.call(ctx, 0, siteIdCache);
			await resolveSiteId.call(ctx, 1, siteIdCache);

			expect(apiRequest).toHaveBeenCalledTimes(1);
		});

		it('resolves again when no cache is passed, or a fresh one is', async () => {
			const site = { mode: 'url', value: 'https://contoso.sharepoint.com/sites/mysite' };
			setParams(ctx, { site });
			apiRequest.mockResolvedValue({ id: 'contoso.sharepoint.com,g1,g2' });

			await resolveSiteId.call(ctx, 0);
			await resolveSiteId.call(ctx, 0, new Map());

			expect(apiRequest).toHaveBeenCalledTimes(2);
		});

		it('reports a not-found address as a Site problem, not the generic message', async () => {
			setParams(ctx, {
				site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/ghost' },
			});
			apiRequest.mockRejectedValue(
				new NodeApiError(mock<INode>(), { message: 'x' }, { httpCode: '404' }),
			);

			await expect(resolveSiteId.call(ctx, 0)).rejects.toThrow('Site not found');
		});

		it('lets other errors bubble up unchanged', async () => {
			setParams(ctx, {
				site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/mysite' },
			});
			apiRequest.mockRejectedValue(
				new NodeApiError(mock<INode>(), { message: 'x' }, { httpCode: '500' }),
			);

			await expect(resolveSiteId.call(ctx, 0)).rejects.toThrow(NodeApiError);
		});

		it('works from a load-options context, for the library dropdown', async () => {
			const loadOptionsCtx = mockDeep<ILoadOptionsFunctions>();
			loadOptionsCtx.getNode.mockReturnValue(mock<INode>());
			setParams(loadOptionsCtx, { site: { mode: 'id', value: 'contoso.sharepoint.com,g1,g2' } });

			await expect(resolveSiteId.call(loadOptionsCtx, 0)).resolves.toBe(
				'contoso.sharepoint.com,g1,g2',
			);
		});
	});
});
