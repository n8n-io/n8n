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
		displayName: 'Contact',
		name: 'contact',
		description: 'The contact to which this communication way belongs',
		type: 'collection',
		required: true,
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
			{
				displayName: 'ID',
				name: 'id',
				description: 'Unique identifier of the contact',
				type: 'string',
				default: 0,
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				description: 'Model name, which is "Contact"',
				type: 'string',
				default: 'Contact',
			},
		],
	},

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
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
			{
				displayName: 'Debitor Number',
				name: 'debitorNumber',
				description: 'Debitor number of the accounting contact.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Creditor Number',
				name: 'creditorNumber',
				description: 'Creditor number of the accounting contact.',
				type: 'string',
				default: '',
			},
		],
	},
];
