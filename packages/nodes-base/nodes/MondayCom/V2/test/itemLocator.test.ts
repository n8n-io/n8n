/* Unit tests — never shipped in dist/, so cloud-compatibility import rules don't apply.
 * The display-name rule misfires on expected search-result labels (plain data, not UI params). */
/* eslint-disable @typescript-eslint/no-explicit-any, n8n-nodes-base/node-param-display-name-miscased */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
	itemIdTextProperty,
	itemInputModeProperty,
	itemListOnlyResourceLocator,
	itemResourceLocator,
	searchItems,
} from '../helpers/itemLocator';

const httpRequestWithAuthentication = vi.fn();

function makeContext(boardId = '111') {
	return {
		getCurrentNodeParameter: () => boardId,
		getNode: () => ({ name: 'monday.com', type: 'CUSTOM.monday', typeVersion: 1 }),
		helpers: { httpRequestWithAuthentication },
	} as any;
}

function mockItemsPage(
	items: unknown[],
	board: { hierarchy_type?: string; groups?: Array<{ id: string }> } = {},
) {
	httpRequestWithAuthentication.mockResolvedValueOnce({
		data: { boards: [{ ...board, items_page: { items } }] },
	});
}

function mockSearchResponse(results: unknown[]) {
	httpRequestWithAuthentication.mockResolvedValueOnce({
		data: { search: { items: { results } } },
	});
}

// Item-only operations show either a board + list picker or a bare ID
// field; both variants keep the itemId name so execution code is shared.
describe('item locator variants', () => {
	it('the full locator offers list and id modes', () => {
		expect(itemResourceLocator.modes?.map((m) => m.name)).toEqual(['list', 'id']);
	});

	it('the list-only variant keeps just the board-scoped list mode', () => {
		expect(itemListOnlyResourceLocator.name).toBe('itemId');
		expect(itemListOnlyResourceLocator.modes?.map((m) => m.name)).toEqual(['list']);
		expect(itemListOnlyResourceLocator.default).toEqual({ mode: 'list', value: '' });
	});

	// A one-mode resourceLocator still renders as a picker with a mode
	// dropdown, so By Item ID uses a plain text field instead.
	it('the by-ID field is a plain text input under the same parameter name', () => {
		expect(itemIdTextProperty.name).toBe('itemId');
		expect(itemIdTextProperty.type).toBe('string');
		expect(itemIdTextProperty.displayName).toBe('Item ID');
		expect(itemIdTextProperty.default).toBe('');
		expect(itemIdTextProperty.modes).toBeUndefined();
	});

	it('defaults to By Item ID so no board is required out of the box', () => {
		expect(itemInputModeProperty.default).toBe('id');
	});
});

describe('searchItems', () => {
	beforeEach(() => {
		httpRequestWithAuthentication.mockReset();
	});

	it('returns empty without an API call when no board is selected', async () => {
		const result = await searchItems.call(makeContext(''));
		expect(result.results).toEqual([]);
		expect(httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('lists the first page with group context when no filter is given', async () => {
		mockItemsPage([
			{ id: '1', name: 'Alpha', group: { title: 'Backlog' } },
			{ id: '2', name: 'Beta', group: null },
		]);
		const result = await searchItems.call(makeContext());
		expect(result.results).toEqual([
			{ name: 'Alpha (Backlog)', value: '1' },
			{ name: 'Beta', value: '2' },
		]);
		const body = httpRequestWithAuthentication.mock.calls[0][1].body as {
			variables: { queryParams: unknown };
		};
		expect(body.variables.queryParams).toBeNull();
	});

	it('routes a typed filter to search.items scoped to the board, capped at 20', async () => {
		mockSearchResponse([]);
		await searchItems.call(makeContext(), 'gamma');
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		const body = httpRequestWithAuthentication.mock.calls[0][1].body as {
			query: string;
			variables: unknown;
		};
		expect(body.query).toContain('search {');
		expect(body.query).toContain('items(query: $q, limit: $limit, board_ids: $boardIds)');
		expect(body.variables).toEqual({ q: 'gamma', limit: 20, boardIds: ['111'] });
	});

	it('labels search results from live_data, including subitems by parent', async () => {
		mockSearchResponse([
			{
				id: '1',
				indexed_data: { name: 'Indexed Alpha' },
				live_data: { id: '1', name: 'Alpha', group: { title: 'Backlog' }, parent_item: null },
			},
			{
				id: '2',
				indexed_data: { name: 'Indexed Child' },
				live_data: {
					id: '2',
					name: 'Child',
					group: { title: 'Tasks' },
					parent_item: { id: '1', name: 'Alpha' },
				},
			},
		]);
		const result = await searchItems.call(makeContext(), 'alp');
		expect(result.results).toEqual([
			{ name: 'Alpha (Backlog)', value: '1' },
			{ name: 'Child (subitem of Alpha)', value: '2' },
		]);
	});

	it('keeps search rows with null live_data, falling back to indexed_data', async () => {
		mockSearchResponse([{ id: '9', indexed_data: { name: 'Lagging Item' }, live_data: null }]);
		const result = await searchItems.call(makeContext(), 'lag');
		expect(result.results).toEqual([{ name: 'Lagging Item', value: '9' }]);
	});

	it('never returns a paginationToken on the search path (top-N only)', async () => {
		mockSearchResponse([{ id: '1', indexed_data: { name: 'A' }, live_data: null }]);
		const result = await searchItems.call(makeContext(), 'a');
		expect(result.paginationToken).toBeUndefined();
	});

	it('treats a whitespace-only filter as browse mode', async () => {
		mockItemsPage([]);
		await searchItems.call(makeContext(), '   ');
		const body = httpRequestWithAuthentication.mock.calls[0][1].body as { query: string };
		expect(body.query).not.toContain('search {');
	});

	it('stays a single request on classic boards', async () => {
		mockItemsPage([{ id: '1', name: 'Alpha', group: { title: 'Backlog' } }], {
			hierarchy_type: 'classic',
			groups: [{ id: 'topics' }],
		});
		await searchItems.call(makeContext());
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('re-queries multi-level boards with the all-items scope and an all-groups rule', async () => {
		mockItemsPage([{ id: '1', name: 'Parent', group: { title: 'Tasks' } }], {
			hierarchy_type: 'multi_level',
			groups: [{ id: 'topics' }, { id: 'g2' }],
		});
		httpRequestWithAuthentication.mockResolvedValueOnce({
			data: {
				boards: [
					{
						items_page: {
							items: [
								{ id: '1', name: 'Parent', group: { title: 'Tasks' }, parent_item: null },
								{
									id: '2',
									name: 'Child',
									group: { title: 'Tasks' },
									parent_item: { id: '1', name: 'Parent' },
								},
							],
						},
					},
				],
			},
		});

		const result = await searchItems.call(makeContext());
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);

		const secondBody = httpRequestWithAuthentication.mock.calls[1][1].body as {
			query: string;
			variables: { queryParams: unknown };
		};
		expect(secondBody.query).toContain('hierarchy_scope_config: "allItems"');
		// No search term → the tautological all-groups rule (unfiltered
		// allItems returns an empty page — verified API bug).
		expect(secondBody.variables.queryParams).toEqual({
			rules: [{ column_id: 'group', compare_value: ['topics', 'g2'], operator: 'any_of' }],
		});

		expect(result.results).toEqual([
			{ name: 'Parent (Tasks)', value: '1' },
			{ name: 'Child (subitem of Parent)', value: '2' },
		]);
	});

	it('stays a single search request when a term is given, even on multi-level boards', async () => {
		// The search path never queries items_page — subitems ride along in
		// the search results themselves.
		mockSearchResponse([]);
		await searchItems.call(makeContext(), 'child');
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		const body = httpRequestWithAuthentication.mock.calls[0][1].body as { query: string };
		expect(body.query).toContain('search {');
	});
});
