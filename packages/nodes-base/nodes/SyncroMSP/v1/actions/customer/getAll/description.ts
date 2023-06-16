import type { CustomerProperties } from '../../Interfaces';

export const customerGetAllDescription: CustomerProperties = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['getAll'],
			},
		},
		default: false,
		noDataExpression: true,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		default: 25,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: ['customer'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Business Name',
				name: 'businessName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Include Disabled',
				name: 'includeDisabled',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Last Name',
				name: 'lastname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Search Query',
				name: 'query',
				type: 'string',
				default: '',
				placeholder: 'John Doe',
				description: 'Search query, it can be anything related to customer data like name etc',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				default: '',
				placeholder: 'firstname ASC',
				description: 'Customer field to order by, eg: "firstname ASC", "city DESC" etc',
			},
		],
	},
];
