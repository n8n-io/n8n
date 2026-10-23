/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { boardResourceLocator, searchBoards } from '../helpers/boardLocator';

describe('boardResourceLocator', () => {
	// A board URL only embeds the ID, so a URL mode would add a parsing
	// failure mode without adding any way to reach a board.
	it('offers From List and By ID only — no URL mode', () => {
		const modeNames = boardResourceLocator.modes?.map((m) => m.name);
		expect(modeNames).toEqual(['list', 'id']);
	});

	it('uses the searchBoards listSearch method with search enabled', () => {
		const listMode = boardResourceLocator.modes?.find((m) => m.name === 'list');
		expect(listMode?.typeOptions?.searchListMethod).toBe('searchBoards');
		expect(listMode?.typeOptions?.searchable).toBe(true);
	});
});

describe('searchBoards', () => {
	let mockContext: any;

	const board = (id: number, name: string, workspaceName = 'Main', type = 'board') => ({
		id: String(id),
		name,
		url: `https://acme.monday.com/boards/${id}`,
		type,
		workspace: { name: workspaceName },
	});

	beforeEach(() => {
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			helpers: { httpRequestWithAuthentication: vi.fn() },
		};
	});

	it('returns boards mapped to name/value/url with workspace suffix', async () => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: { boards: [board(1, 'CRM'), board(2, 'Roadmap')] },
		});

		const result = await searchBoards.call(mockContext);

		expect(result.results).toEqual([
			{ name: 'CRM (Main)', value: '1', url: 'https://acme.monday.com/boards/1' },
			{ name: 'Roadmap (Main)', value: '2', url: 'https://acme.monday.com/boards/2' },
		]);
		// Partial page -> no more pages to fetch
		expect(result.paginationToken).toBeUndefined();
	});

	it('excludes docs and subitem boards from the list', async () => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: {
				boards: [
					board(1, 'CRM'),
					board(2, 'Welcome doc', 'Main', 'document'),
					board(3, 'Subitems of CRM', 'Main', 'sub_items_board'),
				],
			},
		});

		const result = await searchBoards.call(mockContext);

		expect(result.results.map((row: { value: unknown }) => row.value)).toEqual(['1']);
	});

	it('caps the page size at 50 and paginates via paginationToken', async () => {
		const fullPage = Array.from({ length: 50 }, (_, i) => board(i + 1, `Board ${i + 1}`));
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: { boards: fullPage },
		});

		const result = await searchBoards.call(mockContext, undefined, '3');

		// Requested page 3 with limit 50
		const call = mockContext.helpers.httpRequestWithAuthentication.mock.calls[0][1];
		expect(call.body.variables).toEqual({ limit: 50, page: 3 });
		// Full page -> next token points at page 4
		expect(result.paginationToken).toBe('4');
	});
});

describe('searchBoards — search API path (filter typed)', () => {
	let mockContext: any;

	const searchResult = (
		id: number,
		live: { name: string; type?: string; workspaceName?: string } | null,
		indexedName = `Indexed ${id}`,
	) => ({
		id: String(id),
		indexed_data: { name: indexedName, url: `https://acme.monday.com/boards/${id}` },
		live_data: live
			? {
					id: String(id),
					name: live.name,
					url: `https://acme.monday.com/boards/${id}`,
					type: live.type ?? 'board',
					workspace: { name: live.workspaceName ?? 'Main' },
				}
			: null,
	});

	const mockSearchResponse = (results: unknown[]) => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: { search: { boards: { results } } },
		});
	};

	beforeEach(() => {
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			helpers: { httpRequestWithAuthentication: vi.fn() },
		};
	});

	it('sends one search.boards request with the filter and the max limit of 20', async () => {
		mockSearchResponse([]);

		await searchBoards.call(mockContext, 'crm');

		const call = mockContext.helpers.httpRequestWithAuthentication.mock.calls[0][1];
		expect(call.body.query).toContain('search {');
		expect(call.body.query).toContain('boards(query: $q, limit: $limit)');
		expect(call.body.variables).toEqual({ q: 'crm', limit: 20 });
	});

	it('labels results from live_data like every board picker', async () => {
		mockSearchResponse([
			searchResult(1, { name: 'CRM Pipeline', workspaceName: 'Sales' }),
			searchResult(2, { name: 'CRM Archive' }),
		]);

		const result = await searchBoards.call(mockContext, 'crm');

		expect(result.results).toEqual([
			{ name: 'CRM Pipeline (Sales)', value: '1', url: 'https://acme.monday.com/boards/1' },
			{ name: 'CRM Archive (Main)', value: '2', url: 'https://acme.monday.com/boards/2' },
		]);
	});

	it('drops rows whose live_data resolves to a non-board (docs, subitem boards)', async () => {
		mockSearchResponse([
			searchResult(1, { name: 'CRM' }),
			searchResult(2, { name: 'CRM notes', type: 'document' }),
			searchResult(3, { name: 'Subitems of CRM', type: 'sub_items_board' }),
		]);

		const result = await searchBoards.call(mockContext, 'crm');

		expect(result.results.map((row: { value: unknown }) => row.value)).toEqual(['1']);
	});

	it('keeps rows with null live_data, falling back to indexed_data', async () => {
		mockSearchResponse([searchResult(7, null, 'Lagging Board')]);

		const result = await searchBoards.call(mockContext, 'lag');

		expect(result.results).toEqual([
			{ name: 'Lagging Board', value: '7', url: 'https://acme.monday.com/boards/7' },
		]);
	});

	it('never returns a paginationToken (the search API has no pagination)', async () => {
		mockSearchResponse([searchResult(1, { name: 'CRM' })]);

		const result = await searchBoards.call(mockContext, 'crm', '2');

		expect(result.paginationToken).toBeUndefined();
	});

	it('treats a whitespace-only filter as browse mode', async () => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: { boards: [] },
		});

		await searchBoards.call(mockContext, '   ');

		const call = mockContext.helpers.httpRequestWithAuthentication.mock.calls[0][1];
		expect(call.body.query).not.toContain('search {');
		expect(call.body.variables).toEqual({ limit: 50, page: 1 });
	});
});
