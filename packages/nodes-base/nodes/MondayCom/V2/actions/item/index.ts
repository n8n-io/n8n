import type { INodeProperties } from 'n8n-workflow';

import * as archiveOrDeleteItem from './archiveOrDeleteItem.operation';
import * as bulkImport from './bulkImport.operation';
import * as clearColumnValues from './clearColumnValues.operation';
import * as createItem from './createItem.operation';
import * as duplicateItem from './duplicateItem.operation';
import * as getItem from './getItem.operation';
import * as getBulkImportStatus from './getBulkImportStatus.operation';
import * as getColumnValue from './getColumnValue.operation';
import * as getItems from './getItems.operation';
import * as getItemSubscribers from './getItemSubscribers.operation';
import * as moveItem from './moveItem.operation';
import * as searchItemsAccount from './searchItemsAccount.operation';
import * as updateItem from './updateItem.operation';

export {
	archiveOrDeleteItem,
	bulkImport,
	clearColumnValues,
	createItem,
	duplicateItem,
	getItem,
	getBulkImportStatus,
	getColumnValue,
	getItems,
	getItemSubscribers,
	moveItem,
	searchItemsAccount,
	updateItem,
};

export const description: INodeProperties[] = [
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
	...archiveOrDeleteItem.description,
	...bulkImport.description,
	...clearColumnValues.description,
	...createItem.description,
	...duplicateItem.description,
	...getItem.description,
	...getBulkImportStatus.description,
	...getColumnValue.description,
	...getItems.description,
	...getItemSubscribers.description,
	...moveItem.description,
	...searchItemsAccount.description,
	...updateItem.description,
];
