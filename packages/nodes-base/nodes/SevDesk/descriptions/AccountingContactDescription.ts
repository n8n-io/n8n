import {
	INodeProperties,
} from 'n8n-workflow';

export const accountingContactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'accountingContact',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Creates a new accounting contact',
			},
		],
		default: 'create',
	},
];

export const accountingContactFields: INodeProperties[] = [
	{
		displayName: 'Required Fields',
		name: 'requiredFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'accountingContact',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
		],
	},
];
