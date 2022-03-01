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
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},

];
