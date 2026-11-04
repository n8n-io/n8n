import type { INodeProperties } from 'n8n-workflow';

import * as addColumnLabel from './addColumnLabel.operation';
import * as createColumn from './createColumn.operation';
import * as createOrGetTag from './createOrGetTag.operation';
import * as deleteColumn from './deleteColumn.operation';
import * as getColumns from './getColumns.operation';
import * as updateColumn from './updateColumn.operation';
import * as updateColumnLabel from './updateColumnLabel.operation';

export {
	addColumnLabel,
	createColumn,
	createOrGetTag,
	deleteColumn,
	getColumns,
	updateColumn,
	updateColumnLabel,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['column'] } },
		options: [
			{
				name: 'Add Label',
				value: 'addColumnLabel',
				action: 'Add a label to a column',
				description: 'Add a new label to an existing status or dropdown column',
			},
			{
				name: 'Create',
				value: 'createColumn',
				action: 'Create a board column',
				description: 'Create a new column on a board, with typed per-type settings',
			},
			{
				// Tags live under Column actions (product decision 2026-07-19):
				// tag values are written through tags columns.
				name: 'Create or Get Tag',
				value: 'createOrGetTag',
				action: 'Create or get a tag',
				description:
					'Return the tag with this name, creating it if it does not exist yet — for writing into tags columns',
			},
			{
				name: 'Delete',
				value: 'deleteColumn',
				action: 'Delete a column',
				description: 'Permanently delete a column from a board, including its values',
			},
			{
				name: 'Get Many',
				value: 'getColumns',
				action: 'Get many columns',
				description:
					'Return the column schema of a board (IDs, types, settings) for use in expressions',
			},
			{
				name: 'Update',
				value: 'updateColumn',
				action: 'Update a column',
				description: 'Change the title, description, width, or settings of an existing column',
			},
			{
				name: 'Update Label',
				value: 'updateColumnLabel',
				action: 'Update a label of a column',
				description:
					'Rename, recolor, deactivate, or otherwise modify a label of a status or dropdown column',
			},
		],
		default: 'createColumn',
	},
	...addColumnLabel.description,
	...createColumn.description,
	...createOrGetTag.description,
	...deleteColumn.description,
	...getColumns.description,
	...updateColumn.description,
	...updateColumnLabel.description,
];
