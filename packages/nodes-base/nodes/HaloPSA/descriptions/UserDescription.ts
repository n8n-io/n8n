import { INodeProperties } from 'n8n-workflow';

export const userDescription: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'userName',
		type: 'string',
		default: '',
		description: 'Enter user name',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['users'],
			},
		},
	},
	{
		displayName: 'Website',
		name: 'sitesList',
		type: 'options',
		default: '',
		noDataExpression: true,
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getHaloPSASites',
		},
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['users'],
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
				resource: ['users'],
			},
		},
		options: [
			{
				displayName: 'Surname',
				name: 'surname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				description:
					'Your new password must be at least 8 characters long and contain at least one letter, one number or symbol, one upper case character and one lower case character.',
			},
			{
				displayName: 'Email Address',
				name: 'emailaddress',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Network Login',
				name: 'login',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Site Telephone Number',
				name: 'sitephonenumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'User is Active',
				name: 'inactive',
				type: 'boolean',
				default: true,
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
