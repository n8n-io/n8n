import type { INodeProperties } from 'n8n-workflow';

import {
	SEARCH_OPERATION_VALUES,
	SEARCH_STRATEGY_OPTIONS,
	SEARCH_TIMELINE_KIND_OPTIONS,
	SEARCH_TIMELINE_PRODUCT_OPTIONS,
} from '../../helpers/accountSearch';
import { boardResourceLocator } from '../../helpers/boardLocator';
import {
	HIDE_UNTIL_BOARD_SELECTED,
	itemIdTextProperty,
	itemInputModeProperty,
	itemListOnlyResourceLocator,
	itemResourceLocator,
} from '../../helpers/itemLocator';
import { buildUserRowsProperty } from '../../helpers/userLocator';

export const itemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['item'] } },
		options: [
			{
				name: 'Archive or Delete',
				value: 'archiveOrDeleteItem',
				action: 'Archive or delete an item',
				description:
					'Archive items (recoverable, the default) or permanently delete them — one picked item or up to 50 by ID',
			},
			{
				name: 'Bulk Import',
				value: 'bulkImport',
				action: 'Bulk import items',
				description:
					'Create or upsert up to 10,000 items in one asynchronous CSV import job — all input items become one job',
			},
			{
				name: 'Clear Column Values',
				value: 'clearColumnValues',
				action: 'Clear column values',
				description: 'Reset the selected columns of up to 10 items back to empty/default values',
			},
			{
				name: 'Create',
				value: 'createItem',
				action: 'Create an item',
				description:
					'Create a new item on a board — or a subitem under a parent item — with column values',
			},
			{
				name: 'Duplicate',
				value: 'duplicateItem',
				action: 'Duplicate an item',
				description: 'Create a copy of an item on the same board, optionally with its updates',
			},
			{
				name: 'Get',
				value: 'getItem',
				action: 'Get an item',
				description: 'Return a single item with its column values',
			},
			{
				name: 'Get Bulk Import Status',
				value: 'getBulkImportStatus',
				action: 'Get bulk import status',
				description:
					'Check an asynchronous bulk import job by its job ID, optionally with the per-row report',
			},
			{
				name: 'Get Column Value',
				value: 'getColumnValue',
				action: 'Get a column value',
				description: 'Return one column of an item: parsed text plus the raw API value',
			},
			{
				name: 'Get Many',
				value: 'getItems',
				action: 'Get many items',
				description: 'Return items on a board, optionally filtered to specific groups',
			},
			{
				name: 'List Subscribers',
				value: 'getItemSubscribers',
				action: 'List item subscribers',
				description: 'Return the users subscribed to an item',
			},
			{
				name: 'Move',
				value: 'moveItem',
				action: 'Move an item',
				description: 'Move an item to another group, or to another board with column mapping',
			},
			{
				name: 'Search',
				value: 'searchItemsAccount',
				action: 'Search items',
				description: 'Find items account-wide by keyword and semantic relevance',
			},
			{
				name: 'Update',
				value: 'updateItem',
				action: 'Update an item',
				description: 'Update column values of an existing item (including its name)',
			},
		],
		default: 'getItems',
	},
];

export const itemFields: INodeProperties[] = [
	{
		...boardResourceLocator,
		displayOptions: {
			show: {
				operation: [
					'getBoard',
					'aggregateBoardData',
					'getItems',
					'createItem',
					'updateItem',
					'bulkImport',
					'clearColumnValues',
					'getColumnValue',
					'moveItem',
					'duplicateItem',
					'archiveOrDeleteBoard',
					'duplicateBoard',
					'updateBoardSubscribers',
					'getBoardSubscribers',
					'getActivityLogs',
					'createGroup',
					'getGroups',
					'archiveOrDeleteGroup',
					'duplicateGroup',
					'updateGroup',
					'createColumn',
					'getColumns',
					'updateColumn',
					'deleteColumn',
					'addColumnLabel',
					'updateColumnLabel',
					'addFileToColumn',
					'createSubitem',
					'createTimelineItem',
					'getTimelineItems',
				],
			},
		},
	},
	{
		...itemResourceLocator,
		displayOptions: {
			show: {
				operation: [
					'updateItem',
					'getColumnValue',
					'moveItem',
					'duplicateItem',
					'addFileToColumn',
					'createTimelineItem',
					'getTimelineItems',
				],
			},
		},
	},
	{
		// Item-only operations: the mutation/query needs just the
		// globally unique item ID, so the board picker is shown only
		// when the user wants to pick the item from a list.
		...itemInputModeProperty,
		displayOptions: {
			show: { operation: ['createUpdate', 'getItem', 'getItemSubscribers'] },
		},
	},
	{
		...boardResourceLocator,
		description: 'The board holding the item — used only to pick the item from the list',
		displayOptions: {
			show: {
				operation: ['createUpdate', 'getItem', 'getItemSubscribers'],
				itemInputMode: ['list'],
			},
		},
	},
	{
		...itemListOnlyResourceLocator,
		displayOptions: {
			show: {
				operation: ['createUpdate', 'getItem', 'getItemSubscribers'],
				itemInputMode: ['list'],
			},
			hide: HIDE_UNTIL_BOARD_SELECTED,
		},
	},
	{
		...itemIdTextProperty,
		displayOptions: {
			show: {
				operation: ['createUpdate', 'getItem', 'getItemSubscribers'],
				itemInputMode: ['id'],
			},
		},
	},
	{
		// Single (picked item) vs bulk (ID list) input for the unified
		// Archive or Delete operation. Item IDs are globally unique, so
		// bulk mode needs no board picker.
		displayName: 'Items to Process',
		name: 'itemsMode',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Multiple Items',
				value: 'multiple',
				description: 'Provide a list of item IDs — processed in one batched request',
			},
			{
				name: 'Single Item',
				value: 'single',
				description: 'Pick one item on a board',
			},
		],
		default: 'single',
		description: 'Whether to process one picked item or a list of item IDs',
		displayOptions: { show: { operation: ['archiveOrDeleteItem'] } },
	},
	{
		// Dedicated board/item pickers for Archive or Delete: hidden in
		// bulk mode. This MUST be a hide rule, not show: { itemsMode:
		// ['single'] } — display evaluation reads raw workflow values
		// without falling back to parameter defaults, so legacy saved
		// workflows (which never set itemsMode) would fail a show rule
		// and lose their pickers ("Could not find property" at runtime).
		...boardResourceLocator,
		displayOptions: {
			show: { operation: ['archiveOrDeleteItem', 'archiveItem', 'deleteItem'] },
			hide: { itemsMode: ['multiple'] },
		},
	},
	{
		...itemResourceLocator,
		displayOptions: {
			show: { operation: ['archiveOrDeleteItem', 'archiveItem', 'deleteItem'] },
			hide: { itemsMode: ['multiple'] },
		},
	},
	{
		displayName: 'Item IDs',
		name: 'bulkItemIds',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 1234567890, 1234567891',
		description:
			'Comma-separated IDs of the items to archive or delete (up to 50 per execution). Feed it from a Get Many operation with an expression.',
		displayOptions: { show: { operation: ['archiveOrDeleteItem'], itemsMode: ['multiple'] } },
	},
	{
		displayName:
			'The batch is not atomic: if one item ID fails, the other items in the list are still archived or deleted',
		name: 'bulkArchiveOrDeleteNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { operation: ['archiveOrDeleteItem'], itemsMode: ['multiple'] } },
	},
	{
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
		displayOptions: {
			show: {
				operation: ['archiveOrDeleteItem', 'archiveOrDeleteBoard', 'archiveOrDeleteGroup'],
			},
		},
	},
	{
		...itemResourceLocator,
		displayName: 'Parent Item',
		description: 'The item to create the subitem under',
		displayOptions: { show: { operation: ['createSubitem'] } },
	},
	{
		displayName: 'Column Name or ID',
		name: 'columnId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardColumns',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		required: true,
		description:
			'The column to read the value from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { operation: ['getColumnValue'] } },
	},
	{
		displayName: 'Move To',
		name: 'moveDestination',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Another Board',
				value: 'board',
				description: 'Move the item to a group on a different board, with optional column mapping',
			},
			{
				name: 'Group on the Same Board',
				value: 'group',
				description: 'Move the item to another group of its board',
			},
		],
		default: 'group',
		displayOptions: { show: { operation: ['moveItem'] } },
	},
	{
		displayName: 'Target Group Name or ID',
		name: 'targetGroupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardGroups',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		required: true,
		description:
			'The group to move the item to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { operation: ['moveItem'], moveDestination: ['group'] } },
	},
	{
		...boardResourceLocator,
		displayName: 'Target Board',
		name: 'targetBoardId',
		description: 'The board to move the item to',
		displayOptions: { show: { operation: ['moveItem'], moveDestination: ['board'] } },
	},
	{
		displayName: 'Target Board Group Name or ID',
		name: 'targetBoardGroupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTargetBoardGroups',
			loadOptionsDependsOn: ['targetBoardId.value'],
		},
		default: '',
		required: true,
		description:
			'The group on the target board to move the item to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { operation: ['moveItem'], moveDestination: ['board'] } },
	},
	{
		// No include-updates toggle here on purpose (roadmap item 12570922790):
		// move_item_to_board has no with_updates argument on any API version
		// (2026-10 / 2027-01 / dev, introspected 2026-07-19) because updates
		// belong to the item and always move with it — verified live.
		displayName:
			"The item's updates (and their attachments) always move with the item — no toggle needed. Only column values can be lost: map them below.",
		name: 'moveToBoardUpdatesNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { operation: ['moveItem'], moveDestination: ['board'] } },
	},
	{
		displayName: 'Columns Mapping',
		name: 'columnsMappingUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Column Mapping',
		default: {},
		description:
			'How source columns map to target-board columns. Unmapped columns lose their values on cross-board moves.',
		displayOptions: { show: { operation: ['moveItem'], moveDestination: ['board'] } },
		options: [
			{
				displayName: 'Mapping',
				name: 'mappings',
				values: [
					{
						displayName: 'Source Column Name or ID',
						name: 'source',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getBoardColumns',
							loadOptionsDependsOn: ['boardId.value'],
						},
						default: '',
						description:
							'The column on the item\'s current board. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Target Column Name or ID',
						name: 'target',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getTargetBoardColumns',
							loadOptionsDependsOn: ['targetBoardId.value'],
						},
						default: '',
						description:
							'The column on the target board that receives the value. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'moveOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['moveItem'], moveDestination: ['board'] } },
		options: [
			{
				displayName: 'Columns Mapping (JSON)',
				name: 'columnsMapping',
				type: 'json',
				default: '[]',
				description:
					'How source columns map to target-board columns, as [{"source": "columnId", "target": "columnId"}] — an expression-friendly alternative to the Columns Mapping rows above. Ignored when any mapping rows are configured.',
			},
		],
	},
	{
		displayName: 'Include Updates',
		name: 'withUpdates',
		type: 'boolean',
		default: false,
		description: 'Whether the duplicate should include the item’s updates',
		displayOptions: { show: { operation: ['duplicateItem'] } },
	},
	{
		// Top-level item vs subitem for the unified Create operation.
		// Legacy saved workflows (operation createSubitem, or createItem
		// without this key) keep working: the execute path treats a
		// missing createAs as 'item', and the dependent pickers below
		// use hide rules (see the itemsMode comment) so their absence
		// of the key leaves the right pickers visible.
		displayName: 'Create As',
		name: 'createAs',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Subitem',
				value: 'subitem',
				description:
					'Create the item under a parent item — on multi-level boards the parent can itself be a subitem',
			},
			{
				name: 'Top-Level Item',
				value: 'item',
				description: 'Create the item in a group on the board',
			},
		],
		default: 'item',
		description: 'Whether to create a top-level item or a subitem under a parent item',
		displayOptions: { show: { operation: ['createItem'] } },
	},
	{
		...itemResourceLocator,
		displayName: 'Parent Item',
		description:
			"The item to create the subitem under. On classic boards subitems get the subitem board's own columns; on multi-level boards all levels share the parent board's columns and the parent can be a subitem itself (up to 5 levels).",
		displayOptions: { show: { operation: ['createItem'], createAs: ['subitem'] } },
	},
	{
		displayName:
			"On multi-level boards, creating the first subitem turns the parent's rollup columns (numbers, date, timeline, status with rollup enabled) into calculated values — the parent's existing values in those columns move down to the new subitem so the rollup still shows them, and writing to those columns on the parent silently has no effect from then on. Other column types are unaffected",
		name: 'createSubitemMultiLevelNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { operation: ['createItem'], createAs: ['subitem'] } },
	},
	{
		displayName: 'Item Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the new item',
		displayOptions: { show: { operation: ['createItem', 'createSubitem'] } },
	},
	{
		displayName: 'Group Name or ID',
		name: 'groupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardGroups',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		description:
			'The group to create the item in; leave empty for the board\'s top group. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		// Hide (not show) on createAs so legacy workflows without the
		// key keep their group picker — see the itemsMode comment.
		displayOptions: { show: { operation: ['createItem'] }, hide: { createAs: ['subitem'] } },
	},
	{
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
		displayOptions: { show: { operation: ['createItem', 'updateItem', 'createSubitem'] } },
	},
	{
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
				operation: ['createItem', 'updateItem', 'createSubitem'],
				columnValuesMode: ['mapper'],
			},
		},
	},
	{
		displayName: 'Column Values (JSON)',
		name: 'columnValuesJson',
		type: 'json',
		default: '{}',
		description:
			'Column values in the monday API format, keyed by column ID (e.g. {"status": {"label": "Done"}}). See <a href="https://developer.monday.com/api-reference/reference/column-types-reference">the column types reference</a>.',
		displayOptions: {
			show: {
				operation: ['createItem', 'updateItem', 'createSubitem'],
				columnValuesMode: ['json'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'createOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['createItem', 'updateItem', 'createSubitem'] } },
		options: [
			{
				displayName: 'Create Labels If Missing',
				name: 'createLabelsIfMissing',
				type: 'boolean',
				default: false,
				description:
					'Whether to create status/dropdown labels that do not exist yet (requires board owner permissions)',
			},
		],
	},
	{
		displayName: 'Item IDs',
		name: 'clearItemIds',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 1234567890, 1234567891',
		description:
			'Comma-separated IDs of the items to clear (up to 10 per execution). Feed it from a Get Many operation with an expression.',
		displayOptions: { show: { operation: ['clearColumnValues'] } },
	},
	{
		displayName: 'Columns to Clear',
		name: 'clearColumnIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getClearableBoardColumns',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: [],
		required: true,
		description:
			'The columns to reset to their empty/default value on every selected item (up to 10). Read-only columns (formula, mirror, etc.) cannot be cleared. In expression mode, pass a comma-separated string of column IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { operation: ['clearColumnValues'] } },
	},
	{
		displayName:
			'Clearing is permanent and not atomic: if some items in the batch fail, the others are still cleared. The output reports success or failure per item; without "Continue On Fail" a partial failure stops the run with an error naming the failed IDs. Re-running the batch is safe — clearing is idempotent.',
		name: 'clearColumnValuesNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { operation: ['clearColumnValues'] } },
	},
	{
		displayName:
			"All input items become ONE import job: in Map Columns mode every incoming item is one CSV row (up to 10,000 per job). The import runs asynchronously on monday's side — with Wait for Completion the node polls every 10 seconds until the job finishes.",
		name: 'bulkImportNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { operation: ['bulkImport'] } },
	},
	{
		displayName: 'Group Name or ID',
		name: 'bulkImportGroupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoardGroups',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		description:
			'The group newly created items are added to; leave empty for the board\'s top group. With Upsert/Skip matching, matching is board-wide — this only places NEW items. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { operation: ['bulkImport'] } },
	},
	{
		displayName: 'Import Type',
		name: 'bulkImportType',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Backfill (Admin Only)',
				value: 'backfill',
				description:
					'One-time initial board seeding: requires an account admin token, never triggers automations, writes nothing to the activity log, always creates new items. Up to 20,000 rows per job.',
			},
			{
				name: 'Ingest (Recommended)',
				value: 'ingest',
				description:
					'Behaves like normal board activity: automations fire, the activity log records changes, Upsert/Skip matching available. Up to 10,000 rows per job.',
			},
		],
		default: 'ingest',
		description: 'Which import mutation to use',
		displayOptions: { show: { operation: ['bulkImport'] } },
	},
	{
		displayName: 'Data Source',
		name: 'bulkImportSource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'CSV File',
				value: 'file',
				description:
					'Upload a ready CSV from a binary field — header must be name (or name.l1…name.l5 for multi-level hierarchy files) plus exact column IDs',
			},
			{
				name: 'Map Columns',
				value: 'mapped',
				description: 'Build the CSV from the input items via a column mapping',
			},
		],
		default: 'mapped',
		description: 'Where the import rows come from',
		displayOptions: { show: { operation: ['bulkImport'] } },
	},
	{
		displayName: 'Columns',
		name: 'bulkImportColumns',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		typeOptions: {
			loadOptionsDependsOn: ['boardId.value'],
			resourceMapper: {
				resourceMapperMethod: 'getBulkImportColumnFields',
				mode: 'add',
				fieldWords: { singular: 'column', plural: 'columns' },
				addAllFields: false,
				supportAutoMap: false,
			},
		},
		displayOptions: {
			show: { operation: ['bulkImport'], bulkImportSource: ['mapped'] },
		},
	},
	{
		displayName: 'Input Binary Field',
		name: 'bulkImportBinaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the CSV file to import',
		displayOptions: {
			show: { operation: ['bulkImport'], bulkImportSource: ['file'] },
		},
	},
	{
		displayName: 'On Match',
		name: 'bulkImportOnMatch',
		type: 'options',
		options: [
			{
				name: 'Always Create',
				value: 'none',
				description: 'Every row creates a new item',
			},
			{
				name: 'Skip',
				value: 'SKIP',
				description: 'Skip rows whose match value already exists on the board',
			},
			{
				name: 'Upsert',
				value: 'UPSERT',
				description:
					'Update the existing item when the match column value already exists on the board, otherwise create. Empty cells preserve the existing value; a cell containing exactly &lt;NULL&gt; clears it.',
			},
		],
		default: 'none',
		description:
			'How to handle rows whose match column value already exists on the board. Not available for multi-level hierarchy files (they always create).',
		displayOptions: { show: { operation: ['bulkImport'], bulkImportType: ['ingest'] } },
	},
	{
		displayName: 'Match Column Name or ID',
		name: 'bulkImportMatchColumnId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBulkImportMatchColumns',
			loadOptionsDependsOn: ['boardId.value'],
		},
		default: '',
		required: true,
		description:
			'The column existing items are matched on (board-wide). If several rows share a match value, only the last row is applied; if several items match, the most recently created one is updated. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				operation: ['bulkImport'],
				bulkImportType: ['ingest'],
				bulkImportOnMatch: ['UPSERT', 'SKIP'],
			},
		},
	},
	{
		displayName: 'Wait for Completion',
		name: 'bulkImportWait',
		type: 'boolean',
		default: true,
		description:
			'Whether to wait for the import job to finish (polling every 10 seconds, up to Max Wait Time) and return its result. When off, save the job ID and poll manually with Get Bulk Import Status every 10 seconds.',
		displayOptions: { show: { operation: ['bulkImport'] } },
	},
	{
		displayName: 'Options',
		name: 'bulkImportOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['bulkImport'] } },
		options: [
			{
				displayName: 'Include Row Results',
				name: 'includeRowResults',
				type: 'boolean',
				default: false,
				description:
					"Whether to also output one item per imported row from monday's import report (serial number, status, item ID, error) — useful for routing failed rows. Requires Wait for Completion.",
			},
			{
				displayName: 'Max Wait Time',
				name: 'maxWaitTime',
				type: 'number',
				typeOptions: { minValue: 30 },
				default: 1800,
				description:
					"How long to wait for the job to finish, in seconds, before giving up with an error (the job itself keeps running on monday's side)",
			},
		],
	},
	{
		displayName: 'Job ID',
		name: 'bulkImportJobId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000',
		description:
			'The job ID returned by a Bulk Import run. Poll every 10 seconds. Note: if the import report is ready, the report URL expires after 10 minutes.',
		displayOptions: { show: { operation: ['getBulkImportStatus'] } },
	},
	{
		displayName: 'Options',
		name: 'bulkImportStatusOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['getBulkImportStatus'] } },
		options: [
			{
				displayName: 'Include Row Results',
				name: 'includeRowResults',
				type: 'boolean',
				default: false,
				description:
					"Whether to also output one item per imported row from monday's import report (serial number, status, item ID, error), when the report is ready",
			},
		],
	},
	{
		// The name stays `simplify` (n8n's standard toggle param); only the label
		// is more specific, since it flattens column values, not the whole record.
		displayName: 'Simplify Column Values Response',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a flattened item (column values keyed by column title) instead of the raw API shape',
		displayOptions: { show: { operation: ['getItem'] } },
	},
	{
		displayName: 'Options',
		name: 'getItemOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['getItem'] } },
		options: [
			{
				displayName: 'Include All Item Info',
				name: 'includeAllItemInfo',
				type: 'boolean',
				default: false,
				description:
					'Whether to also return the item’s creator, email address (for creating updates by email), relative link, and subscribers',
			},
			{
				displayName: 'Include Subitems',
				name: 'includeSubitems',
				type: 'boolean',
				default: false,
				description: 'Whether to include the item’s subitems (ID, name, state)',
			},
			{
				displayName: 'Include Updates',
				name: 'includeUpdates',
				type: 'boolean',
				default: false,
				description: 'Whether to include the item’s updates (body, creator, created time)',
			},
			{
				// "Select Columns" per product wording; the standard "Names or IDs" suffix reads worse here.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Select Columns',
				name: 'columnIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardColumns',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return these columns; selecting none returns all columns. Limiting the columns reduces the query’s complexity cost and payload size — especially on big boards. In expression mode, pass a comma-separated string of column IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'itemFilters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Filter',
		default: {},
		description:
			'Server-side column-value filters (items_page query params) — far cheaper than fetching everything and filtering in n8n',
		displayOptions: { show: { operation: ['getItems'] } },
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
							'The column to filter on. Status columns that roll up child values (multi-level boards) are not filterable — the API returns unreliable results for them. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['getItems'] } },
		options: [
			{
				// "Include Columns" per product wording; the standard "Names or IDs" suffix reads worse here.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Include Columns',
				name: 'columnIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardColumns',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return these columns; selecting none includes all columns. The item name is always included. On large boards limiting columns keeps payload and API complexity down. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Include Cursor',
				name: 'includeCursor',
				type: 'boolean',
				default: false,
				description:
					'Whether to append one final output item { nextCursor } after the items. Feed it into Starting Cursor (in this node or another one) to fetch the next page; null means no more items.',
			},
			{
				// "Include Groups" per product wording, matching Include Columns.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Include Groups',
				name: 'groupIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getBoardGroups',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: [],
				description:
					'Only return items from these groups; selecting none includes the whole board. Expressions accept an array or a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Include Subitems (Multi-Level Boards)',
				name: 'includeSubitems',
				type: 'boolean',
				default: false,
				description:
					"Whether to return the board's subitems too (multi-level boards) as a flat list — every row gains a parent_item, null on top-level items. Filters then match subitems as well. Has no effect on classic boards, and cannot be combined with Sort By Column (the API ignores sorting in this mode).",
			},
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
				displayName: 'Match',
				name: 'filtersMatch',
				type: 'options',
				options: [
					{ name: 'All Filters (AND)', value: 'and' },
					{ name: 'Any Filter (OR)', value: 'or' },
				],
				default: 'and',
				description:
					'How multiple filters combine. Applies to every rule, including the group filter.',
			},
			{
				// The column ID string IS the sort key; "Name or ID" suffix would mislead.
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Sort By Column',
				name: 'sortBy',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBoardColumns',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: '',
				description:
					'Sort results server-side by this column. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Sort Direction',
				name: 'sortDirection',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'asc',
				description: 'Used together with Sort By Column',
			},
			{
				displayName: 'Starting Cursor',
				name: 'startingCursor',
				type: 'string',
				default: '',
				description:
					'Continue fetching from a cursor returned by a previous run (valid for 60 minutes). When set, filters, groups, and sorting are ignored — the cursor already encodes the query.',
			},
		],
	},
	// ---- Search params, shared by the per-resource Search ops ----
	// One Search op per entity type, living on its home resource
	// (product decision 2026-07-19; replaced first a combined
	// multi-entity op, then a standalone Search resource). The
	// params below key off the operation values, which are unique
	// across resources.
	{
		displayName: 'Query',
		name: 'searchQuery',
		type: 'string',
		default: '',
		required: true,
		description: 'The text to search for — matched by keyword and semantic relevance',
		displayOptions: { show: { operation: SEARCH_OPERATION_VALUES } },
	},
	{
		displayName: 'Include Live Data',
		name: 'includeLiveData',
		type: 'boolean',
		default: false,
		description:
			'Whether to also resolve each result to its latest full entity from the core API (adds latency). The search index itself is fast but can be slightly stale. liveData is null when the entity was deleted, is inaccessible, or was not yet re-indexed.',
		displayOptions: { show: { operation: SEARCH_OPERATION_VALUES } },
	},
	{
		displayName: 'Options',
		name: 'searchOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: SEARCH_OPERATION_VALUES } },
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
						'/operation': [
							'searchItemsAccount',
							'searchBoardsAccount',
							'searchUpdatesAccount',
							'searchTimelineItemsAccount',
						],
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
				displayName: 'Item IDs',
				name: 'itemIds',
				type: 'string',
				default: '',
				description:
					'Only return timeline items belonging to these items (comma-separated item IDs)',
				displayOptions: { show: { '/operation': ['searchTimelineItemsAccount'] } },
			},
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
					'The trade-off between search quality and response time. Update and timeline item search always use keyword matching regardless of strategy.',
			},
			{
				displayName: 'Timeline Item Product',
				name: 'timelineProductKind',
				type: 'options',
				options: SEARCH_TIMELINE_PRODUCT_OPTIONS,
				default: 'crm',
				description: 'Only return timeline items originating from this monday.com product',
				displayOptions: { show: { '/operation': ['searchTimelineItemsAccount'] } },
			},
			{
				displayName: 'Timeline Item Type',
				name: 'timelineType',
				type: 'options',
				options: SEARCH_TIMELINE_KIND_OPTIONS,
				default: 'email',
				description: 'Only return timeline items of this kind',
				displayOptions: { show: { '/operation': ['searchTimelineItemsAccount'] } },
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
					show: {
						'/operation': [
							'searchItemsAccount',
							'searchBoardsAccount',
							'searchDocsAccount',
							'searchWorkspacesAccount',
							'searchTimelineItemsAccount',
						],
					},
				},
			},
		],
	},
];
