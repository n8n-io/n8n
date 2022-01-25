import { INodeProperties } from 'n8n-workflow';

const clientFields: INodeProperties[] = [
	{
		displayName: 'Account Status',
		name: 'inactive',
		type: 'options',
		default: false,
		options: [
			{
				name: 'Active',
				value: false,
			},
			{
				name: 'Inactive',
				value: true,
			},
		],
	},
	{
		displayName: 'Next Call Date',
		name: 'calldate',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Notes',
		name: 'notes',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
	},
	{
		displayName: 'Is VIP',
		name: 'is_vip',
		type: 'boolean',
		default: false,
		description: 'Whether the client is VIP or not',
	},
	{
		displayName: 'Reference',
		name: 'reference',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Website',
		name: 'website',
		type: 'string',
		default: '',
	},
];

export const clientDescription: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'clientName',
		type: 'string',
		default: '',
		description: 'Enter client name',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['client'],
			},
		},
	},
	// Additional fields =============================================================
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['client'],
			},
		},
		options: [...clientFields],
	},
	// Update fields =============================================================
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['client'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Enter client name',
			},
			...clientFields,
		],
	},
];
