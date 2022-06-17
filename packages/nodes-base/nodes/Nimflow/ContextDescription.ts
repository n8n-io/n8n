import {
	INodeProperties,
} from 'n8n-workflow';

export const contextOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
				show: {
						resource: [
								'context',
						],
				},
		},
		options: [
				{
						name: 'Dispatch',
						value: 'dispatch',
						description: 'Dispatch an action',
				},
				{
						name: 'Aggregate',
						value: 'aggregate',
						description: 'Aggregate contexts'
				}
		],
		default: 'dispatch',
	},
]

export const contextFields: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'context'
				]
			}
		},
		default: '',
		description: 'The action of the context to dispatch'
	}
]
