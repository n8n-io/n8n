
import * as create from './create';
import * as sendTemplate from './sendTemplate';


import { INodeProperties } from 'n8n-workflow';


export {
	create,
	sendTemplate,
	// del as delete,
	// members,
	// restore,
	// addUser,
	// statistics,
	// search,
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
					'email',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Send an email',
			},
			{
				name: 'Send Template',
				value: 'sendTemplate',
				description: 'Send Email from Template',
			},
		],
		required: true,
		default: 'create',
		description: 'Send an email or Email based on a Template',
	},
	...create.description,
	...sendTemplate.description,
];
