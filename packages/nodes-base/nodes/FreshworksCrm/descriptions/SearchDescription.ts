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
				name: 'Lookup',
				value: 'lookup',
				description: 'Lookup records by entering query for a given field and entities combination',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search for records by entering query and entities',
			},
		],
		default: 'search',
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
					'lookup',
					'search',
				],
			},
		},
	},
	{
		displayName: 'Field',
		name: 'field',
		description: 'Provide the field against which the entities have to be searched. The request can be searched only on one field.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'search',
				],
				operation: [
					'lookup',
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
					'lookup',
					'search',
				],
			},
		},
	},
];
