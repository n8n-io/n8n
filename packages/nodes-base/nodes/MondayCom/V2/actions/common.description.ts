import type { INodeProperties } from 'n8n-workflow';

import { SEARCH_STRATEGY_OPTIONS } from '../helpers/accountSearch';
import { boardResourceLocator } from '../helpers/boardLocator';
import {
	HIDE_UNTIL_BOARD_SELECTED,
	itemIdTextProperty,
	itemListOnlyResourceLocator,
} from '../helpers/itemLocator';
import { buildUserRowsProperty } from '../helpers/userLocator';

/**
 * The extended-data toggle shared by Board: Get and Board: Get Many. Its
 * description is the user-facing warning that the extra fields aren't free.
 */
export const INCLUDE_COMPLETE_BOARD_DATA_OPTION: INodeProperties = {
	displayName: 'Include Complete Board Data',
	name: 'includeCompleteData',
	type: 'boolean',
	default: false,
	description:
		'Whether to also return subscribers, team subscribers, tags, permissions, access level, items limit, top group, hierarchy type, source board ID, communication value, and board metadata. Turning this on increases the complexity cost and latency of the query — noticeably so on Get Many with high limits.',
};

/** Shared "Position: Relative To Group" picker; description varies by operation. */
export function positionRelativeToGroupField(relativeToDescription: string): INodeProperties {
	return {
		// Prefix keeps it next to Position; suffixing "Name or ID" would break that.
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Position: Relative To Group',
		name: 'positionGroupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardGroups',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-from-dynamic-options -- description is operation-specific; still ends with the required expression hint
		description: `${relativeToDescription} Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>`,
		displayOptions: { show: { groupPosition: ['after', 'before'] } },
	};
}

export const GROUP_POSITION_OPTIONS = [
	{ name: 'After Group', value: 'after' },
	{ name: 'At Bottom', value: 'bottom' },
	{ name: 'At Top', value: 'top' },
	{ name: 'Before Group', value: 'before' },
];

export const labelColumnKindProperty: INodeProperties = {
	displayName: 'Column Kind',
	name: 'labelColumnKind',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Dropdown', value: 'dropdown' },
		{ name: 'Status', value: 'status' },
	],
	default: 'status',
	description: 'The kind of column to edit labels on',
};

export const labelColumnIdProperty: INodeProperties = {
	displayName: 'Column Name or ID',
	name: 'labelColumnId',
	type: 'options',
	typeOptions: {
		loadOptionsMethod: 'getBoardLabelColumns',
		loadOptionsDependsOn: ['boardId.value', 'labelColumnKind'],
	},
	default: '',
	required: true,
	description:
		'The status/dropdown column to edit labels on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
};

export const itemInputBoardProperty: INodeProperties = {
	...boardResourceLocator,
	description: 'The board holding the item — used only to pick the item from the list',
	displayOptions: {
		show: {
			itemInputMode: ['list'],
		},
	},
};

export const itemInputListProperty: INodeProperties = {
	...itemListOnlyResourceLocator,
	displayOptions: {
		show: {
			itemInputMode: ['list'],
		},
		hide: HIDE_UNTIL_BOARD_SELECTED,
	},
};

export const itemInputIdProperty: INodeProperties = {
	...itemIdTextProperty,
	displayOptions: {
		show: {
			itemInputMode: ['id'],
		},
	},
};

export const archiveOrDeleteActionProperty: INodeProperties = {
	// One selector shared by every Archive or Delete operation
	// (Item / Board / Group). Archive is the safe default; Delete
	// is explicit and clearly marked permanent.
	displayName: 'Action',
	name: 'archiveOrDeleteAction',
	type: 'options',
	options: [
		{
			name: 'Archive',
			value: 'archive',
			description: 'Move to the archive — recoverable from monday.com',
		},
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete permanently — this cannot be undone',
		},
	],
	default: 'archive',
	description: 'Whether to archive (recoverable) or permanently delete',
};

export const columnValuesModeProperty: INodeProperties = {
	displayName: 'Column Values',
	name: 'columnValuesMode',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Map Columns',
			value: 'mapper',
			description: 'Pick columns and enter friendly values per column type',
		},
		{
			name: 'Raw JSON',
			value: 'json',
			description: 'Provide the API-format column_values JSON directly',
		},
	],
	default: 'mapper',
};

export const columnsProperty: INodeProperties = {
	displayName: 'Columns',
	name: 'columns',
	type: 'resourceMapper',
	noDataExpression: true,
	default: { mappingMode: 'defineBelow', value: null },
	typeOptions: {
		loadOptionsDependsOn: ['boardId.value', 'operation'],
		resourceMapper: {
			resourceMapperMethod: 'getColumnFields',
			mode: 'add',
			fieldWords: { singular: 'column', plural: 'columns' },
			addAllFields: false,
			supportAutoMap: false,
		},
	},
	displayOptions: {
		show: {
			columnValuesMode: ['mapper'],
		},
	},
};

export const columnValuesJsonProperty: INodeProperties = {
	displayName: 'Column Values (JSON)',
	name: 'columnValuesJson',
	type: 'json',
	default: '{}',
	description:
		'Column values in the monday API format, keyed by column ID (e.g. {"status": {"label": "Done"}}). See <a href="https://developer.monday.com/api-reference/reference/column-types-reference">the column types reference</a>.',
	displayOptions: {
		show: {
			columnValuesMode: ['json'],
		},
	},
};

export const createOptionsProperty: INodeProperties = {
	displayName: 'Options',
	name: 'createOptions',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	options: [
		{
			// Optional, so it lives here rather than as a top-level
			// dropdown whose empty default renders as an unsupported value.
			displayName: 'Group Name or ID',
			name: 'groupId',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getBoardGroups',
				loadOptionsDependsOn: ['boardId.value'],
			},
			default: '',
			description:
				'The group to create the item in; defaults to the board\'s top group. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			displayOptions: {
				show: { '/operation': ['createItem'] },
				hide: { '/createAs': ['subitem'] },
			},
		},
		{
			displayName: 'Create Labels If Missing',
			name: 'createLabelsIfMissing',
			type: 'boolean',
			default: false,
			description:
				'Whether to create status/dropdown labels that do not exist yet (requires board owner permissions)',
		},
	],
};

export const searchQueryProperty: INodeProperties = {
	displayName: 'Query',
	name: 'searchQuery',
	type: 'string',
	default: '',
	required: true,
	description: 'The text to search for — matched by keyword and semantic relevance',
};

export const includeLiveDataProperty: INodeProperties = {
	displayName: 'Include Live Data',
	name: 'includeLiveData',
	type: 'boolean',
	default: false,
	description:
		'Whether to also resolve each result to its latest full entity from the core API (adds latency). The search index itself is fast but can be slightly stale. liveData is null when the entity was deleted, is inaccessible, or was not yet re-indexed.',
};

export const searchOptionsProperty: INodeProperties = {
	displayName: 'Options',
	name: 'searchOptions',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	options: [
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
			displayName: 'Boards',
			name: 'boardIds',
			type: 'multiOptions',
			typeOptions: { loadOptionsMethod: 'getBoardList' },
			default: [],
			description:
				'Only return results from these boards. The list shows only the 500 most recently used boards; for boards beyond that window, pass explicit IDs via an expression (an array or a comma-separated string). Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			displayOptions: {
				show: {
					'/operation': ['searchItemsAccount', 'searchBoardsAccount', 'searchUpdatesAccount'],
				},
			},
		},
		{
			displayName: 'Created After',
			name: 'createdAfter',
			type: 'dateTime',
			default: '',
			description: 'Only return results created after this time',
		},
		{
			displayName: 'Created Before',
			name: 'createdBefore',
			type: 'dateTime',
			default: '',
			description: 'Only return results created before this time',
		},
		buildUserRowsProperty({
			displayName: 'Creators',
			name: 'creatorIds',
			description:
				'Only return updates authored by these users. Expressions accept an array or a comma-separated string of user IDs.',
			displayOptions: { show: { '/operation': ['searchUpdatesAccount'] } },
		}),
		{
			// Named searchLimit (not the node-wide `limit` convention) on
			// purpose: search is hard-capped at 20 results by the API, so
			// the standard 50 default cannot apply.
			displayName: 'Limit',
			name: 'searchLimit',
			type: 'number',
			typeOptions: { minValue: 1, maxValue: 20 },
			default: 10,
			description:
				'Max number of results to return. The API hard-caps search at 20 results with no pagination — results are the top matches by relevance.',
		},
		{
			displayName: 'Strategy',
			name: 'strategy',
			type: 'options',
			options: SEARCH_STRATEGY_OPTIONS,
			default: 'BALANCED',
			description:
				'The trade-off between search quality and response time. Update search always uses keyword matching regardless of strategy.',
		},
		{
			displayName: 'Updated After',
			name: 'updatedAfter',
			type: 'dateTime',
			default: '',
			description: 'Only return results updated after this time',
		},
		{
			displayName: 'Updated Before',
			name: 'updatedBefore',
			type: 'dateTime',
			default: '',
			description: 'Only return results updated before this time',
		},
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
			displayName: 'Workspaces',
			name: 'workspaceIds',
			type: 'multiOptions',
			typeOptions: { loadOptionsMethod: 'getWorkspaces' },
			default: [],
			description:
				'Only return results from these workspaces. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			displayOptions: {
				show: { '/operation': ['searchItemsAccount', 'searchBoardsAccount'] },
			},
		},
	],
};
