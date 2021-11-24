
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
					'ticket',
				],
			},
		},
		options: [
			{
				name: 'Get All Tickets',
				value: 'getAll',
				description: 'Retrieve all tickets',
			},
		],
		default: '',
		description: 'The operation to perform.',
	},
	...getAll.description,
] as INodeProperties[];

