
import * as getAll from './getAll';

import { INodeProperties } from 'n8n-workflow';

export {
	getAll,
};


export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all contacts',
			},
		],
		default: '',
		description: 'The operation to perform.',
	},
	...getAll.description,
] as INodeProperties[];

