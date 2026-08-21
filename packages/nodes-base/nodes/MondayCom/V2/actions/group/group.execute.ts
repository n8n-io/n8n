/**
 * Maps the Group: Create Position option to create_group's positioning
 * arguments. Verified live (2026-07): `after_at` without `relative_to` puts
 * the group at the top of the board, `before_at` without `relative_to` at the
 * bottom; with `relative_to` they mean below/above that group. No option set
 * means no arguments — the API default is the top of the board.
 */
export function buildGroupPositionArgs(
	position: string | undefined,
	anchorGroupId: string | undefined,
): { method?: 'after_at' | 'before_at'; relativeTo?: string } | 'missing-anchor' {
	if (!position) return {};
	if (position === 'top') return { method: 'after_at' };
	if (position === 'bottom') return { method: 'before_at' };
	if (!anchorGroupId) return 'missing-anchor';
	return { method: position === 'before' ? 'before_at' : 'after_at', relativeTo: anchorGroupId };
}

/**
 * Finds the top-most (lowest numeric position) or bottom-most (highest)
 * group of a board, excluding the given group — the anchor a group is
 * repositioned before/after for the "At Top" / "At Bottom" placements.
 */
export function findEdgeGroupId(
	groups: Array<{ id: string; position: string }>,
	excludeGroupId: string,
	edge: 'top' | 'bottom',
): string | undefined {
	let found: { id: string; position: number } | undefined;
	for (const group of groups) {
		if (group.id === excludeGroupId) continue;
		const value = Number.parseFloat(group.position);
		if (!Number.isFinite(value)) continue;
		if (!found || (edge === 'bottom' ? value > found.position : value < found.position)) {
			found = { id: group.id, position: value };
		}
	}
	return found?.id;
}

/**
 * Builds one aliased request applying each update_group attribute change in
 * order (update_group takes exactly one attribute per mutation). NOT atomic:
 * a failing alias doesn't roll back or stop the others (verified live) — the
 * UI description warns about this.
 */
export function buildUpdateGroupMutation(
	updates: Array<{ attribute: 'title' | 'color' | GroupRepositionAttribute; value: string }>,
): { query: string; variables: Record<string, string> } {
	const variables: Record<string, string> = {};
	const varDefs = ['$boardId: ID!', '$groupId: String!'];
	const aliases = updates.map((update, index) => {
		varDefs.push(`$value${index}: String!`);
		variables[`value${index}`] = update.value;
		return `u${index}: update_group(board_id: $boardId, group_id: $groupId, group_attribute: ${update.attribute}, new_value: $value${index}) { id title color position archived }`;
	});
	return {
		query: `mutation (${varDefs.join(', ')}) {\n${aliases.join('\n')}\n}`,
		variables,
	};
}

type GroupRepositionAttribute = 'relative_position_after' | 'relative_position_before';
