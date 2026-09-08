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
		displayName: 'List name or ID',
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
		displayName: 'First name',
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
		displayName: 'Last name',
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
		displayName: 'Company name',
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
		displayName: 'Additional fields',
		name: 'peopleAdditionalFields',
		type: 'collection',
		placeholder: 'Add field',
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
				displayName: 'Full name',
				name: 'full_name',
				type: 'string',
				default: '',
				description: 'Contact full name',
			},
			{
				displayName: 'Contact email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Company name',
				name: 'company_name',
				type: 'string',
				default: '',
				description: 'Contact company name',
			},
			{
				displayName: 'Current position',
				name: 'current_position',
				type: 'string',
				default: '',
				description: 'Contact current position',
			},
			{
				displayName: 'Company domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'Contact company domain',
			},
			{
				displayName: 'Linkedin URL',
				name: 'linkedin_url',
				type: 'string',
				default: '',
				description: 'Contact Linkedin URL',
			},
			{
				displayName: 'Contact location',
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
		displayName: 'Additional fields',
		name: 'companyAdditionalFields',
		type: 'collection',
		placeholder: 'Add field',
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
				displayName: 'Linkedin URL',
				name: 'linkedin_url',
				type: 'string',
				default: '',
				description: 'Company Linkedin URL',
			},
			{
				displayName: 'Company domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'Company company domain',
			},
			{
				displayName: 'Contact location',
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
