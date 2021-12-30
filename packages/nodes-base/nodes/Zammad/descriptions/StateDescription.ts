import {
	INodeProperties,
} from 'n8n-workflow';

export const statesDescription: INodeProperties[] = [
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
					'state',
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
					'state',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The name of the state',
	},
	{
		displayName: 'State Type ID',
		name: 'state_type_id',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'state',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The state type ID of the state',
	},
	{
		displayName: 'State ID',
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
					'state',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The ID of the state',
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
					'state',
				],
				api: [
					'rest',
				],
			},
		},
		default: {},
		description: 'Additional optional fields of the state',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Active?',
				name: 'active',
				type: 'boolean',
				default: false,
				description: 'Whether the state is active',
			},
			{
				displayName: 'Default Create?',
				name: 'default_create',
				type: 'boolean',
				default: false,
				description: 'Whether state is default for create',
			},
			{
				displayName: 'Default Followup?',
				name: 'default_follow_up',
				type: 'boolean',
				default: false,
				description: 'Whether the state is default for follow up',
			},
			{
				displayName: 'Ignore Escalation?',
				name: 'ignore_escalation',
				type: 'boolean',
				default: false,
				description: 'Whether escalation should be ignored',
			},
			{
				displayName: 'Next State ID',
				name: 'next_state_id',
				type: 'number',
				default: 0,
				description: 'If ID of the next state',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'The note of the state',
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
					'state',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The query to search the states',
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
					'state',
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
					'state',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'How to sort the states',
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
					'state',
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
		description: 'How to order the states',
	},
];
