import {
	INodeProperties,
} from 'n8n-workflow';

export const recordOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'record',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new record.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all records.',
			},
		],
		default: 'create',
		description: 'Operation to perform.',
	},
];

export const recordFields: INodeProperties[] = [
	// ----------------------------------
	//         record: create
	// ----------------------------------
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'record',
				],
			},
		},
		default: '',
		description: 'ID of the project to create the record in.',
	},
	{
		displayName: 'Dataset ID',
		name: 'datasetId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDatasets',
			loadOptionsDependsOn: [
				'projectId',
			],
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'record',
				],
			},
		},
		default: '',
		description: 'ID of the dataset to create the record in.',
	},
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: [
				'projectId',
				'datasetId',
			],
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'record',
				],
			},
		},
		default: '',
		description: 'ID of the table to create the record in.',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		required: true,
		placeholder: 'id,name,description',
		description: 'Comma-separated list of the item properties to use as columns.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'record',
				],
			},
		},
		options: [
			{
				displayName: 'Ignore Unknown Values',
				name: 'ignoreUnknownValues',
				type: 'boolean',
				default: false,
				description: 'Ignore row values that do not match the schema.',
			},
			{
				displayName: 'Skip Invalid Rows',
				name: 'skipInvalidRows',
				type: 'boolean',
				default: false,
				description: 'Skip rows with values that do not match the schema.',
			},
			{
				displayName: 'Template Suffix',
				name: 'templateSuffix',
				type: 'string',
				default: '',
				description: 'Create a new table based on the destination table and insert rows into the new table. The new table will be named <code>{destinationTable}{templateSuffix}</code>.',
			},
			{
				displayName: 'Trace ID',
				name: 'traceId',
				type: 'string',
				default: '',
				description: 'Unique ID for the request, for debugging only. It is case-sensitive, limited to up to 36 ASCII characters. A UUID is recommended.',
			},
		],
	},

	// ----------------------------------
	//         record: getAll
	// ----------------------------------
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'record',
				],
			},
		},
		default: '',
		description: 'ID of the project to retrieve all rows from.',
	},
	{
		displayName: 'Dataset ID',
		name: 'datasetId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDatasets',
			loadOptionsDependsOn: [
				'projectId',
			],
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'record',
				],
			},
		},
		default: '',
		description: 'ID of the dataset to retrieve all rows from.',
	},
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: [
				'projectId',
				'datasetId',
			],
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'record',
				],
			},
		},
		default: '',
		description: 'ID of the table to retrieve all rows from.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'record',
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
				operation: [
					'getAll',
				],
				resource: [
					'record',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'record',
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'selectedFields',
				type: 'string',
				default: '',
				description: 'Subset of fields to return, supports select into sub fields. Example: <code>selectedFields = "a,e.d.f"</code>.',
			},
			// {
			// 	displayName: 'Use Int64 Timestamp',
			// 	name: 'useInt64Timestamp',
			// 	type: 'boolean',
			// 	default: false,
			// 	description: 'Output timestamp as usec int64.',
			// },
		],
	},
];
