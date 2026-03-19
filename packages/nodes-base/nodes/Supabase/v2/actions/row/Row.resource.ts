import type { INodeProperties } from 'n8n-workflow';

/** Shared: Data-to-send parameters (create, update, upsert) */
const dataToSendProperties: INodeProperties[] = [
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Define Below for Each Column',
				value: 'defineBelow',
				description: 'Set the value for each destination column manually',
			},
		],
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create', 'update', 'upsert'],
			},
		},
		default: 'defineBelow',
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create', 'update', 'upsert'],
				dataToSend: ['autoMapInputData'],
			},
		},
		default: '',
		description:
			'Comma-separated list of input properties to ignore when sending data. Leave empty to send all properties.',
		placeholder: 'Enter properties...',
	},
	{
		displayName: 'Fields to Send',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['create', 'update', 'upsert'],
				dataToSend: ['defineBelow'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['tableId'],
							loadOptionsMethod: 'getTableColumns',
						},
						default: '',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
];

/** Shared: Filter parameters (delete, getAll, update) */
const filterProperties: INodeProperties[] = [
	{
		displayName: 'Filter Type',
		name: 'filterType',
		type: 'options',
		options: [
			{ name: 'None', value: 'none' },
			{ name: 'Build Manually', value: 'manual' },
		],
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['delete', 'getAll', 'update'],
			},
		},
		default: 'manual',
	},
	{
		displayName: 'Must Match',
		name: 'matchType',
		type: 'options',
		options: [
			{ name: 'Any Filter', value: 'anyFilter' },
			{ name: 'All Filters', value: 'allFilters' },
		],
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['delete', 'getAll', 'update'],
				filterType: ['manual'],
			},
		},
		default: 'anyFilter',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['delete', 'getAll', 'update'],
				filterType: ['manual'],
			},
		},
		default: {},
		placeholder: 'Add Condition',
		options: [
			{
				displayName: 'Conditions',
				name: 'conditions',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'keyName',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['tableId'],
							loadOptionsMethod: 'getTableColumns',
						},
						default: '',
					},
					{
						displayName: 'Condition',
						name: 'condition',
						type: 'options',
						noDataExpression: true,
						options: [
							{ name: 'Equals', value: 'eq' },
							{ name: 'Full-Text', value: 'fullText' },
							{ name: 'Greater Than', value: 'gt' },
							{ name: 'Greater Than or Equal', value: 'gte' },
							{
								name: 'ILIKE operator',
								value: 'ilike',
								description: 'Use * in place of %',
							},
							{
								name: 'Is',
								value: 'is',
								description: 'Checking for exact equality (null, true, false, unknown)',
							},
							{ name: 'Less Than', value: 'lt' },
							{ name: 'Less Than or Equal', value: 'lte' },
							{
								name: 'LIKE operator',
								value: 'like',
								description: 'Use * in place of %',
							},
							{ name: 'Not Equals', value: 'neq' },
						],
						default: '',
					},
					{
						displayName: 'Search Function',
						name: 'searchFunction',
						type: 'options',
						noDataExpression: true,
						displayOptions: { show: { condition: ['fullText'] } },
						options: [
							{ name: 'To_tsquery', value: 'fts' },
							{ name: 'Plainto_tsquery', value: 'plfts' },
							{ name: 'Phraseto_tsquery', value: 'phfts' },
							{ name: 'Websearch_to_tsquery', value: 'wfts' },
						],
						default: '',
					},
					{
						displayName: 'Field Value',
						name: 'keyValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
];

export const description: INodeProperties[] = [
	// Operation selector
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['row'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new row',
				action: 'Create a row',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Upsert a row',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a row',
				action: 'Delete a row',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a row',
				action: 'Get a row',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many rows',
				action: 'Get many rows',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a row',
				action: 'Update a row',
			},
		],
		default: 'create',
	},
	// Table selector
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTables',
		},
		displayOptions: { show: { resource: ['row'] } },
		default: '',
	},
	// Create / Update / Upsert: data to send
	...dataToSendProperties,
	// Upsert-specific: conflict target
	{
		displayName: 'Conflict Columns',
		name: 'conflictColumns',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Column',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['upsert'],
			},
		},
		default: {},
		description: 'Columns that form the unique constraint used to detect conflicts',
		options: [
			{
				displayName: 'Columns',
				name: 'columns',
				values: [
					{
						displayName: 'Column Name or ID',
						name: 'column',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['tableId'],
							loadOptionsMethod: 'getTableColumns',
						},
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'On Conflict',
		name: 'conflictAction',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				name: 'Update Row',
				value: 'doUpdate',
				description: 'Update the existing row with new values',
			},
			{
				name: 'Do Nothing',
				value: 'doNothing',
				description: 'Leave the existing row unchanged',
			},
		],
		default: 'doUpdate',
	},
	// Delete / GetAll / Update: filters
	...filterProperties,
	// Get: equality conditions
	{
		displayName: 'Select Conditions',
		name: 'filters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['get'],
			},
		},
		default: {},
		placeholder: 'Add Condition',
		options: [
			{
				displayName: 'Conditions',
				name: 'conditions',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'keyName',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['tableId'],
							loadOptionsMethod: 'getTableColumns',
						},
						default: '',
					},
					{
						displayName: 'Field Value',
						name: 'keyValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	// GetAll: pagination
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
	},
];
