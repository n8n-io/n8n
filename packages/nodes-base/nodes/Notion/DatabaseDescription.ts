import {
	INodeProperties,
} from 'n8n-workflow';

export const databaseOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a database.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all databases.',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Query a database.',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const databaseFields = [

	/* -------------------------------------------------------------------------- */
	/*                                database:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'get',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                database:query                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Database ID',
		name: 'databaseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'query',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'query',
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'database',
				],
				operation: [
					'query',
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'How many results to return.',
	},
	// {
	// 	displayName: 'Options',
	// 	name: 'options',
	// 	type: 'collection',
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'query',
	// 			],
	// 			resource: [
	// 				'database',
	// 			],
	// 		},
	// 	},
	// 	default: {},
	// 	placeholder: 'Add Field',
	// 	options: [
	// 		{
	// 			displayName: 'Filters',
	// 			name: 'filter',
	// 			placeholder: 'Add Filter',
	// 			type: 'fixedCollection',
	// 			typeOptions: {
	// 				multipleValues: false,
	// 			},
	// 			default: {},
	// 			options: [
	// 				{
	// 					displayName: 'Single Condition',
	// 					name: 'singleCondition',
	// 					values: [
	// 						{
	// 							displayName: 'Property Name',
	// 							name: 'propertyName',
	// 							type: 'options',
	// 							typeOptions: {
	// 								loadOptionsMethod: 'getDatabaseProperties',
	// 								loadOptionsDependsOn: [
	// 									'datatabaseId',
	// 								],
	// 							},
	// 							default: '',
	// 							description: 'The name of the property to filter by.',
	// 						},
	// 						{
	// 							displayName: 'Condition',
	// 							name: 'condition',
	// 							type: 'options',
	// 							options: [
	// 								{
	// 									name: 'Equal',
	// 									value: 'equal',
	// 								},
	// 								{
	// 									name: 'Text',
	// 									value: 'text',
	// 								},
	// 								{
	// 									name: 'Number',
	// 									value: 'number',
	// 								},
	// 								{
	// 									name: 'Checkbox',
	// 									value: 'checkbox',
	// 								},
	// 								{
	// 									name: 'Select',
	// 									value: 'select',
	// 								},
	// 								{
	// 									name: 'Select',
	// 									value: 'select',
	// 								},
	// 							],
	// 							default: '',
	// 							description: 'The value of the property to filter by.',
	// 						},
	// 					],
	// 				},
	// 			],
	// 		},
	// 		{
	// 			displayName: 'Sort',
	// 			name: 'sort',
	// 			placeholder: 'Add Sort',
	// 			type: 'fixedCollection',
	// 			typeOptions: {
	// 				multipleValues: false,
	// 			},
	// 			default: {},
	// 			options: [
	// 				{
	// 					displayName: 'Sort',
	// 					name: 'sortValue',
	// 					values: [
	// 						{
	// 							displayName: 'Direction',
	// 							name: 'direction',
	// 							type: 'options',
	// 							options: [
	// 								{
	// 									name: 'Ascending',
	// 									value: 'ascending',
	// 								},
	// 								{
	// 									name: 'descending',
	// 									value: 'descending',
	// 								},
	// 							],
	// 							default: 'database',
	// 							description: 'The direction to sort.',
	// 						},
	// 						{
	// 							displayName: 'Timestamp',
	// 							name: 'timestamp',
	// 							type: 'options',
	// 							options: [
	// 								{
	// 									name: 'Last Edited Time',
	// 									value: 'last_edited_time',
	// 								},
	// 							],
	// 							default: '',
	// 							description: `The name of the timestamp to sort against.`,
	// 						},
	// 					],
	// 				},
	// 			],
	// 		},
	// 	],
	// },
] as INodeProperties[];
