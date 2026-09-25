import type { INodeProperties } from 'n8n-workflow';

export const itemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'add',
				description: 'Create an item',
				action: 'Create a item',
			},
		],
		default: 'add',
		noDataExpression: true,
	},
];

export const itemFields: INodeProperties[] = [
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		options: [
			{
				name: 'Company',
				value: 'COMPANY',
				description: 'List of company',
			},
			{
				name: 'Contact',
				value: 'PEOPLE',
				description: 'List of contact',
			},
		],
		default: 'PEOPLE',
		description: 'Type of your list',
		noDataExpression: true,
	},
	{
		displayName: 'List Name or ID',
		name: 'list',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: ['type'],
		},
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['add'],
				resource: ['item'],
				type: ['PEOPLE'],
			},
		},
		default: '',
		description: 'Contact first name',
		required: true,
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['add'],
				resource: ['item'],
				type: ['PEOPLE'],
			},
		},
		default: '',
		description: 'Contact last name',
		required: true,
	},

	{
		displayName: 'Company Name',
		name: 'company_name',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['add'],
				resource: ['item'],
				type: ['COMPANY'],
			},
		},
		default: '',
		description: 'Contact company name',
	},

	{
		displayName: 'Additional Fields',
		name: 'peopleAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['add'],
				resource: ['item'],
				type: ['PEOPLE'],
			},
		},
		options: [
			{
				displayName: 'Full Name',
				name: 'full_name',
				type: 'string',
				default: '',
				description: 'Contact full name',
			},
			{
				displayName: 'Contact Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Company Name',
				name: 'company_name',
				type: 'string',
				default: '',
				description: 'Contact company name',
			},
			{
				displayName: 'Current Position',
				name: 'current_position',
				type: 'string',
				default: '',
				description: 'Contact current position',
			},
			{
				displayName: 'Company Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'Contact company domain',
			},
			{
				displayName: 'Linkedin Url',
				name: 'linkedin_url',
				type: 'string',
				default: '',
				description: 'Contact Linkedin URL',
			},
			{
				displayName: 'Contact Location',
				name: 'location',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Contact ID',
				name: 'contact_id',
				type: 'string',
				default: '',
				description: 'Contact ID from your source',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'companyAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['add'],
				resource: ['item'],
				type: ['COMPANY'],
			},
		},
		options: [
			{
				displayName: 'Linkedin Url',
				name: 'linkedin_url',
				type: 'string',
				default: '',
				description: 'Company Linkedin URL',
			},
			{
				displayName: 'Company Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'Company company domain',
			},
			{
				displayName: 'Contact Location',
				name: 'location',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Contact ID',
				name: 'contact_id',
				type: 'string',
				default: '',
				description: 'Contact ID from your source',
			},
		],
	},
];
