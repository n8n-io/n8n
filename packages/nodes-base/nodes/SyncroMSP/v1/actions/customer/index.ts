
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
					'customer',
				],
			},
		},
		options: [
			{
				name: 'Get All Customers',
				value: 'getAll',
				description: 'Retrieve all customers',
			},
		],
		default: '',
		description: 'The operation to perform.',
	},
	...getAll.description,
] as INodeProperties[];

