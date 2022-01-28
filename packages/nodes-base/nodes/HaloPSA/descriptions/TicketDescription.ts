import { INodeProperties } from 'n8n-workflow';

export const ticketOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a ticket',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a ticket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a ticket',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all tickets',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a ticket',
			},
		],
		default: 'create',
	},
];

export const ticketFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                ticket:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Summary',
		name: 'summary',
		type: 'string',
		default: '',
		placeholder: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Enter summary',
	},
	{
		displayName: 'Details',
		name: 'details',
		type: 'string',
		default: '',
		placeholder: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Enter details',
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
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned Agent Name/ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getHaloPSAAgents',
				},
			},
			{
				displayName: 'Start Date',
				name: 'startdate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Target Date',
				name: 'targetdate',
				type: 'dateTime',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                site:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'delete',
					'get',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                ticket:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'ticket',
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
					'ticket',
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
					'ticket',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Include Active',
				name: 'includeActive',
				type: 'boolean',
				default: true,
				description: 'Whether to include active customers in the response',
			},
			{
				displayName: 'Include Inactive',
				name: 'includeinactive',
				type: 'boolean',
				default: false,
				description: 'Whether to include inactive Customers in the response',
			},
			{
				displayName: 'Text Search Summary',
				name: 'search_summary',
				type: 'string',
				default: '',
				description: 'Filter by Customers like your search string',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                ticket:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'ticket',
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
					'ticket',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned Agent Name/ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getHaloPSAAgents',
				},
			},
			{
				displayName: 'Details',
				name: 'details',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Start Date',
				name: 'startdate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Target Date',
				name: 'targetdate',
				type: 'dateTime',
				default: '',
			},
		],
	},
];
