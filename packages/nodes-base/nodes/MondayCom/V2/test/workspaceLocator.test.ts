/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	extractWorkspaceId,
	searchWorkspaces,
	workspaceResourceLocator,
} from '../helpers/workspaceLocator';

describe('workspaceResourceLocator', () => {
	it('offers the From List and By ID modes', () => {
		const modeNames = workspaceResourceLocator.modes?.map((m) => m.name);
		expect(modeNames).toEqual(['list', 'id']);
	});

	it('uses the searchWorkspaces listSearch method with search enabled', () => {
		const listMode = workspaceResourceLocator.modes?.find((m) => m.name === 'list');
		expect(listMode?.typeOptions?.searchListMethod).toBe('searchWorkspaces');
		expect(listMode?.typeOptions?.searchable).toBe(true);
	});
});

describe('searchWorkspaces — browse path (no filter)', () => {
	let mockContext: any;

	const workspace = (id: number, name: string) => ({ id: String(id), name });

	beforeEach(() => {
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			helpers: { httpRequestWithAuthentication: vi.fn() },
		};
	});

	it('pages through the workspaces query and maps rows to name/value', async () => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: { workspaces: [workspace(1, 'Sales'), workspace(2, 'R&D')] },
		});

		const result = await searchWorkspaces.call(mockContext);

		const call = mockContext.helpers.httpRequestWithAuthentication.mock.calls[0][1];
		expect(call.body.variables).toEqual({ limit: 100, page: 1 });
		expect(result.results).toEqual([
			{ name: 'Sales', value: '1' },
			{ name: 'R&D', value: '2' },
		]);
		// Partial page -> no more pages to fetch
		expect(result.paginationToken).toBeUndefined();
	});

	it('returns the next page token on a full page', async () => {
		const fullPage = Array.from({ length: 100 }, (_, i) => workspace(i + 1, `WS ${i + 1}`));
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: { workspaces: fullPage },
		});

		const result = await searchWorkspaces.call(mockContext, undefined, '2');

		const call = mockContext.helpers.httpRequestWithAuthentication.mock.calls[0][1];
		expect(call.body.variables).toEqual({ limit: 100, page: 2 });
		expect(result.paginationToken).toBe('3');
	});
});

describe('searchWorkspaces — search API path (filter typed)', () => {
	let mockContext: any;

	const mockSearchResponse = (results: unknown[]) => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: { search: { workspaces: { results } } },
		});
	};

	beforeEach(() => {
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			helpers: { httpRequestWithAuthentication: vi.fn() },
		};
	});

	it('sends one search.workspaces request with the filter and the max limit of 20', async () => {
		mockSearchResponse([]);

		await searchWorkspaces.call(mockContext, 'sales');

		const call = mockContext.helpers.httpRequestWithAuthentication.mock.calls[0][1];
		expect(call.body.query).toContain('search {');
		expect(call.body.query).toContain('workspaces(query: $q, limit: $limit)');
		expect(call.body.variables).toEqual({ q: 'sales', limit: 20 });
	});

	it('prefers live_data names and falls back to indexed_data on null live_data', async () => {
		mockSearchResponse([
			{
				id: '1',
				indexed_data: { name: 'Sales (stale)' },
				live_data: { id: '1', name: 'Sales' },
			},
			{ id: '2', indexed_data: { name: 'Lagging WS' }, live_data: null },
		]);

		const result = await searchWorkspaces.call(mockContext, 'sales');

		expect(result.results).toEqual([
			{ name: 'Sales', value: '1' },
			{ name: 'Lagging WS', value: '2' },
		]);
	});

	it('never returns a paginationToken (the search API has no pagination)', async () => {
		mockSearchResponse([{ id: '1', indexed_data: { name: 'Sales' }, live_data: null }]);

		const result = await searchWorkspaces.call(mockContext, 'sales', '2');

		expect(result.paginationToken).toBeUndefined();
	});

	it('treats a whitespace-only filter as browse mode', async () => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: { workspaces: [] },
		});

		await searchWorkspaces.call(mockContext, '   ');

		const call = mockContext.helpers.httpRequestWithAuthentication.mock.calls[0][1];
		expect(call.body.query).not.toContain('search {');
		expect(call.body.variables).toEqual({ limit: 100, page: 1 });
	});
});

describe('extractWorkspaceId', () => {
	it('unwraps a resource locator { mode, value } object', () => {
		expect(extractWorkspaceId({ __rl: true, mode: 'list', value: '123' })).toBe('123');
		expect(extractWorkspaceId({ mode: 'id', value: 456 })).toBe('456');
	});

	it('returns "" for an unset locator value', () => {
		expect(extractWorkspaceId({ mode: 'list', value: '' })).toBe('');
		expect(extractWorkspaceId({ mode: 'list', value: null })).toBe('');
	});

	it('passes plain strings and numbers through (expression mode)', () => {
		expect(extractWorkspaceId('789')).toBe('789');
		expect(extractWorkspaceId(789)).toBe('789');
	});

	it('returns "" for null/undefined (option not set)', () => {
		expect(extractWorkspaceId(undefined)).toBe('');
		expect(extractWorkspaceId(null)).toBe('');
	});
});
