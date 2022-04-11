import { INodeProperties } from 'n8n-workflow';

export const searchCriteriaFieldsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['searchCriteriaFields'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'With this API call all fields can be queried that are marked / selected as search criteria',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const searchCriteriaFieldsFields: INodeProperties[] = [
];
