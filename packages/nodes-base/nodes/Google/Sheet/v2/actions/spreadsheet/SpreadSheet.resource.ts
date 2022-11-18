import * as create from './create.operation';
import * as deleteSpreadsheet from './delete.operation';
import { INodeProperties } from 'n8n-workflow';

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
				action: 'Create a spreadsheet',
			},
			{
				name: 'Delete',
				value: 'deleteSpreadsheet',
				description: 'Delete a spreadsheet',
				action: 'Delete a spreadsheet',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteSpreadsheet.description,
];
