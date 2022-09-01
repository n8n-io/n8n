import { INodeProperties } from 'n8n-workflow';

export const portfolioOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['portfolio'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a portfolio',
				action: 'Create a portfolio',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a portfolio',
				action: 'Delete a portfolio',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all portfolios',
				action: 'Get all portfolios',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a portfolio',
				action: 'Update a portfolio',
			},
		],
		default: 'create',
	},
];

export const portfolioFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['portfolio'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['portfolio'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Portfolio ID',
		name: 'portfolioId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['portfolio'],
				operation: ['update', 'delete'],
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
				resource: ['portfolio'],
				operation: ['create', 'update'],
			},
		},
		description: 'Name of the portfolio',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['portfolio'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Privacy',
		name: 'privacy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['portfolio'],
				operation: ['create', 'update'],
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
];
