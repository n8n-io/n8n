import {
	INodeProperties,
} from 'n8n-workflow';

export const searchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'search',
				],
			},
		},
		options: [
			{
				name: 'Query',
				value: 'query',
				description: 'Search for records by entering query and entities',
			},
		],
		default: 'query',
	},
];

export const searchFields: INodeProperties[] = [
	// ----------------------------------------
	//          Search: lookup
	// ----------------------------------------
	{
		displayName: 'Search Term',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		description: 'Enter a term that will be used for searching entities',
		displayOptions: {
			show: {
				resource: [
					'search',
				],
				operation: [
					'query',
				],
			},
		},
	},
	{
		displayName: 'Entities',
		name: 'entities',
		description: 'Select entities to query against. You can include multiple entities at once. Each result\'s response would contain a "type" key specifying the type of entity for identification.',
		type: 'multiOptions',
		required: true,
		default: [],
		hint: 'You can set array of string or string of comma separated values in an expression',
		options: [
			{
				name: 'Account',
				value: 'sales_account',
			},
			{
				name: 'Appointment',
				value: 'appointment',
			},
			{
				name: 'Contact',
				value: 'contact',
			},
			{
				name: 'Deal',
				value: 'deal',
			},
			{
				name: 'Document',
				value: 'document',
			},
			{
				name: 'Note',
				value: 'note',
			},
			{
				name: 'Product',
				value: 'product',
			},
			{
				name: 'Sales Activity',
				value: 'sales_activity',
			},
			{
				name: 'Task',
				value: 'task',
			},
			{
				name: 'User',
				value: 'user',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'search',
				],
				operation: [
					'query',
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'search',
				],
				operation: [
					'query',
				],
			},
		},
		options: [
			{
				displayName: 'Field',
				name: 'field',
				description: 'Provide the field against which the entities have to be searched. The request can be searched only on one field.',
				type: 'string',
				default: '',
				hint: 'Searching in multiple entities make sure that this field is available in all entities or else you\'d receive an error response',
			},
		],
	},
];
