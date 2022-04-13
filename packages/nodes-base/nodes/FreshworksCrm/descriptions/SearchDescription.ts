import {
	INodeProperties,
} from 'n8n-workflow';

export const searchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
				description: 'Lookup an entry by a given field value entity combination',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Runs a search',
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
		displayName: 'Query term',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		description: 'Term to search for',
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
		description: 'Field to search in',
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
		description: 'Comma separated list of entities to search in or include in the resultset',
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
					'search',
				],
			},
		},
	},
];
