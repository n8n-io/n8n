import type { INodeProperties } from 'n8n-workflow';

// The v2 create/update/upsert operations share one resourceMapper config, differing only in the
// operation they show for and the mapper mode ('add' for create/update, 'upsert' for upsert).
const columnsField = (
	operation: 'create' | 'update' | 'upsert',
	mode: 'add' | 'upsert',
): INodeProperties => ({
	displayName: 'Columns',
	name: 'columns',
	type: 'resourceMapper',
	noDataExpression: true,
	default: {
		mappingMode: 'defineBelow',
		value: null,
	},
	required: true,
	typeOptions: {
		loadOptionsDependsOn: ['docId.value', 'tableId.value'],
		resourceMapper: {
			resourceMapperMethod: 'getMappingColumns',
			mode,
			fieldWords: {
				singular: 'column',
				plural: 'columns',
			},
			addAllFields: true,
			multiKeyMatch: true,
			supportAutoMap: true,
			hideNoDataError: true,
		},
	},
	displayOptions: {
		show: {
			operation: [operation],
			'@version': [{ _cnd: { gte: 2 } }],
		},
	},
});

export const operationFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				'@version': [1],
			},
		},
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
				// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-get-many
				name: 'Get Many Rows',
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
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				'@version': [{ _cnd: { gte: 2 } }],
			},
		},
		options: [
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new row, or update the current one if it already exists (upsert)',
				action: 'Create or update rows in a table',
			},
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
				// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-get-many
				name: 'Get Many Rows',
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

	// Resource locators (with "From List") for both versions. Legacy v1 workflows stored these
	// as plain strings; n8n's resource locator preserves that value in the "By ID" mode.
	{
		displayName: 'Document',
		name: 'docId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Grist document to operate on',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchDocs',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. utN3ysvktaDRm1hAUJJ8PH',
				hint: 'Open Document Settings in Grist and copy "This document\'s ID"',
			},
		],
	},
	{
		displayName: 'Table',
		name: 'tableId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['docId.value'],
		},
		description: 'The table to operate on',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchTables',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. Table1',
			},
		],
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
				operation: ['delete'],
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
				operation: ['getAll'],
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
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
		default: {},
		placeholder: 'Add option',
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				placeholder: 'Add Filter',
				description:
					'Only return rows matching all of the given filters. For complex filters, create a formula column and filter for the value "true".',
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
									loadOptionsDependsOn: ['docId.value', 'tableId.value'],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								description:
									'Column to apply the filter in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
									loadOptionsDependsOn: ['docId.value', 'tableId.value'],
									loadOptionsMethod: 'getTableColumns',
								},
								default: '',
								required: true,
								description:
									'Column to sort on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				operation: ['update'],
			},
		},
		default: '',
		description: 'ID of the row to update',
		required: true,
	},

	// ----------------------------------
	//      create + update (v1 only)
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
				operation: ['create', 'update'],
				'@version': [1],
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
				operation: ['create', 'update'],
				dataToSend: ['autoMapInputs'],
				'@version': [1],
			},
		},
		default: '',
		description:
			'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
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
				operation: ['create', 'update'],
				dataToSend: ['defineInNode'],
				'@version': [1],
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
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: ['docId.value', 'tableId.value'],
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

	// ----------------------------------
	//   create + update + upsert (v2)
	// ----------------------------------
	columnsField('create', 'add'),
	columnsField('update', 'add'),
	columnsField('upsert', 'upsert'),
];
