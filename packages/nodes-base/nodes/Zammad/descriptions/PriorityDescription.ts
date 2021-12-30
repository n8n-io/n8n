import {
	INodeProperties,
} from 'n8n-workflow';

export const prioritiesDescription: INodeProperties[] = [
	// ----------------------------------
	//           operations
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'priority',
				],
				api: [
					'rest',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an entry',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an entry',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all entries',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an entry',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'priority',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The name of the priority',
	},
	{
		displayName: 'Priority ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
					'get',
					'delete',
				],
				resource: [
					'priority',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The ID of the priority',
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'priority',
				],
				api: [
					'rest',
				],
			},
		},
		default: {},
		description: 'Additional optional fields of the priority',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Active?',
				name: 'active',
				type: 'boolean',
				default: false,
				description: 'Whether the priority is active',
			},
			{
				displayName: 'Default Create?',
				name: 'default_create',
				type: 'boolean',
				default: false,
				description: 'Whether priority is default for create',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'The note of the priority',
			},
			{
				displayName: 'UI Color',
				name: 'ui_color',
				type: 'color',
				default: '',
			},
			{
				displayName: 'UI Icon',
				name: 'ui_icon',
				type: 'string',
				default: '',
				description: 'If ID of the next priority',
			},
		],
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'priority',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The query to search the priorities',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'priority',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Sort By',
		name: 'sort_by',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'priority',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'How to sort the priorities',
	},
	{
		displayName: 'Order By',
		name: 'order_by',
		type: 'options',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'priority',
				],
				api: [
					'rest',
				],
			},
		},
		options: [
			{
				name: 'Ascending',
				value: 'asc',
			},
			{
				name: 'Descending',
				value: 'desc',
			},
		],
		default: 'asc',
		description: 'How to order the priorities',
	},
];
