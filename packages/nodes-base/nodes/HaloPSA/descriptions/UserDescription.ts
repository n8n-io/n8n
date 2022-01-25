import { INodeProperties } from 'n8n-workflow';

const userFields: INodeProperties[] = [
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
		displayName: 'Notes',
		name: 'notes',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
	},
	{
		displayName: 'Site Telephone Number',
		name: 'sitephonenumber',
		type: 'string',
		default: '',
	},
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
			'Your new password must be at least 8 characters long and contain at least one letter, one number or symbol, one upper case character and one lower case character',
	},
	{
		displayName: 'User Is Active',
		name: 'inactive',
		type: 'boolean',
		default: true,
	},
];

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
				operation: ['create'],
				resource: ['user'],
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
				operation: ['create'],
				resource: ['user'],
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
				resource: ['user'],
			},
		},
		options: [...userFields],
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
				resource: ['user'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Enter user name',
			},
			{
				displayName: 'Website',
				name: 'site_id',
				type: 'options',
				default: '',
				noDataExpression: true,
				typeOptions: {
					loadOptionsMethod: 'getHaloPSASites',
				},
			},
			...userFields,
		],
	},
];
