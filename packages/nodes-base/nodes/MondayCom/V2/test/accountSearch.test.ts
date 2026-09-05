import { describe, it, expect } from 'vitest';
import {
	buildAccountSearchPlan,
	flattenSearchResults,
	SEARCH_MAX_LIMIT,
	SEARCH_OPERATION_ENTITY,
	SEARCH_OPERATION_VALUES,
} from '../helpers/accountSearch';

describe('accountSearch', () => {
	describe('buildAccountSearchPlan', () => {
		it('builds a minimal single-entity query with only used variables', () => {
			const plan = buildAccountSearchPlan('kickoff', ['items'], false, 10);

			expect(plan.query).toContain('query ($q: String!, $limit: Int)');
			expect(plan.query).toContain('items(query: $q, limit: $limit)');
			expect(plan.query).toContain('indexed_data { id name url board_id workspace_id }');
			expect(plan.query).not.toContain('live_data');
			expect(plan.query).not.toContain('$strategy');
			expect(plan.query).not.toContain('$dateRange');
			expect(plan.variables).toEqual({ q: 'kickoff', limit: 10 });
		});

		it('covers every entity behind a Search operation', () => {
			const entities = Object.values(SEARCH_OPERATION_ENTITY);
			const plan = buildAccountSearchPlan('q', entities, false, 5);

			for (const entity of entities) {
				expect(plan.query).toContain(`${entity}(query: $q, limit: $limit)`);
			}
		});

		it('maps every operation value to a known entity with query support', () => {
			expect(SEARCH_OPERATION_VALUES).toHaveLength(7);
			for (const operation of SEARCH_OPERATION_VALUES) {
				const entity = SEARCH_OPERATION_ENTITY[operation];
				const plan = buildAccountSearchPlan('q', [entity], false, 5);
				expect(plan.query).toContain(`${entity}(query: $q, limit: $limit)`);
			}
		});

		it('adds live_data selections when requested', () => {
			const plan = buildAccountSearchPlan('q', ['users'], true, 10);

			expect(plan.query).toContain('live_data { id name email title kind status url');
		});

		it('clamps the limit to the API hard cap and floor', () => {
			expect(buildAccountSearchPlan('q', ['items'], false, 50).variables.limit).toBe(
				SEARCH_MAX_LIMIT,
			);
			expect(buildAccountSearchPlan('q', ['items'], false, 0).variables.limit).toBe(1);
		});

		it('declares strategy and date_range on every entity when set', () => {
			const plan = buildAccountSearchPlan('q', ['items', 'boards'], false, 10, 'QUALITY', {
				createdAfter: '2026-01-01T00:00:00Z',
				updatedBefore: '2026-07-01T00:00:00Z',
			});

			expect(plan.query).toContain('$strategy: SearchStrategy');
			expect(plan.query).toContain('$dateRange: CrossEntityDateRangeInput');
			expect(plan.query).toContain(
				'items(query: $q, limit: $limit, strategy: $strategy, date_range: $dateRange)',
			);
			expect(plan.query).toContain(
				'boards(query: $q, limit: $limit, strategy: $strategy, date_range: $dateRange)',
			);
			expect(plan.variables.strategy).toBe('QUALITY');
			expect(plan.variables.dateRange).toEqual({
				created_after: '2026-01-01T00:00:00Z',
				updated_before: '2026-07-01T00:00:00Z',
			});
		});

		it('attaches each filter only to the entities whose field accepts it', () => {
			const plan = buildAccountSearchPlan(
				'q',
				['items', 'docs', 'users', 'updates', 'timeline_items'],
				false,
				10,
				undefined,
				{
					boardIds: ['111'],
					workspaceIds: ['222'],
					creatorIds: ['333'],
					itemIds: ['444'],
					timelineType: 'email',
					timelineProductKind: 'crm',
				},
			);

			// items: board + workspace filters, no creator/item/type args.
			expect(plan.query).toMatch(
				/items\(query: \$q, limit: \$limit, board_ids: \$boardIds, workspace_ids: \$workspaceIds\)/,
			);
			// docs: workspace filter only (the API has no doc board filter).
			expect(plan.query).toMatch(
				/docs\(query: \$q, limit: \$limit, workspace_ids: \$workspaceIds\)/,
			);
			// users: no filters at all.
			expect(plan.query).toMatch(/users\(query: \$q, limit: \$limit\)/);
			// updates: board + creator.
			expect(plan.query).toMatch(
				/updates\(query: \$q, limit: \$limit, board_ids: \$boardIds, creator_ids: \$creatorIds\)/,
			);
			// timeline_items: everything.
			expect(plan.query).toMatch(
				/timeline_items\(query: \$q, limit: \$limit, board_ids: \$boardIds, workspace_ids: \$workspaceIds, item_ids: \$itemIds, type: \$timelineType, product_kind: \$timelineProductKind\)/,
			);

			// Each variable declared exactly once.
			expect(plan.query.match(/\$boardIds: \[ID!\]/g)).toHaveLength(1);
			expect(plan.query.match(/\$workspaceIds: \[ID!\]/g)).toHaveLength(1);
			expect(plan.query).toContain('$timelineType: TimelineItemKind');
			expect(plan.query).toContain('$timelineProductKind: TimelineItemProductKind');
			expect(plan.variables.boardIds).toEqual(['111']);
			expect(plan.variables.itemIds).toEqual(['444']);
		});

		it('omits filter variables no selected entity accepts', () => {
			// creatorIds only applies to updates — searching users must not declare it.
			const plan = buildAccountSearchPlan('q', ['users'], false, 10, undefined, {
				creatorIds: ['333'],
				boardIds: ['111'],
			});

			expect(plan.query).not.toContain('$creatorIds');
			expect(plan.query).not.toContain('$boardIds');
			expect(plan.variables.creatorIds).toBeUndefined();
			expect(plan.variables.boardIds).toBeUndefined();
		});

		it('ignores empty filter arrays and unknown entities', () => {
			const plan = buildAccountSearchPlan('q', ['items', 'bogus'], false, 10, undefined, {
				boardIds: [],
			});

			expect(plan.query).not.toContain('bogus');
			expect(plan.query).not.toContain('$boardIds');
		});
	});

	describe('flattenSearchResults', () => {
		const searchData = {
			items: {
				results: [
					{
						id: '1',
						indexed_data: { id: '1', name: 'alpha', board_id: '9' },
						live_data: { id: '1', name: 'alpha-renamed' },
					},
				],
			},
			users: {
				results: [{ id: '2', indexed_data: { id: '2', name: 'Ada', email: 'ada@x.com' } }],
			},
		};

		it('emits one tagged row per result across entity types', () => {
			const rows = flattenSearchResults(searchData, ['items', 'users'], false);

			expect(rows).toEqual([
				{ entityType: 'item', id: '1', name: 'alpha', board_id: '9' },
				{ entityType: 'user', id: '2', name: 'Ada', email: 'ada@x.com' },
			]);
		});

		it('carries liveData when requested, null when the API returned none', () => {
			const rows = flattenSearchResults(searchData, ['items', 'users'], true);

			expect(rows[0].liveData).toEqual({ id: '1', name: 'alpha-renamed' });
			expect(rows[1].liveData).toBeNull();
		});

		it('returns no rows for missing containers or empty responses', () => {
			expect(flattenSearchResults(undefined, ['items'], false)).toEqual([]);
			expect(flattenSearchResults({}, ['items'], false)).toEqual([]);
			expect(flattenSearchResults({ items: { results: [] } }, ['items'], false)).toEqual([]);
		});

		it('tags timeline_items rows with the camelCase entityType', () => {
			const rows = flattenSearchResults(
				{ timeline_items: { results: [{ id: '3', indexed_data: { title: 'call' } }] } },
				['timeline_items'],
				false,
			);

			expect(rows[0].entityType).toBe('timelineItem');
		});
	});
});
