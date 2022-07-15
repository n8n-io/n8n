import {
	INodeProperties,
} from 'n8n-workflow';

const resource = [
	'company',
];

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource,
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieves the company for the currently authenticated user',
				action: 'Retrieve the company for the currently authenticated user',
			},
		],
		default: 'get',
	},

];
