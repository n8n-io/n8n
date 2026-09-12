import { describe, expect, it } from 'vitest';

import {
	buildGroupPositionArgs,
	buildUpdateGroupMutation,
	findEdgeGroupId,
} from '../actions/group/group.execute';

describe('buildGroupPositionArgs', () => {
	it('sends no positioning arguments when the option is unset (API default = top)', () => {
		expect(buildGroupPositionArgs(undefined, undefined)).toEqual({});
		expect(buildGroupPositionArgs('', '')).toEqual({});
	});

	it('maps At Top to after_at without an anchor', () => {
		expect(buildGroupPositionArgs('top', '')).toEqual({ method: 'after_at' });
	});

	it('maps At Bottom to before_at without an anchor', () => {
		expect(buildGroupPositionArgs('bottom', '')).toEqual({ method: 'before_at' });
	});

	it('maps After Group to after_at relative to the anchor', () => {
		expect(buildGroupPositionArgs('after', 'topics')).toEqual({
			method: 'after_at',
			relativeTo: 'topics',
		});
	});

	it('maps Before Group to before_at relative to the anchor', () => {
		expect(buildGroupPositionArgs('before', 'topics')).toEqual({
			method: 'before_at',
			relativeTo: 'topics',
		});
	});

	it('flags a missing anchor for the relative placements', () => {
		expect(buildGroupPositionArgs('after', '')).toBe('missing-anchor');
		expect(buildGroupPositionArgs('before', undefined)).toBe('missing-anchor');
	});
});

describe('findEdgeGroupId', () => {
	const groups = [
		{ id: 'g-top', position: '16409.0' },
		{ id: 'topics', position: '65536' },
		{ id: 'g-bottom', position: '17592186077184.0' },
	];

	it('returns the group with the highest numeric position for bottom', () => {
		expect(findEdgeGroupId(groups, 'new-group', 'bottom')).toBe('g-bottom');
	});

	it('returns the group with the lowest numeric position for top', () => {
		expect(findEdgeGroupId(groups, 'new-group', 'top')).toBe('g-top');
	});

	it('skips the excluded group', () => {
		expect(findEdgeGroupId(groups, 'g-bottom', 'bottom')).toBe('topics');
		expect(findEdgeGroupId(groups, 'g-top', 'top')).toBe('topics');
	});

	it('ignores unparseable positions and handles an empty board', () => {
		expect(findEdgeGroupId([{ id: 'weird', position: 'n/a' }], 'x', 'bottom')).toBeUndefined();
		expect(findEdgeGroupId([], 'x', 'top')).toBeUndefined();
	});
});

describe('buildUpdateGroupMutation', () => {
	it('builds one aliased update_group per attribute, in order', () => {
		const { query, variables } = buildUpdateGroupMutation([
			{ attribute: 'title', value: 'New name' },
			{ attribute: 'color', value: 'turquoise' },
			{ attribute: 'relative_position_after', value: 'group_abc' },
		]);
		expect(query).toContain(
			'u0: update_group(board_id: $boardId, group_id: $groupId, group_attribute: title, new_value: $value0)',
		);
		expect(query).toContain('u1: update_group');
		expect(query).toContain('group_attribute: color, new_value: $value1');
		expect(query).toContain('group_attribute: relative_position_after, new_value: $value2');
		expect(query).toContain('$value0: String!');
		expect(query).toContain('$value2: String!');
		expect(variables).toEqual({
			value0: 'New name',
			value1: 'turquoise',
			value2: 'group_abc',
		});
	});

	it('requests the full group record from every alias', () => {
		const { query } = buildUpdateGroupMutation([{ attribute: 'title', value: 'x' }]);
		expect(query).toContain('{ id title color position archived }');
		expect(query).not.toContain('u1:');
	});
});
