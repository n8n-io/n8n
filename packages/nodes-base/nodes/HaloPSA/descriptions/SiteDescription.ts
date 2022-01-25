import { INodeProperties } from 'n8n-workflow';

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
				operation: ['create', 'update'],
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
				operation: ['create', 'update'],
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
				operation: ['update', 'create'],
				resource: ['site'],
			},
		},
		options: [
			{
				displayName: 'Phone Number',
				name: 'phonenumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Main Contact',
				name: 'maincontact_name',
				type: 'string',
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
		],
	},
];
