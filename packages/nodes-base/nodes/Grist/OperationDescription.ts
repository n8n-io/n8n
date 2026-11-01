import type { INodeProperties } from 'n8n-workflow';

const V1 = { '@version': [1] };
const V2 = { '@version': [{ _cnd: { gte: 2 } }] };

// In version 2, a column mapper replaces the version 1 inputs for values and matching.
const columnsField = (operation: 'create' | 'update' | 'upsert'): INodeProperties => ({
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
			resourceMapperMethod:
				operation === 'create' ? 'getMappingColumns' : 'getMappingColumnsWithRowId',
			mode: operation === 'create' ? 'add' : operation,
			fieldWords: {
				singular: 'column',
				plural: 'columns',
			},
			addAllFields: true,
			multiKeyMatch: true,
		},
	},
	displayOptions: {
		show: {
			operation: [operation],
			...V2,
		},
		// The mapper has nothing to show until it knows the table.
		hide: {
			tableId: [''],
		},
	},
});

// The column pickers read the table from a version 1 plain string or a version 2 locator.
const columnOptionsDependsOn = ['docId', 'docId.value', 'tableId', 'tableId.value'];

export const operationFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Insert or update rows in a table',
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
	{
		displayName: 'Document ID',
		name: 'docId',
		type: 'string',
		default: '',
		required: true,
		description:
			'In your document, click your profile icon, then Document Settings, then copy the value under "This document\'s ID"',
		displayOptions: {
			show: {
				...V1,
			},
		},
	},
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of table to operate on. If unsure, look at the Code View.',
		displayOptions: {
			show: {
				...V1,
			},
		},
	},
	{
		displayName: 'Document',
		name: 'docId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The document to use. Select it from the list, or give its URL or ID.',
		displayOptions: {
			show: {
				...V2,
			},
		},
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
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://docs.getgrist.com/utN3ysvktaDR/Sales',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^https?://.+',
							errorMessage: 'The URL must start with http:// or https://',
						},
					},
				],
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. utN3ysvktaDRm1hAUJJ8PH',
				hint: 'In Grist, open Document Settings and copy the document ID.',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[^/]+$',
							errorMessage: 'A document ID holds no "/". To give a URL, use By URL.',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Table',
		name: 'tableId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The table to use. Select it from the list, or give its ID.',
		displayOptions: {
			show: {
				...V2,
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['docId.value'],
		},
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
				hint: 'A table ID is not always its name. In Grist, use raw data view to see it.',
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
									loadOptionsDependsOn: columnOptionsDependsOn,
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
									loadOptionsDependsOn: columnOptionsDependsOn,
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
				...V1,
			},
		},
		default: '',
		description: 'ID of the row to update',
		required: true,
	},

	// ----------------------------------
	//              upsert
	// ----------------------------------
	{
		displayName: 'Upsert Criteria',
		name: 'upsertCriteria',
		placeholder: 'Add Criteria Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Criteria Field',
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['upsert'],
				...V1,
			},
		},
		default: {},
		description: 'Fields to use for matching existing records',
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
							loadOptionsDependsOn: columnOptionsDependsOn,
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
	{
		displayName: 'On Multiple Matches',
		name: 'onMany',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['upsert'],
			},
		},
		options: [
			{
				name: 'Update First Match',
				value: 'first',
				description: 'Update the first matching record (default)',
			},
			{
				name: 'Do Not Update',
				value: 'none',
				description: 'Do not update anything if multiple matches found',
			},
			{
				name: 'Update All Matches',
				value: 'all',
				description: 'Update all matching records',
			},
		],
		default: 'first',
		description: 'What to do when multiple records match the upsert criteria',
	},

	// ----------------------------------
	//    create + update + upsert (v1)
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
				operation: ['create', 'update', 'upsert'],
				...V1,
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
				operation: ['create', 'update', 'upsert'],
				dataToSend: ['autoMapInputs'],
				...V1,
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
				operation: ['create', 'update', 'upsert'],
				dataToSend: ['defineInNode'],
				...V1,
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
							loadOptionsDependsOn: columnOptionsDependsOn,
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
	//    create + update + upsert (v2)
	// ----------------------------------
	columnsField('create'),
	columnsField('update'),
	columnsField('upsert'),
];
