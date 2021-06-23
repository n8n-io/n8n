import {
	INodeProperties,
} from 'n8n-workflow';

export const tableRecordOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'get',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const tableRecordFields = [
	/* -------------------------------------------------------------------------- */
	/*                                tableRecord:create                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		description: 'The table name.',
	},
	{
		displayName: 'JSON input',
		name: 'json',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		description: 'Choose to provide input data as JSON.',
	},
	{
		displayName: 'JSON Data',
		name: 'jsonData',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'create',
				],
				json: [
					true
				]
			},
		},
		required: true,
		description: 'Choose to provide input data as JSON.',
	},
	{
		displayName: 'Input Fields',
		name: 'inputFields',
		type: 'fixedCollection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'create',
				],
				json: [
					false
				]
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Input Field',
				name: 'field',
				values: [
					{
						displayName: 'Field Name',
						name: 'column',
						type: 'options',
						typeOptions:{
							loadOptionsMethod: 'getTableColumns',
							loadOptionsDependsOn: [
								'tableName'
							]
						},
						default: '',
					},
					{
						displayName: 'Field Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                tableRecord:getAll                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
		description: 'The table name.',
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
					'tableRecord',
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
					'tableRecord',
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

	/* -------------------------------------------------------------------------- */
	/*                                tableRecord:get/delete                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'delete',
					'get',
				],
			},
		},
		required: true,
		description: 'Name of the table in which the record exists.',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'delete',
					'get',
				],
			},
		},
		required: true,
		description: 'Unique identifier of the record.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'get',
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Display values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Display values',
						value: 'true'
					},
					{
						name: 'Actual values',
						value: 'false'
					},
					{
						name: 'Both',
						value: 'all'
					},
				],
				default: 'false',
				description: 'Choose which values to return.',
			},
			{
				displayName: 'Query',
				name: 'sysparm_query',
				type: 'boolean',
				default: false,
				description: 'An encoded query string used to filter the results.',
			},
			{
				displayName: 'Exclude reference link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Exclude Table API links for reference fields.',
			},
			{
				displayName: 'Fields',
				name: 'sysparm_fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of fields to return.',
			},
			{
				displayName: 'View',
				name: 'sysparm_view',
				type: 'boolean',
				default: false,
				description: 'Render the response according to the specified UI view (overridden by Fields option).',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                tableRecord:update                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
		description: 'The table name.',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
		description: 'Unique identifier of the record.',
	},
	{
		displayName: 'JSON input',
		name: 'json',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
		description: 'Choose to provide input data as JSON.',
	},
	{
		displayName: 'JSON Data',
		name: 'jsonData',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'update',
				],
				json: [
					true
				]
			},
		},
		required: true,
		description: 'Choose to provide input data as JSON.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'fixedCollection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'update',
				],
				json: [
					false
				]
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Input Field',
				name: 'field',
				values: [
					{
						displayName: 'Field Name',
						name: 'column',
						type: 'options',
						typeOptions:{
							loadOptionsMethod: 'getTableColumns',
							loadOptionsDependsOn: [
								'tableName'
							]
						},
						default: '',
					},
					{
						displayName: 'Field Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
] as INodeProperties[];
