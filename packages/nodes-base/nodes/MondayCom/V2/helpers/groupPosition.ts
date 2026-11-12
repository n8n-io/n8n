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
