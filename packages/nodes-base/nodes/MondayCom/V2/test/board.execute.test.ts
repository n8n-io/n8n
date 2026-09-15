import { describe, expect, it } from 'vitest';

import {
	buildBoardFieldSelection,
	buildReplacePlan,
	buildSubscriberRows,
	buildSubscribersSelection,
	formatActivityLogRow,
} from '../actions/board/board.execute';

describe('buildBoardFieldSelection', () => {
	it('always returns the enriched base fields', () => {
		const selection = buildBoardFieldSelection({});
		for (const field of [
			'id',
			'name',
			'state',
			'board_kind',
			'type',
			'url',
			'description',
			'items_count',
			'item_terminology',
			'created_at',
			'updated_at',
			'board_folder_id',
			'folder { id name }',
			'workspace { id name }',
		]) {
			expect(selection).toContain(field);
		}
	});

	it('keeps structure and complete-data fields out by default', () => {
		const selection = buildBoardFieldSelection({});
		expect(selection).not.toContain('groups');
		expect(selection).not.toContain('columns');
		expect(selection).not.toContain('subscribers');
		expect(selection).not.toContain('access_level');
	});

	it('adds groups, columns and owners for the single-board read', () => {
		const selection = buildBoardFieldSelection({ includeStructure: true });
		expect(selection).toContain('owners { id name email }');
		expect(selection).toContain('groups { id title color position }');
		expect(selection).toContain('columns { id title type settings_str }');
	});

	it('adds every complete-data field behind the toggle', () => {
		const selection = buildBoardFieldSelection({ includeCompleteData: true });
		for (const field of [
			'access_level',
			'permissions',
			'items_limit',
			'hierarchy_type',
			'created_from_board_id',
			'communication',
			'top_group { id title color position }',
			'subscribers { id name email }',
			'team_subscribers { id name }',
			'tags { id name color }',
			'inferred_metadata { item_type }',
			'manual_metadata { board_md }',
		]) {
			expect(selection).toContain(field);
		}
	});
});

describe('buildSubscriberRows', () => {
	it('flattens users and teams into typed role rows', () => {
		const rows = buildSubscriberRows({
			subscribers: [{ id: '1', name: 'Ada', email: 'ada@x.com' }],
			owners: [{ id: '1', name: 'Ada', email: 'ada@x.com' }],
			team_subscribers: [{ id: '9', name: 'Devs' }],
			team_owners: [],
		});
		expect(rows).toEqual([
			{ type: 'user', role: 'owner', id: '1', name: 'Ada', email: 'ada@x.com' },
			{ type: 'user', role: 'subscriber', id: '1', name: 'Ada', email: 'ada@x.com' },
			{ type: 'team', role: 'subscriber', id: '9', name: 'Devs' },
		]);
	});

	it('handles a board with no subscribers', () => {
		expect(buildSubscriberRows({})).toEqual([]);
	});

	it('passes enriched user and team fields through to the rows', () => {
		const rows = buildSubscriberRows({
			subscribers: [{ id: '1', name: 'Ada', email: 'ada@x.com', kind: 'admin', status: 'ACTIVE' }],
			team_subscribers: [{ id: '9', name: 'Devs', is_guest: false }],
		});
		expect(rows).toEqual([
			{
				type: 'user',
				role: 'subscriber',
				id: '1',
				name: 'Ada',
				email: 'ada@x.com',
				kind: 'admin',
				status: 'ACTIVE',
			},
			{ type: 'team', role: 'subscriber', id: '9', name: 'Devs', is_guest: false },
		]);
	});
});

describe('buildSubscribersSelection', () => {
	const all = { subscribers: true, owners: true, teamSubscribers: true, teamOwners: true };

	it('includes all four connections with enriched fields when everything is on', () => {
		const selection = buildSubscribersSelection(all);
		expect(selection).toContain('subscribers { id name email kind status title }');
		expect(selection).toContain('owners { id name email kind status title }');
		expect(selection).toContain(
			'team_subscribers(limit: 1000, page: 1) { id name is_guest picture_url }',
		);
		expect(selection).toContain(
			'team_owners(limit: 1000, page: 1) { id name is_guest picture_url }',
		);
	});

	it('omits toggled-off connections', () => {
		const selection = buildSubscribersSelection({
			...all,
			owners: false,
			teamOwners: false,
		});
		expect(selection).toContain('subscribers {');
		expect(selection).not.toContain('owners {');
		expect(selection).toContain('team_subscribers(');
		expect(selection).not.toContain('team_owners(');
	});

	it('returns an empty selection when all toggles are off', () => {
		expect(
			buildSubscribersSelection({
				subscribers: false,
				owners: false,
				teamSubscribers: false,
				teamOwners: false,
			}),
		).toBe('');
	});
});

describe('buildReplacePlan', () => {
	it('removes current members not in the desired selection', () => {
		const plan = buildReplacePlan(
			{
				subscribers: [{ id: '1' }, { id: '2' }, { id: '3' }],
				owners: [{ id: '1' }],
				team_subscribers: [{ id: '10' }, { id: '11' }],
				team_owners: [{ id: '10' }],
			},
			['2'],
			['11'],
			'99',
		);
		expect(plan.removeUserIds.sort()).toEqual(['1', '3']);
		expect(plan.removeTeamIds).toEqual(['10']);
		expect(plan.keptExecutingUser).toBe(false);
	});

	it('never removes the executing user and reports it', () => {
		const plan = buildReplacePlan(
			{ subscribers: [{ id: '99' }, { id: '2' }], owners: [{ id: '99' }] },
			['2'],
			[],
			'99',
		);
		expect(plan.removeUserIds).toEqual([]);
		expect(plan.keptExecutingUser).toBe(true);
	});

	it('does not report the executing user as kept when they are in the selection', () => {
		const plan = buildReplacePlan({ subscribers: [{ id: '99' }] }, ['99'], [], '99');
		expect(plan.removeUserIds).toEqual([]);
		expect(plan.keptExecutingUser).toBe(false);
	});

	it('dedupes members listed as both owner and subscriber', () => {
		const plan = buildReplacePlan(
			{ subscribers: [{ id: '5' }], owners: [{ id: '5' }] },
			['6'],
			[],
			'99',
		);
		expect(plan.removeUserIds).toEqual(['5']);
	});

	it('removes nothing when the selection matches the current membership', () => {
		const plan = buildReplacePlan(
			{ subscribers: [{ id: '1' }], team_subscribers: [{ id: '10' }] },
			['1'],
			['10'],
			'99',
		);
		expect(plan).toEqual({ removeUserIds: [], removeTeamIds: [], keptExecutingUser: false });
	});
});

describe('formatActivityLogRow', () => {
	it('parses the data JSON string and converts the 17-digit timestamp', () => {
		const row = formatActivityLogRow({
			id: 'log-1',
			event: 'update_column_value',
			entity: 'pulse',
			data: '{"board_id":123,"value":{"label":"Done"}}',
			user_id: '7',
			account_id: '55',
			// 17-digit UNIX time in 1e-7 s: 2026-01-01T00:00:00Z
			created_at: '17672256000000000',
		});
		expect(row.data).toEqual({ board_id: 123, value: { label: 'Done' } });
		expect(row.createdAt).toBe('2026-01-01T00:00:00.000Z');
		expect(row.createdAtRaw).toBe('17672256000000000');
		expect(row.event).toBe('update_column_value');
	});

	it('keeps unparseable data as-is and nulls a missing timestamp', () => {
		const row = formatActivityLogRow({ id: 'log-2', data: 'not-json' });
		expect(row.data).toBe('not-json');
		expect(row.createdAt).toBeNull();
	});
});
