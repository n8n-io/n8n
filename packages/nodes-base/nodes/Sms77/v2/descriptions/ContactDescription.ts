import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
				action: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a contact by ID',
				action: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a paginated list of contacts',
				action: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update one or more contact properties',
				action: 'Update a contact',
			},
		],
		default: 'getAll',
	},
];

const contactFieldOptions: INodeProperties[] = [
	{ displayName: 'First Name', name: 'firstname', type: 'string', default: '' },
	{ displayName: 'Last Name', name: 'lastname', type: 'string', default: '' },
	{ displayName: 'Mobile Number', name: 'mobile_number', type: 'string', default: '' },
	{ displayName: 'Home Number', name: 'home_number', type: 'string', default: '' },
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		placeholder: 'name@example.com',
	},
	{ displayName: 'Address', name: 'address', type: 'string', default: '' },
	{ displayName: 'Postal Code', name: 'postal_code', type: 'number', default: 0 },
	{ displayName: 'City', name: 'city', type: 'string', default: '' },
	{
		displayName: 'Birthday',
		name: 'birthday',
		type: 'string',
		default: '',
		placeholder: 'YYYY-MM-DD',
	},
	{ displayName: 'Notes', name: 'notes', type: 'string', default: '' },
	{ displayName: 'Avatar URL', name: 'avatar', type: 'string', default: '' },
	{
		displayName: 'Group IDs (Comma-Separated)',
		name: 'groups',
		type: 'string',
		default: '',
		description: 'Comma-separated list of group IDs',
	},
];

export const contactFields: INodeProperties[] = [
	// getAll filters
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		default: 30,
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search across all contact columns',
			},
			{
				displayName: 'Group ID',
				name: 'group_id',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Order By',
				name: 'order_by',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Order Direction',
				name: 'order_direction',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'asc',
			},
		],
	},
	// id-based ops
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},
	// create / update
	{
		displayName: 'Fields',
		name: 'contactPayload',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create', 'update'],
			},
		},
		options: contactFieldOptions,
	},
];
