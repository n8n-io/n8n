import { INodeProperties } from 'n8n-workflow';

const siteFields: INodeProperties[] = [
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

export const siteDescription: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'siteName',
		type: 'string',
		default: '',
		description: 'Enter site name',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['site'],
			},
		},
	},
	{
		displayName: 'Client',
		name: 'clientsList',
		type: 'options',
		default: '',
		noDataExpression: true,
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getHaloPSAClients',
		},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['site'],
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
				resource: ['site'],
			},
		},
		options: [...siteFields],
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
				resource: ['site'],
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
			{
				displayName: 'Client',
				name: 'client_id',
				type: 'options',
				default: '',
				noDataExpression: true,
				typeOptions: {
					loadOptionsMethod: 'getHaloPSAClients',
				},
			},
			...siteFields,
		],
	},
];
