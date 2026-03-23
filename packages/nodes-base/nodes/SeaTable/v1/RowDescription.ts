import type { INodeProperties } from 'n8n-workflow';

export const rowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a row',
				action: 'Create a row',
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
		description: 'The operation being performed',
	},
];

export const rowFields: INodeProperties[] = [
	// ----------------------------------
	//             shared
	// ----------------------------------

	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Table Name',
		name: 'tableName',
		type: 'options',
		placeholder: 'Name of the table',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTableNames',
		},
		displayOptions: {
			hide: {
				operation: ['get'],
			},
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'The name of SeaTable table to access. Choose from the list, or specify the name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Table ID',
		name: 'tableId',
		type: 'options',
		placeholder: 'ID of the table',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTableIds',
		},
		displayOptions: {
			show: {
				operation: ['get'],
			},
		},
		default: '',

		description:
			'The name of SeaTable table to access. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// ----------------------------------
	//             update
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
	},

	// ----------------------------------
	//             create
	// ----------------------------------
	{
		displayName: 'Data to Send',
		name: 'fieldsToSend',
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
				description: 'Set the value for each destination column',
			},
		],
		displayOptions: {
			show: {
				operation: ['create', 'update'],
			},
		},
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				fieldsToSend: ['autoMapInputData'],
			},
		},
		default: '',
		description:
			'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
		placeholder: 'Enter properties...',
	},
	{
		displayName: 'Columns to Send',
		name: 'columnsUi',
		placeholder: 'Add Column',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Column to Send',
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Column',
				name: 'columnValues',
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Column Name',
						name: 'columnName',
						type: 'options',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
						description:
							'Choose from the list, or specify the name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['table'],
							loadOptionsMethod: 'getTableUpdateAbleColumns',
						},
						default: '',
					},
					{
						displayName: 'Column Value',
						name: 'columnValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				fieldsToSend: ['defineBelow'],
			},
		},
		default: {},
		description: 'Add destination column with its value',
	},
	// ----------------------------------
	//             delete
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
	},

	// ----------------------------------
	//             get
	// ----------------------------------
	{
		displayName: 'Row ID',
		name: 'rowId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['get'],
			},
		},
		default: '',
	},

	// ----------------------------------
	//             getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
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
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'View Name',
				name: 'view_name',
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description:
					'Choose from the list, or specify an View Name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getViews',
				},
				default: '',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Convert Link ID',
				name: 'convert_link_id',
				type: 'boolean',
				default: false,
				description:
					'Whether the ID of the linked row is returned in the link column (true). Otherwise, it return the name of the linked row (false).',
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
				description: 'The direction of the sort, ascending (asc) or descending (desc)',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Order By Column',
				name: 'order_by',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAllSortableColumns',
				},
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description:
					'Choose from the list, or specify a Column using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
			},
		],
	},
];
