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
				annotations: { effect: 'write', destructive: false, idempotent: false },
			},
			{
				name: 'Delete',
				value: 'deleteSpreadsheet',
				description: 'Delete a spreadsheet',
				action: 'Delete spreadsheet',
				annotations: { effect: 'write', destructive: true, idempotent: false },
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteSpreadsheet.description,
];
