import type { INodeProperties } from 'n8n-workflow';

import {
	AGGREGATE_DATE_GROUPING_OPTIONS,
	AGGREGATE_FUNCTION_OPTIONS,
} from '../../helpers/aggregate';
import { buildUserRowsProperty } from '../../helpers/userLocator';
import { workspaceResourceLocator } from '../../helpers/workspaceLocator';

/**
 * The extended-data toggle shared by Board: Get and Board: Get Many. Its
 * description is the user-facing warning that the extra fields aren't free.
 */
const INCLUDE_COMPLETE_BOARD_DATA_OPTION: INodeProperties = {
	displayName: 'Include Complete Board Data',
	name: 'includeCompleteData',
	type: 'boolean',
	default: false,
	description:
		'Whether to also return subscribers, team subscribers, tags, permissions, access level, items limit, top group, hierarchy type, source board ID, communication value, and board metadata. Turning this on increases the complexity cost and latency of the query — noticeably so on Get Many with high limits.',
};

export const boardOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['board'] } },
		options: [
			{
				name: 'Aggregate Item Data',
				value: 'aggregateBoardData',
				action: 'Aggregate item data on a board',
				description:
					'Calculate counts, sums, averages and more across a board’s items, optionally grouped like a pivot table — on monday’s servers, without fetching the items',
			},
			{
				name: 'Archive or Delete',
				value: 'archiveOrDeleteBoard',
				action: 'Archive or delete a board',
				description: 'Archive a board (recoverable, the default) or permanently delete it',
			},
			{
				name: 'Create',
				value: 'createBoard',
				action: 'Create a board',
				description: 'Create a new board, optionally in a specific workspace or from a template',
			},
			{
				name: 'Duplicate',
				value: 'duplicateBoard',
				action: 'Duplicate a board',
				description: 'Create a copy of a board: structure only, or including items and updates',
			},
			{
				name: 'Get',
				value: 'getBoard',
				action: 'Get a board',
				description: 'Return a single board with its groups and column schema',
			},
			{
				name: 'Get Many',
				value: 'getBoards',
				action: 'Get many boards',
				description: 'Return a page of boards, with optional filters',
			},
			{
				name: 'List Activity Logs',
				value: 'getActivityLogs',
				action: 'List board activity logs',
				description: 'Return the activity log events of a board, with optional filters',
			},
			{
				name: 'List Subscribers',
				value: 'getBoardSubscribers',
				action: 'List board subscribers',
				description: 'Return the users and teams subscribed to (or owning) a board',
			},
			{
				name: 'Search',
				value: 'searchBoardsAccount',
				action: 'Search boards',
				description: 'Find boards account-wide by keyword and semantic relevance',
			},
			{
				name: 'Update Subscribers',
				value: 'updateBoardSubscribers',
				action: 'Update board subscribers',
				description: 'Add users and/or teams to a board as subscribers or owners — or remove them',
			},
		],
		default: 'getBoard',
	},
];

export const boardFields: INodeProperties[] = [
	{
		displayName: 'Board Name',
		name: 'boardName',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the new board',
		displayOptions: { show: { operation: ['createBoard'] } },
	},
	{
		displayName: 'Board Kind',
		name: 'boardKind',
		type: 'options',
		options: [
			{ name: 'Private', value: 'private' },
			{ name: 'Public', value: 'public' },
			{ name: 'Shareable', value: 'share' },
		],
		default: 'public',
		required: true,
		description:
			'Who can see the board: public = everyone in the account, private = invited members, shareable = including guests',
		displayOptions: { show: { operation: ['createBoard'] } },
	},
	{
		displayName: 'Options',
		name: 'createBoardOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['createBoard'] } },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the new board',
			},
			{
				// The folder ID string is the value; "Name or ID" suffix per lint.
				displayName: 'Folder Name or ID',
				name: 'folderId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCreateBoardWorkspaceFolders',
					loadOptionsDependsOn: ['createBoardOptions.workspaceId.value'],
				},
				default: '',
				description:
					'The folder to create the board in. Select a workspace first — the list shows that workspace’s folders. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			buildUserRowsProperty({
				displayName: 'Owners',
				name: 'ownerIds',
				includeTeams: true,
				description:
					'The users and/or teams to set as board owners. The creating user is always an owner. In expression mode, pass a comma-separated string of user IDs and/or <code>team:&lt;ID&gt;</code> values.',
			}),
			buildUserRowsProperty({
				displayName: 'Subscribers',
				name: 'subscriberIds',
				includeTeams: true,
				description:
					'The users and/or teams to subscribe to the board. In expression mode, pass a comma-separated string of user IDs and/or <code>team:&lt;ID&gt;</code> values.',
			}),
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				default: '',
				description:
					'Create the board from this board template. monday has no API to list templates, so copy the numeric ID from the template’s Template Center URL (enable Developer mode in monday.labs to see IDs). The template must be accessible to the API user.',
			},
			{
				...workspaceResourceLocator,
				description:
					'The workspace to create the board in. To use the account’s Main workspace, leave this unset — the API does not list it as a selectable workspace. Picking a workspace here also loads its folders into the Folder option.',
			},
		],
	},

	{
		displayName: 'Duplicate Type',
		name: 'duplicateType',
		type: 'options',
		options: [
			{
				name: 'Structure and Items',
				value: 'duplicate_board_with_pulses',
				description: 'Copy groups, columns, and all items',
			},
			{
				name: 'Structure Only',
				value: 'duplicate_board_with_structure',
				description: 'Copy groups and columns, without items',
			},
			{
				name: 'Structure, Items and Updates',
				value: 'duplicate_board_with_pulses_and_updates',
				description: 'Copy groups, columns, items, and their updates',
			},
		],
		default: 'duplicate_board_with_structure',
		required: true,
		description: 'How much of the board to copy',
		displayOptions: { show: { operation: ['duplicateBoard'] } },
	},
	{
		displayName: 'Options',
		name: 'duplicateBoardOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['duplicateBoard'] } },
		options: [
			{
				displayName: 'Board Name',
				name: 'boardName',
				type: 'string',
				default: '',
				description: 'The name of the new board; left unset, monday derives one from the original',
			},
			{
				// The folder ID string is the value; "Name or ID" suffix per lint.
				displayName: 'Folder Name or ID',
				name: 'folderId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkspaceFolders',
					loadOptionsDependsOn: ['duplicateBoardOptions.workspaceId.value'],
				},
				default: '',
				description:
					'The folder to create the duplicate in. Select a workspace first — the list shows that workspace’s folders. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Keep Subscribers',
				name: 'keepSubscribers',
				type: 'boolean',
				default: false,
				description: 'Whether to copy the original board’s subscribers to the new board',
			},
			{
				...workspaceResourceLocator,
				description:
					'The workspace to create the duplicate in; left unset, it stays in the original board’s workspace. Picking a workspace here also loads its folders into the Folder option.',
			},
		],
	},

	{
		// Add vs Remove used to be two operations; merged into one with
		// a mode selector (product decision 2026-07-19, no back compat).
		displayName: 'Action',
		name: 'subscribersAction',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add the users/teams to the board as subscribers or owners',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove the users/teams from the board',
			},
		],
		default: 'add',
		description: 'Whether to add the selected users/teams to the board or remove them',
		displayOptions: { show: { operation: ['updateBoardSubscribers'] } },
	},
	buildUserRowsProperty({
		displayName: 'Users',
		name: 'subscriberUserIds',
		description:
			'The users to add or remove. In expression mode, pass user IDs as a comma-separated string.',
		displayOptions: { show: { operation: ['updateBoardSubscribers'] } },
	}),
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Teams',
		name: 'subscriberTeamIds',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getTeamsList' },
		default: [],
		description:
			'The teams to add or remove. In expression mode, pass team IDs as a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { operation: ['updateBoardSubscribers'] } },
	},
	{
		displayName: 'Add As',
		name: 'subscriberKind',
		type: 'options',
		options: [
			{ name: 'Owner', value: 'owner' },
			{ name: 'Subscriber', value: 'subscriber' },
		],
		default: 'subscriber',
		description: 'Whether the users/teams become plain subscribers or board owners',
		displayOptions: {
			show: { operation: ['updateBoardSubscribers'], subscribersAction: ['add'] },
		},
	},
	{
		// Advanced options, not an Update Fields collection — the lint rule
		// misfires on any collection shown for an operation named update*.
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-update-fields
		displayName: 'Options',
		name: 'updateSubscribersOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: { operation: ['updateBoardSubscribers'], subscribersAction: ['add'] },
		},
		options: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Append',
						value: 'append',
						description: 'Add the selected users/teams on top of the current subscribers',
					},
					{
						name: 'Replace',
						value: 'replace',
						description:
							'Make the selected users/teams the only subscribers: current ones not in the selection are removed (the user running the workflow is never removed)',
					},
				],
				default: 'append',
				description: 'How the selection is applied to the board’s current subscribers',
			},
		],
	},
	{
		displayName: 'Include User Subscribers',
		name: 'includeSubscribers',
		type: 'boolean',
		default: true,
		description: 'Whether to return the users subscribed to the board',
		displayOptions: { show: { operation: ['getBoardSubscribers'] } },
	},
	{
		displayName: 'Include User Owners',
		name: 'includeOwners',
		type: 'boolean',
		default: true,
		description: 'Whether to return the users who own the board',
		displayOptions: { show: { operation: ['getBoardSubscribers'] } },
	},
	{
		displayName: 'Include Team Subscribers',
		name: 'includeTeamSubscribers',
		type: 'boolean',
		default: true,
		description:
			'Whether to return the teams subscribed to the board. Limitation: only the first 1,000 team subscribers are returned.',
		displayOptions: { show: { operation: ['getBoardSubscribers'] } },
	},
	{
		displayName: 'Include Team Owners',
		name: 'includeTeamOwners',
		type: 'boolean',
		default: true,
		description:
			'Whether to return the teams that own the board. Limitation: only the first 1,000 team owners are returned.',
		displayOptions: { show: { operation: ['getBoardSubscribers'] } },
	},

	{
		displayName: 'Filters',
		name: 'activityLogFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { operation: ['getActivityLogs'] } },
		options: [
			{
				// "Columns" per product wording, matching Include Columns.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Columns',
				name: 'columnIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardColumns',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return events on these columns. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Only return events from this time onward',
			},
			{
				// "Groups" per product wording, matching Include Groups.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Groups',
				name: 'groupIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardGroups',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return events in these groups. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Item IDs',
				name: 'itemIds',
				type: 'string',
				default: '',
				description: 'Only return events on these items (comma-separated IDs)',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Only return events up to this time',
			},
			buildUserRowsProperty({
				displayName: 'Users',
				name: 'userIds',
				description:
					'Only return events by these users. Expressions accept an array or a comma-separated string of user IDs.',
			}),
		],
	},
	{
		displayName: 'Options',
		name: 'activityLogOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['getActivityLogs'] } },
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 50,
				description: 'Max number of results to return',
				hint: 'Higher limits consume more of your account’s API complexity budget per run — see the Get Rate Limits operation',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description:
					'Which page of results to fetch (page size = limit). Increment it across runs to walk through long histories.',
			},
		],
	},

	{
		displayName: 'Options',
		name: 'getBoardOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['getBoard'] } },
		options: [INCLUDE_COMPLETE_BOARD_DATA_OPTION],
	},
	{
		displayName: 'Calculations',
		name: 'aggregateCalculations',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Calculation',
		default: { calculations: [{ function: 'countItems' }] },
		description: 'What to calculate across the board’s items',
		displayOptions: { show: { operation: ['aggregateBoardData'] } },
		options: [
			{
				displayName: 'Calculation',
				name: 'calculations',
				values: [
					{
						// "Calculation" (not "Function") keeps this first under the
						// lint's alphabetical ordering — where it belongs in the UI.
						displayName: 'Calculation',
						name: 'function',
						type: 'options',
						options: AGGREGATE_FUNCTION_OPTIONS,
						default: 'countItems',
						description: 'The calculation to run',
					},
					{
						displayName: 'Column Name or ID',
						name: 'numericColumnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getAggregateNumericColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The numbers or rating column to calculate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						displayOptions: { show: { function: ['sum', 'average', 'median'] } },
					},
					{
						displayName: 'Column Name or ID',
						name: 'minMaxColumnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getAggregateMinMaxColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The numbers, rating, or date column to calculate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						displayOptions: { show: { function: ['min', 'max'] } },
					},
					{
						displayName: 'Column Name or ID',
						name: 'anyColumnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getBoardColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The column whose values to count. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						displayOptions: { show: { function: ['countValues', 'countUnique'] } },
					},
					{
						displayName: 'Output Field Name',
						name: 'outputName',
						type: 'string',
						default: '',
						description:
							'What to call this calculation in the output. Left empty, a name like "sum_budget" is generated from the function and column.',
					},
				],
			},
		],
	},
	{
		displayName: 'Group By',
		name: 'aggregateGroupBy',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Grouping',
		default: {},
		description:
			'Split the results into one row per value of these columns, like the rows of a pivot table. Without a grouping you get a single totals row for the whole board.',
		displayOptions: { show: { operation: ['aggregateBoardData'] } },
		options: [
			{
				displayName: 'Grouping',
				name: 'groups',
				values: [
					{
						displayName: 'Column Name or ID',
						name: 'columnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getAggregateGroupByColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The column to group by — status and dropdown values come back as label text, and "Board Group" groups by the board\'s groups. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Date Grouping',
						name: 'dateGrouping',
						type: 'options',
						options: AGGREGATE_DATE_GROUPING_OPTIONS,
						default: 'none',
						description:
							'For date columns only: bucket the dates by day, week, month, quarter, or year — the output shows the first day of each bucket. Ignored for other column types.',
					},
				],
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'aggregateFilters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Filter',
		default: {},
		description:
			'Only aggregate the items that match these column-value filters (applied server-side)',
		displayOptions: { show: { operation: ['aggregateBoardData'] } },
		options: [
			{
				displayName: 'Filter',
				name: 'rules',
				values: [
					{
						displayName: 'Column Name or ID',
						name: 'columnId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFilterableBoardColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The column to filter on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Operator Name or ID',
						name: 'operator',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFilterOperators',
							loadOptionsDependsOn: ['boardId.value', '&columnId'],
						},
						default: 'any_of',
						description:
							'How to compare — only the operators the selected column type supports are listed. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description:
							'The value to compare against. Comma-separated list for Any Of / Not Any Of / Between / Contains Terms. Status and dropdown labels can be given by name (e.g. "Done") — they are resolved to label indexes automatically.',
						displayOptions: { hide: { operator: ['is_empty', 'is_not_empty'] } },
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'aggregateOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['aggregateBoardData'] } },
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 50,
				description: 'Max number of results to return',
				hint: 'One result row per group combination — raise this when grouping by a column with many distinct values',
			},
			{
				displayName: 'Match',
				name: 'filtersMatch',
				type: 'options',
				options: [
					{ name: 'All Filters (AND)', value: 'and' },
					{ name: 'Any Filter (OR)', value: 'or' },
				],
				default: 'and',
				description: 'How multiple filters combine',
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { operation: ['getBoards'] } },
		options: [
			{
				displayName: 'Board Kind',
				name: 'boardKind',
				type: 'options',
				options: [
					{ name: 'Private', value: 'private' },
					{ name: 'Public', value: 'public' },
					{ name: 'Shareable', value: 'share' },
				],
				default: 'public',
				description: 'Only return boards of this kind',
			},
			{
				displayName: 'Board Names or IDs',
				name: 'boardIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getBoardList' },
				default: [],
				description:
					'Only return these boards. The list shows only the 500 most recently used boards (searchable by name, but only within that window); for boards beyond it, pass explicit IDs via an expression (an array or a comma-separated string). Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				options: [
					{ name: 'Created At', value: 'created_at' },
					{ name: 'Last Used', value: 'used_at' },
				],
				default: 'used_at',
				description: 'Property to order the results by',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'All', value: 'all' },
					{ name: 'Archived', value: 'archived' },
					{ name: 'Deleted', value: 'deleted' },
				],
				default: 'active',
				description: 'Only return boards in this state',
			},
			{
				displayName: 'Workspace Names or IDs',
				name: 'workspaceIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getWorkspaces' },
				default: [],
				description:
					'Only return boards in these workspaces — searchable by name. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['getBoards'] } },
		options: [
			INCLUDE_COMPLETE_BOARD_DATA_OPTION,
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 50,
				description: 'Max number of results to return',
				hint: 'Higher limits consume more of your account’s API complexity budget per run — see the Get Rate Limits operation',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description:
					'Which page of results to fetch (page size = limit). Increment it across runs to walk through large accounts.',
			},
		],
	},
];
