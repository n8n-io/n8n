import { INodeProperties } from 'n8n-workflow';

const crmFields: INodeProperties[] = [
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
		displayName: 'Main Contact',
		name: 'maincontact_name',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Phone Number',
		name: 'phonenumber',
		type: 'string',
		default: '',
	},
];

export const crmDescription: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'crmName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['crm'],
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
				resource: ['crm'],
			},
		},
		options: [...crmFields],
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
				resource: ['crm'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Enter site name',
			},
			...crmFields,
		],
	},
];
