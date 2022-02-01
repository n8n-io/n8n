import { INodeProperties } from 'n8n-workflow';

export const siteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'site',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a site',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a site',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a site',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all sites',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a site',
			},
		],
		default: 'create',
	},
];

export const siteFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                site:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'siteName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'site',
				],
				operation: [
					'create'
				],
			},
		},
		description: 'Enter site name',
	},
	{
		displayName: 'Client ID',
		name: 'clientId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'site',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'site',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
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
			{
				displayName: 'Phone Number',
				name: 'phonenumber',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                site:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Site ID',
		name: 'siteId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'site',
				],
				operation: [
					'delete',
					'get',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                site:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'site',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				resource: [
					'site',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'site',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Include Active',
				name: 'includeactive',
				type: 'boolean',
				default: true,
				description: 'Whether to include active sites in the response',
			},
			{
				displayName: 'Include Inactive',
				name: 'includeinactive',
				type: 'boolean',
				default: false,
				description: 'Whether to include inactive sites in the response',
			},
			{
				displayName: 'Text Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Filter by Customers like your search string',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                site:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Site ID',
		name: 'siteId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'site',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'site',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Client ID',
				name: 'client_id',
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Enter site name',
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
				displayName: 'Phone Number',
				name: 'phonenumber',
				type: 'string',
				default: '',
			},
		],
	},
];
