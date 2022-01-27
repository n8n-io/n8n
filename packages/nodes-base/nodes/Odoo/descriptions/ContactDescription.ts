import { INodeProperties } from 'n8n-workflow';

const contactFields: INodeProperties[] = [
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Address Street',
		name: 'street',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Address Street 2',
		name: 'street2',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Address City',
		name: 'city',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Tax ID',
		name: 'vat',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Job Position',
		name: 'function',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Website',
		name: 'website',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Mobile',
		name: 'mobile',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Internal Notes',
		name: 'comment',
		type: 'string',
		default: '',
	},
];

export const contactDescription: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'contactName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['contact'],
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
				resource: ['contact'],
			},
		},
		options: [...contactFields],
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
				resource: ['contact'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			...contactFields,
		],
	},
];
