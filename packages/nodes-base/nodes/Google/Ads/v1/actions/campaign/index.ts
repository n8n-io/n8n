import * as get from './get';
import * as getAll from './getAll';
import * as custom from './custom';

import { INodeProperties } from 'n8n-workflow';


export {
	get,
	getAll,
	custom,
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'campaign',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the campaigns',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the campaign via its ID',
			},
			{
				name: 'Custom',
				value: 'custom',
				description: 'Custom query to be executed against the campaign endpoint',
			},
		],
		default: 'getAll',
		description: 'The operation to perform',
	},
	...get.description,
	...getAll.description,
	...custom.description,
];
