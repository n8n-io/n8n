import type { INodeProperties } from 'n8n-workflow';

import * as add from './add.operation';
import * as list from './list.operation';
import * as remove from './remove.operation';

export { add, list, remove };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['link'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Create a link between two rows in a link column',
				action: 'Add a row link',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all links of a specific row',
				action: 'List row links',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a link between two rows from a link column',
				action: 'Remove a row link',
			},
		],
		default: 'add',
	},
	...add.description,
	...list.description,
	...remove.description,
];
