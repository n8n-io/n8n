/** Builds the GraphQL field selection for the board read operations. */
export function buildBoardFieldSelection(options: {
	includeStructure?: boolean;
	includeCompleteData?: boolean;
}): string {
	return [
		...BOARD_BASE_FIELDS,
		...(options.includeStructure ? BOARD_STRUCTURE_FIELDS : []),
		...(options.includeCompleteData ? BOARD_COMPLETE_FIELDS : []),
	].join('\n');
}

/**
 * The opt-in "Include Complete Board Data" field set. Each of these adds
 * complexity cost and latency per board, so they stay behind the toggle.
 */
export const BOARD_COMPLETE_FIELDS = [
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
];

/** Structural fields only Board: Get returns — too heavy for a list. */
export const BOARD_STRUCTURE_FIELDS = [
	'owners { id name email }',
	'groups { id title color position }',
	'columns { id title type settings_str }',
];

export const BOARD_BASE_FIELDS = [
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
];
