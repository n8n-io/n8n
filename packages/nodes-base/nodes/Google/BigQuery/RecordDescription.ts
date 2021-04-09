import {
	INodeProperties,
} from 'n8n-workflow';

export const recordOperations = [
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
				description: 'Create a new record',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all records',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const recordFields = [
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
		description: 'Project ID',
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
		description: 'Project ID',
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
		description: 'Table ID',
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
		description: 'Comma separated list of the properties which should used as columns for the new rows.',
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
				description: `Accept rows that contain values that do not match the schema. The unknown values are ignored`,
			},
			{
				displayName: 'Skip Invalid Rows',
				name: 'skipInvalidRows',
				type: 'boolean',
				default: false,
				description: `Insert all valid rows of a request, even if invalid rows exist`,
			},
			{
				displayName: 'Tempalte Suffix',
				name: 'templateSuffix',
				type: 'string',
				default: '',
				description: `If specified, treats the destination table as a base template, and inserts the rows into an instance table named "{destination}{templateSuffix}`,
			},
			{
				displayName: 'Trace ID',
				name: 'traceId',
				type: 'string',
				default: '',
				description: `Unique request trace id. Used for debugging purposes only. It is case-sensitive, limited to up to 36 ASCII characters. A UUID is recommended.`,
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
		description: 'Project ID',
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
		description: 'Project ID',
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
		description: 'Table ID',
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
		displayName: 'Simple',
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
		description: 'When set to true a simplify version of the response will be used else the raw data.',
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
				description: `Subset of fields to return, supports select into sub fields. Example: selectedFields = "a,e.d.f"`,
			},
			{
				displayName: 'Use Int64 Timestamp',
				name: 'useInt64Timestamp',
				type: 'boolean',
				default: false,
				description: `Output timestamp as usec int64. Default is false.`,
			},
		],
	},
] as INodeProperties[];
