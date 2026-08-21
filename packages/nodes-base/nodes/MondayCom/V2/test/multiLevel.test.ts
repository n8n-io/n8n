/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
	buildAllGroupsRule,
	fetchBoardGroupIds,
	formatBatteryText,
	getBoardHierarchyType,
	validateRollupFunction,
} from '../helpers/multiLevel';
import { MondayGraphQLClient } from '../transport/MondayGraphQLClient';

const httpRequestWithAuthentication = vi.fn();

function makeClient() {
	return new MondayGraphQLClient({
		getNode: () => ({ name: 'monday.com', type: 'CUSTOM.monday', typeVersion: 1 }),
		helpers: { httpRequestWithAuthentication },
	} as any);
}

beforeEach(() => {
	httpRequestWithAuthentication.mockReset();
});

describe('getBoardHierarchyType', () => {
	it('returns multi_level for multi-level boards', async () => {
		httpRequestWithAuthentication.mockResolvedValueOnce({
			data: { boards: [{ id: '1', hierarchy_type: 'multi_level' }] },
		});
		expect(await getBoardHierarchyType(makeClient(), 0, '1')).toBe('multi_level');
	});

	it('returns classic for classic boards and for boards without the field', async () => {
		httpRequestWithAuthentication.mockResolvedValueOnce({
			data: { boards: [{ id: '1', hierarchy_type: 'classic' }] },
		});
		expect(await getBoardHierarchyType(makeClient(), 0, '1')).toBe('classic');

		httpRequestWithAuthentication.mockResolvedValueOnce({
			data: { boards: [{ id: '2', hierarchy_type: null }] },
		});
		expect(await getBoardHierarchyType(makeClient(), 0, '2')).toBe('classic');

		httpRequestWithAuthentication.mockResolvedValueOnce({ data: { boards: [] } });
		expect(await getBoardHierarchyType(makeClient(), 0, '3')).toBe('classic');
	});

	it('caches per client instance — one request per board per execution', async () => {
		httpRequestWithAuthentication.mockResolvedValue({
			data: { boards: [{ id: '1', hierarchy_type: 'multi_level' }] },
		});
		const client = makeClient();
		await getBoardHierarchyType(client, 0, '1');
		await getBoardHierarchyType(client, 0, '1');
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(1);

		// A different client (new execution) queries again.
		await getBoardHierarchyType(makeClient(), 0, '1');
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});
});

describe('formatBatteryText', () => {
	const settingsStr = JSON.stringify({ labels: { '0': 'Working on it', '1': 'Done' } });

	it('resolves label indexes to text with counts', () => {
		expect(
			formatBatteryText(
				[
					{ key: '1', count: 2 },
					{ key: '0', count: 1 },
				],
				settingsStr,
			),
		).toBe('Done: 2, Working on it: 1');
	});

	it('keeps unknown keys visible instead of dropping them', () => {
		expect(formatBatteryText([{ key: '7', count: 3 }], settingsStr)).toBe('label 7: 3');
	});

	it('survives malformed settings and empty batteries', () => {
		expect(formatBatteryText([{ key: '0', count: 1 }], 'not json')).toBe('label 0: 1');
		expect(formatBatteryText([], settingsStr)).toBeNull();
		expect(formatBatteryText(null, settingsStr)).toBeNull();
	});
});

describe('buildAllGroupsRule / fetchBoardGroupIds', () => {
	it('builds the tautological any_of group rule', () => {
		expect(buildAllGroupsRule(['topics', 'g2'])).toEqual({
			column_id: 'group',
			compare_value: ['topics', 'g2'],
			operator: 'any_of',
		});
	});

	it('fetches the board group ids in one call', async () => {
		httpRequestWithAuthentication.mockResolvedValueOnce({
			data: { boards: [{ groups: [{ id: 'topics' }, { id: 'g2' }] }] },
		});
		expect(await fetchBoardGroupIds(makeClient(), 0, '1')).toEqual(['topics', 'g2']);
	});
});

describe('validateRollupFunction', () => {
	it('accepts supported type/function pairs', () => {
		expect(validateRollupFunction('numbers', 'SUM')).toBeNull();
		expect(validateRollupFunction('numbers', 'NONE')).toBeNull();
		expect(validateRollupFunction('date', 'MIN')).toBeNull();
		expect(validateRollupFunction('timeline', 'MIN_MAX')).toBeNull();
		expect(validateRollupFunction('status', 'COUNT_KEYS')).toBeNull();
	});

	it('rejects unsupported functions with the allowed list', () => {
		expect(validateRollupFunction('status', 'SUM')).toContain('COUNT_KEYS, NONE');
		expect(validateRollupFunction('numbers', 'COUNT_KEYS')).toContain('SUM, MIN, MAX, NONE');
	});

	it('rejects column types that cannot roll up', () => {
		expect(validateRollupFunction('text', 'SUM')).toContain('not supported on text columns');
	});
});
