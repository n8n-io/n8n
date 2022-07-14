import {
	INodeProperties,
} from 'n8n-workflow';

export const operationFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create Row',
				value: 'create',
				description: 'Create rows in a table',
				action: 'Create rows in a table',
			},
			{
				name: 'Delete Row',
				value: 'delete',
				description: 'Delete rows from a table',
				action: 'Delete rows from a table',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-get-all
				name: 'Get All Rows',
				value: 'getAll',
				description: 'Read rows from a table',
				action: 'Read rows from a table',
			},
			{
				name: 'Update Row',
				value: 'update',
				description: 'Update rows in a table',
				action: 'Update rows in a table',
			},
		],
		default: 'getAll',
	},

	// ----------------------------------
	//             shared
	// ----------------------------------
	{
		displayName: 'Document ID',
		name: 'docId',
		type: 'string',
		default: '',
		required: true,
		description: 'In your document, click your profile icon, then Document Settings, then copy the value under "This document\'s ID"',
	},
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of table to operate on. If unsure, look at the Code View.',
	},

	// ----------------------------------
	//              delete
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'ID of the row to delete, or comma-separated list of row IDs to delete',
		required: true,
	},

	// ----------------------------------
	//              getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				placeholder: 'Add Filter',
				description: 'Only return rows matching all of the given filters. For complex filters, create a formula column and filter for the value "true".',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Filter Properties',
						name: 'filterProperties',
						values: [
							{
								displayName: 'Column Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: [
										'docId',
										'tableId',
									],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								description: 'Column to apply the filter in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
								required: true,
							},
							{
								displayName: 'Values',
								name: 'values',
								type: 'string',
								default: '',
								description: 'Comma-separated list of values to search for in the filtered column',
							},
						],
					},
				],
			},
			{
				displayName: 'Sort Order',
				name: 'sort',
				placeholder: 'Add Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Sort Properties',
						name: 'sortProperties',
						values: [
							{
								displayName: 'Column Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: [
										'docId',
										'tableId',
									],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								required: true,
								description: 'Column to sort on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
							},
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
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
								description: 'Direction to sort in',
							},
						],
					},
				],
			},
		],
	},

	// ----------------------------------
	//            update
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'ID of the row to update',
		required: true,
	},

	// ----------------------------------
	//         create + update
	// ----------------------------------
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputs',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Define Below for Each Column',
				value: 'defineInNode',
				description: 'Set the value for each destination column',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
			},
		},
		default: 'defineInNode',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				dataToSend: [
					'autoMapInputs',
				],
			},
		},
		default: '',
		description: 'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
		placeholder: 'Enter properties...',
	},
	{
		displayName: 'Fields to Send',
		name: 'fieldsToSend',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Field to Send',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				dataToSend: [
					'defineInNode',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Properties',
				name: 'properties',
				values: [
					{
						displayName: 'Column Name or ID',
						name: 'fieldId',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: [
								'tableId',
							],
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
