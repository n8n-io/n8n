/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';
import { fetchAllPaged, fetchAllByCursor, RETURN_ALL_HARD_CAP } from '../helpers/pagination';

describe('pagination helpers', () => {
	let mockContext: any;
	let client: MondayGraphQLClient;
	let httpMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		httpMock = vi.fn();
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			helpers: { httpRequestWithAuthentication: httpMock },
		};
		client = new MondayGraphQLClient(mockContext, undefined, 1);
	});

	const row = (id: number) => ({ id: String(id), name: `row-${id}` });

	describe('fetchAllPaged', () => {
		const query = 'query ($limit: Int!, $page: Int!) { boards(limit: $limit, page: $page) { id } }';
		const extractRows = (data: any) => data.boards ?? [];

		it('stops after a single short page', async () => {
			httpMock.mockResolvedValueOnce({ data: { boards: [row(1), row(2)] } });

			const rows = await fetchAllPaged({ client, itemIndex: 0, query, extractRows });

			expect(rows).toHaveLength(2);
			expect(httpMock).toHaveBeenCalledTimes(1);
		});

		it('walks pages until a short page, incrementing $page', async () => {
			const fullPage = Array.from({ length: 100 }, (_, i) => row(i));
			httpMock
				.mockResolvedValueOnce({ data: { boards: fullPage } })
				.mockResolvedValueOnce({ data: { boards: [row(200)] } });

			const rows = await fetchAllPaged({ client, itemIndex: 0, query, extractRows });

			expect(rows).toHaveLength(101);
			expect(httpMock).toHaveBeenCalledTimes(2);
			expect(httpMock.mock.calls[0][1].body.variables).toMatchObject({ limit: 100, page: 1 });
			expect(httpMock.mock.calls[1][1].body.variables).toMatchObject({ limit: 100, page: 2 });
		});

		it('honors limit: shrinks the page size and truncates the result', async () => {
			httpMock.mockResolvedValueOnce({ data: { boards: [row(1), row(2), row(3)] } });

			const rows = await fetchAllPaged({ client, itemIndex: 0, query, extractRows, limit: 3 });

			expect(rows).toHaveLength(3);
			// Page size should be capped at the limit — never over-fetch.
			expect(httpMock.mock.calls[0][1].body.variables).toMatchObject({ limit: 3, page: 1 });
			expect(httpMock).toHaveBeenCalledTimes(1);
		});

		it('stops fetching once the limit is reached across pages', async () => {
			const fullPage = Array.from({ length: 100 }, (_, i) => row(i));
			httpMock.mockResolvedValue({ data: { boards: fullPage } });

			const rows = await fetchAllPaged({ client, itemIndex: 0, query, extractRows, limit: 150 });

			expect(rows).toHaveLength(150);
			expect(httpMock).toHaveBeenCalledTimes(2);
		});

		it('merges caller variables with limit/page', async () => {
			httpMock.mockResolvedValueOnce({ data: { boards: [] } });

			await fetchAllPaged({
				client,
				itemIndex: 0,
				query,
				variables: { state: 'active' },
				extractRows,
			});

			expect(httpMock.mock.calls[0][1].body.variables).toEqual({
				state: 'active',
				limit: 100,
				page: 1,
			});
		});

		it('never exceeds the Return All hard cap', async () => {
			const fullPage = Array.from({ length: 100 }, (_, i) => row(i));
			httpMock.mockResolvedValue({ data: { boards: fullPage } });

			const rows = await fetchAllPaged({ client, itemIndex: 0, query, extractRows });

			expect(rows).toHaveLength(RETURN_ALL_HARD_CAP);
			expect(httpMock).toHaveBeenCalledTimes(RETURN_ALL_HARD_CAP / 100);
		});
	});

	describe('fetchAllByCursor', () => {
		const firstQuery =
			'query ($boardId: [ID!], $limit: Int!) { boards(ids: $boardId) { items_page(limit: $limit) { cursor items { id name } } } }';
		const extractFirstPage = (data: any) => data.boards?.[0]?.items_page;

		it('returns the first page and a null cursor when exhausted', async () => {
			httpMock.mockResolvedValueOnce({
				data: { boards: [{ items_page: { cursor: null, items: [row(1), row(2)] } }] },
			});

			const { rows, nextCursor } = await fetchAllByCursor({
				client,
				itemIndex: 0,
				firstQuery,
				extractFirstPage,
				itemFields: 'id name',
			});

			expect(rows).toHaveLength(2);
			expect(nextCursor).toBeNull();
			expect(httpMock).toHaveBeenCalledTimes(1);
		});

		it('follows the cursor through next_items_page until exhausted', async () => {
			httpMock
				.mockResolvedValueOnce({
					data: { boards: [{ items_page: { cursor: 'c1', items: [row(1)] } }] },
				})
				.mockResolvedValueOnce({
					data: { next_items_page: { cursor: 'c2', items: [row(2)] } },
				})
				.mockResolvedValueOnce({
					data: { next_items_page: { cursor: null, items: [row(3)] } },
				});

			const { rows, nextCursor } = await fetchAllByCursor({
				client,
				itemIndex: 0,
				firstQuery,
				extractFirstPage,
				itemFields: 'id name',
			});

			expect(rows.map((r) => r.id)).toEqual(['1', '2', '3']);
			expect(nextCursor).toBeNull();
			expect(httpMock).toHaveBeenCalledTimes(3);
			// Follow-up requests go through next_items_page with the prior cursor.
			expect(httpMock.mock.calls[1][1].body.query).toContain('next_items_page');
			expect(httpMock.mock.calls[1][1].body.variables).toMatchObject({ cursor: 'c1' });
			expect(httpMock.mock.calls[2][1].body.variables).toMatchObject({ cursor: 'c2' });
		});

		it('stops at the limit and returns a resumable cursor', async () => {
			httpMock.mockResolvedValueOnce({
				data: { boards: [{ items_page: { cursor: 'c1', items: [row(1), row(2)] } }] },
			});

			const { rows, nextCursor } = await fetchAllByCursor({
				client,
				itemIndex: 0,
				firstQuery,
				extractFirstPage,
				itemFields: 'id name',
				limit: 2,
			});

			expect(rows).toHaveLength(2);
			// Limit satisfied — no follow-up, and the API cursor is handed back.
			expect(nextCursor).toBe('c1');
			expect(httpMock).toHaveBeenCalledTimes(1);
			// Page size capped at the limit so the cursor stays aligned.
			expect(httpMock.mock.calls[0][1].body.variables).toMatchObject({ limit: 2 });
		});

		it('requests only the remaining budget on follow-up pages', async () => {
			const fullPage = Array.from({ length: 100 }, (_, i) => row(i));
			httpMock
				.mockResolvedValueOnce({
					data: { boards: [{ items_page: { cursor: 'c1', items: fullPage } }] },
				})
				.mockResolvedValueOnce({
					data: {
						next_items_page: {
							cursor: 'c2',
							items: Array.from({ length: 50 }, (_, i) => row(100 + i)),
						},
					},
				});

			const { rows, nextCursor } = await fetchAllByCursor({
				client,
				itemIndex: 0,
				firstQuery,
				extractFirstPage,
				itemFields: 'id name',
				limit: 150,
			});

			expect(rows).toHaveLength(150);
			// Second request must ask for exactly 50, never over-fetch past the
			// limit — otherwise the returned cursor would skip records.
			expect(httpMock.mock.calls[1][1].body.variables).toMatchObject({ limit: 50 });
			expect(nextCursor).toBe('c2');
		});

		it('resumes from startCursor without running the first query', async () => {
			httpMock.mockResolvedValueOnce({
				data: { next_items_page: { cursor: null, items: [row(9)] } },
			});

			const { rows, nextCursor } = await fetchAllByCursor({
				client,
				itemIndex: 0,
				firstQuery,
				extractFirstPage,
				itemFields: 'id name',
				startCursor: 'resume-me',
			});

			expect(rows.map((r) => r.id)).toEqual(['9']);
			expect(nextCursor).toBeNull();
			expect(httpMock).toHaveBeenCalledTimes(1);
			expect(httpMock.mock.calls[0][1].body.query).toContain('next_items_page');
			expect(httpMock.mock.calls[0][1].body.variables).toMatchObject({ cursor: 'resume-me' });
		});

		it('returns empty when the board does not resolve to a page', async () => {
			httpMock.mockResolvedValueOnce({ data: { boards: [] } });

			const { rows, nextCursor } = await fetchAllByCursor({
				client,
				itemIndex: 0,
				firstQuery,
				extractFirstPage,
				itemFields: 'id name',
			});

			expect(rows).toEqual([]);
			expect(nextCursor).toBeNull();
		});

		it('embeds the item fields in follow-up queries', async () => {
			httpMock
				.mockResolvedValueOnce({
					data: { boards: [{ items_page: { cursor: 'c1', items: [row(1)] } }] },
				})
				.mockResolvedValueOnce({
					data: { next_items_page: { cursor: null, items: [row(2)] } },
				});

			await fetchAllByCursor({
				client,
				itemIndex: 0,
				firstQuery,
				extractFirstPage,
				itemFields: 'id name column_values(ids: ["status"]) { id text }',
			});

			expect(httpMock.mock.calls[1][1].body.query).toContain(
				'column_values(ids: ["status"]) { id text }',
			);
		});
	});
});
