import {
	INodeProperties,
} from 'n8n-workflow';

export const portfolioOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['portfolios'],
			},
		},
		options: [
			{ name: 'Add Company', value: 'addCompany', description: 'Add a company to portfolio' },
			{ name: 'Create', value: 'create', description: 'Create a new portfolio' },
			{ name: 'Delete', value: 'delete', description: 'Delete a portfolio' },
			{ name: 'Delete Company', value: 'deleteCompany', description: 'Delete a company from portfolio' },
			{ name: 'Edit', value: 'edit', description: 'Edit a portfolio' },
			{ name: 'Get All', value: 'getAll', description: 'Get all portfolios' },
			{ name: 'Get Companies', value: 'getCompanies', description: 'Get all companies in a portfolio' },
		],
		default: 'getAll',
	},
] as INodeProperties[];

export const portfolioFields = [
	{
		displayName: 'Portfolio ID',
		name: 'portfolioId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['portfolios'],
				operation: [
					'edit',
					'delete',
					'getCompanies',
					'addCompany',
					'deleteCompany',
				],
			},
		},
	},
	{
		displayName: 'Portfolio Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['portfolios'],
				operation: [
					'create',
					'edit',
				],
			},
		},
		description: 'Name of the portfolio',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: ['portfolios'],
				operation: ['create'],
			},
		},
		description: 'Description',
	},
	{
		displayName: 'Privacy',
		name: 'privacy',
		type: 'options',
		required: false,
		displayOptions: {
			show: {
				resource: ['portfolios'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Private',
				value: 'private',
				description: 'Only visible to you',
			},
			{
				name: 'Shared',
				value: 'shared',
				description: 'Visible to everyone in your company',
			},
			{
				name: 'Team',
				value: 'team',
				description: 'Visible to the people on your team',
			},
		],
		default: 'shared',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		displayOptions: {
			show: {
				resource: ['portfolios'],
				operation: ['getCompanies'],
				
			},
		},
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Grade',
				name: 'grade',
				type: 'string',
				placeholder: '',
				default: '',
				description: 'Company score grade filter',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				placeholder: '',
				default: '',
				description: 'Industry filter',
			},
			{
				displayName: 'Vulnerability',
				name: 'vulnerability',
				type: 'string',
				placeholder: '',
				description: 'CVE vulnerability filter',
				default: '',
			},
			{
				displayName: 'Issue Type',
				name: 'issueType',
				type: 'string',
				placeholder: '',
				description: 'Issue type filter',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ 'name': 'Active', value: 'active'},
					{ 'name': 'Inactive', value: 'inactive'},
				],
				placeholder: '',
				default: '',
			},
		],
	},
	// portfolio:edit
	{
		displayName: 'Edit Fields',
		name: 'editFields',
		description: 'The fields to edit.',
		displayOptions: {
			show: {
				resource: ['portfolios'],
				operation: ['edit'],
			},
		},
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				placeholder: '',
				default: '',
			},
			{
				displayName: 'Privacy',
				name: 'privacy',
				type: 'options',
				options: [
					{
						name: 'Private',
						value: 'private',
						description: 'Only visible to you',
					},
					{
						name: 'Shared',
						value: 'shared',
						description: 'Visible to everyone in your company',
					},
					{
						name: 'Team',
						value: 'team',
						description: 'Visible to the people on your team',
					},
				],
				default: 'shared',
			},
		],
	},
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['portfolios'],
				operation: ['addCompany', 'deleteCompany'],
			},
		},
		description: 'Company\'s domain name',
	},
	
] as INodeProperties[];

