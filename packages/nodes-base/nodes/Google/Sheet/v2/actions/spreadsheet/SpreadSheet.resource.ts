import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteSpreadsheet from './delete.operation';

export { create, deleteSpreadsheet };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['spreadsheet'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a spreadsheet',
				action: 'Create spreadsheet',
			},
			{
				name: 'Delete',
				value: 'deleteSpreadsheet',
				description: 'Delete a spreadsheet',
				action: 'Delete spreadsheet',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteSpreadsheet.description,
];
