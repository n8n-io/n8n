
import * as create from './create';
import * as sendTemplate from './sendTemplate';
import * as get from './get';


import { INodeProperties } from "n8n-workflow";


export {
	create,
	sendTemplate,
	get,
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
					'bulkEmail',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Send a Bulk Email',
			},
			{
				name: 'Send Template',
				value: 'sendTemplate',
				description: 'Send Bulk Email from Template',
			},
			{
				name: 'Retrieve bulk email status',
				value: 'get',
				description: 'Get the status of a bulk email',
			},
		],
		required: true,
		default: 'create',
		description: 'Send a bulk Email',
	},
	...create.description,
	...sendTemplate.description,
	...get.description,
]
