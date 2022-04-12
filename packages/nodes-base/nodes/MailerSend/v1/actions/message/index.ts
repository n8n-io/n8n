
import * as get from './get';
import * as getAll from './getAll';


import { INodeProperties } from "n8n-workflow";


export {
	get,
	getAll,
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
					'message',
				],
			},
		},
		options: [
			{
				name: 'Get Message',
				value: 'get',
				description: 'Get Message status',
			},
			{
				name: 'Get All Messages',
				value: 'getAll',
				description: 'Get All Messages status',
			},
		],
		required: true,
		default: 'get',
		description: 'Get Status of sent messages',
	},
	...get.description,
	...getAll.description,
]
