import type { INodeProperties } from 'n8n-workflow';

export const databaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'searchPeople',
		options: [
			{
				name: 'Get Companies Schema',
				value: 'getCompaniesSchema',
				description: 'Get the schema for companies database',
				action: 'Get companies schema',
			},
			{
				name: 'Get People Schema',
				value: 'getPeopleSchema',
				description: 'Get the schema for people database',
				action: 'Get people schema',
			},
			{
				name: 'Search Companies',
				value: 'searchCompanies',
				description: 'Search the companies database',
				action: 'Search companies database',
			},
			{
				name: 'Search People',
				value: 'searchPeople',
				description: 'Search the people database',
				action: 'Search people database',
			},
		],
		displayOptions: {
			show: {
				resource: ['database'],
			},
		},
	},
];

export const databaseFields: INodeProperties[] = [
	// ----------------------------------
	//        database: getPeopleSchema
	// ----------------------------------
	// No additional fields required

	// ----------------------------------
	//        database: getCompaniesSchema
	// ----------------------------------
	// No additional fields required

	// ----------------------------------
	//        database: searchPeople
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'json',
		required: true,
		default: '{}',
		description:
			'JSON object with search filters for people database. Use getPeopleSchema to see available filters.',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['searchPeople'],
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
				resource: ['database'],
				operation: ['searchPeople'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'Number of results to skip',
			},
		],
	},

	// ----------------------------------
	//        database: searchCompanies
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'json',
		required: true,
		default: '{}',
		description:
			'JSON object with search filters for companies database. Use getCompaniesSchema to see available filters.',
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['searchCompanies'],
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
				resource: ['database'],
				operation: ['searchCompanies'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				description: 'Number of results to skip',
			},
		],
	},
];
