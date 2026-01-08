import type { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		options: [
			{
				name: 'Add Note',
				value: 'addNote',
				description: 'Add a note to a company',
				action: 'Add a note to a company',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many companies',
				action: 'Get many companies',
			},
			{
				name: 'Get Notes',
				value: 'getNotes',
				description: 'Get notes for a company',
				action: 'Get notes for a company',
			},
		],
		displayOptions: {
			show: {
				resource: ['company'],
			},
		},
	},
];

export const companyFields: INodeProperties[] = [
	// ----------------------------------
	//        company: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['company'],
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
				resource: ['company'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search term to filter companies',
			},
		],
	},

	// ----------------------------------
	//        company: addNote
	// ----------------------------------
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the company to add the note to',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['addNote'],
			},
		},
	},
	{
		displayName: 'Note Content',
		name: 'content',
		type: 'string',
		typeOptions: {
			rows: 3,
		},
		required: true,
		default: '',
		description: 'Content of the note to add',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['addNote'],
			},
		},
	},

	// ----------------------------------
	//        company: getNotes
	// ----------------------------------
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the company to get notes for',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getNotes'],
			},
		},
	},
];
