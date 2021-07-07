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
		displayName: 'Send Input Data',
		name: 'sendInputData',
		type: 'boolean',
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
		default: true,
		description: 'Send the the data the node receives as JSON.',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'create',
				],
				sendInputData: [
					true,
				],
			},
		},
		default: '',
		required: true,
		description: 'Comma-separated list of the properties to use as columns for the rows to create',
	},
	{
		displayName: 'Input Fields',
		name: 'inputFields',
		type: 'fixedCollection',
		placeholder: 'Add Field',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'create',
				],
				sendInputData: [
					false,
				],
			},
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
							loadOptionsMethod: 'getColumns',
							loadOptionsDependsOn: [
								'tableName',
							],
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
		displayName: 'Record ID',
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
		displayName: 'Options',
		name: 'options',
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
				displayName: 'Display Values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Display Values',
						value: 'true',
					},
					{
						name: 'Actual Values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
				],
				default: 'false',
				description: 'Choose which values to return.',
			},
			{
				displayName: 'Exclude Reference Link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Exclude Table API links for reference fields.',
			},
			{
				displayName: 'Fields',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
					loadOptionsDependsOn: [
						'tableName',
					],
				},
				default: '',
				description: 'A list of fields to return.',
			},
			{
				displayName: 'Query',
				name: 'sysparm_query',
				type: 'string',
				default: '',
				description: 'An encoded query string used to filter the results.',
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
		displayName: 'Record ID',
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
		displayName: 'Send Input Data',
		name: 'sendInputData',
		type: 'boolean',
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
		default: true,
		description: 'Send the the data the node receives as JSON.',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'update',
				],
				sendInputData: [
					true,
				],
			},
		},
		default: '',
		required: true,
		description: 'Comma-separated list of the properties to use as columns for the rows to create',
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
				sendInputData: [
					false,
				],
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
							loadOptionsMethod: 'getColumns',
							loadOptionsDependsOn: [
								'tableName',
							],
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
