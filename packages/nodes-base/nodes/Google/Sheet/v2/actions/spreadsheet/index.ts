import * as create from './create';
import { INodeProperties } from 'n8n-workflow';

export {
	create,
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'spreadsheet',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a spreadsheet',
				action: 'Create a spreadsheet',
			},
		],
		default: 'create',
	},
	...create.description,
];
