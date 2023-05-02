import type { INodeProperties } from 'n8n-workflow';

import * as addWorksheet from './addWorksheet.operation';
import * as deleteWorkbook from './deleteWorkbook.operation';
import * as getAll from './getAll.operation';

export { addWorksheet, deleteWorkbook, getAll };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['workbook'],
			},
		},
		options: [
			{
				name: 'Add Sheet',
				value: 'addWorksheet',
				description: 'Add a new sheet to the workbook',
				action: 'Add a sheet to a workbook',
			},
			{
				name: 'Delete',
				value: 'deleteWorkbook',
				description: 'Delete workbook',
				action: 'Delete workbook',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get workbooks',
				action: 'Get workbooks',
			},
		],
		default: 'getAll',
	},
	...addWorksheet.description,
	...deleteWorkbook.description,
	...getAll.description,
];
