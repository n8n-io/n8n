import type { INodeProperties } from 'n8n-workflow';

import * as append from './append.operation';
import * as clear from './clear.operation';
import * as deleteWorksheet from './deleteWorksheet.operation';
import * as getAll from './getAll.operation';
import * as readRows from './readRows.operation';
import * as update from './update.operation';
import * as upsert from './upsert.operation';

export { append, clear, deleteWorksheet, getAll, readRows, update, upsert };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['worksheet'],
			},
		},
		options: [
			{
				name: 'Append',
				value: 'append',
				description: 'Append data to worksheet',
				action: 'Append data to worksheet',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-upsert
				name: 'Append or Update',
				value: 'upsert',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-upsert
				description: 'Append a new row or update the current one if it already exists (upsert)',
				action: 'Append or update a sheet',
			},
			{
				name: 'Clear',
				value: 'clear',
				description: 'Clear worksheet',
				action: 'Clear worksheet',
			},
			{
				name: 'Delete',
				value: 'deleteWorksheet',
				description: 'Delete worksheet',
				action: 'Delete worksheet',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get worksheets',
				action: 'Get worksheets',
			},
			{
				name: 'Read Rows',
				value: 'readRows',
				description: 'Get worksheet range',
				action: 'Get worksheet range',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update worksheet range',
				action: 'Update worksheet range',
			},
		],
		default: 'getAll',
	},
	...append.description,
	...clear.description,
	...deleteWorksheet.description,
	...getAll.description,
	...readRows.description,
	...update.description,
	...upsert.description,
];
