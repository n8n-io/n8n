import {
	INodeProperties,
} from 'n8n-workflow';

export const contactAddressOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contactAddress',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Creates a new contact address',
			},
		],
		default: 'create',
	},
];

export const contactAddressFields: INodeProperties[] = [
	{
		displayName: 'Required Fields',
		name: 'requiredFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contactAddress',
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
