import {
	INodeProperties,
} from 'n8n-workflow';

export const tableRecordOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				action: 'Create a table record',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a table record',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a table record',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all table records',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a table record',
			},
		],
		default: 'get',
	},
];

export const tableRecordFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                tableRecord:create                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table Name or ID',
		name: 'tableName',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTables',
		},
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
	},
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'mapInput',
				description: 'Use when node input names match destination field names',
			},
			{
				name: 'Define Below for Each Column',
				value: 'columns',
				description: 'Set the value for each destination column',
			},
			{
				name: 'Nothing',
				value: 'nothing',
				description: 'Don\'t send any column data',
			},
		],
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
		default: 'columns',
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'create',
				],
				dataToSend: [
					'mapInput',
				],
			},
		},
		default: '',
		description: 'List of input properties to avoid sending, separated by commas. Leave empty to send all inputs.',
	},
	{
		displayName: 'Fields to Send',
		name: 'fieldsToSend',
		type: 'fixedCollection',
		placeholder: 'Add field to send',
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
				dataToSend: [
					'columns',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'column',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
						typeOptions: {
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
		displayName: 'Table Name or ID',
		name: 'tableName',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTables',
		},
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
		description: 'Whether to return all results or only up to a given limit',
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
		default: 50,
		description: 'Max number of results to return',
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
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Exclude Reference Link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude Table API links for reference fields',
			},
			{
				displayName: 'Field Names or IDs',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
					loadOptionsDependsOn: [
						'tableName',
					],
				},
				default: [],
				description: 'A list of fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				hint: 'String of comma separated values or an array of strings can be set in an expression',
			},
			{
				displayName: 'Filter',
				name: 'sysparm_query',
				type: 'string',
				default: '',
				description: 'An encoded query string used to filter the results. <a href="https://developer.servicenow.com/dev.do#!/learn/learning-plans/quebec/servicenow_application_developer/app_store_learnv2_rest_quebec_more_about_query_parameters">More info</a>.',
			},
			{
				displayName: 'Return Values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Actual Values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
					{
						name: 'Display Values',
						value: 'true',
					},
				],
				default: 'false',
				description: 'Choose which values to return',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                tableRecord:get/delete                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table Name or ID',
		name: 'tableName',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTables',
		},
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
		description: 'Name of the table in which the record exists. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
	},
	{
		displayName: 'Table Record ID',
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
		description: 'Unique identifier of the record',
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
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Exclude Reference Link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude Table API links for reference fields',
			},
			{
				displayName: 'Field Names or IDs',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
					loadOptionsDependsOn: [
						'tableName',
					],
				},
				default: [],
				description: 'A list of fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				hint: 'String of comma separated values or an array of strings can be set in an expression',
			},
			{
				displayName: 'Return Values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Actual Values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
					{
						name: 'Display Values',
						value: 'true',
					},
				],
				default: 'false',
				description: 'Choose which values to return',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                tableRecord:update                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table Name or ID',
		name: 'tableName',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTables',
		},
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
	},
	{
		displayName: 'Table Record ID',
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
		description: 'Unique identifier of the record',
	},
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'mapInput',
				description: 'Use when node input names match destination field names',
			},
			{
				name: 'Define Below for Each Column',
				value: 'columns',
				description: 'Set the value for each destination column',
			},
			{
				name: 'Nothing',
				value: 'nothing',
				description: 'Don\'t send any column data',
			},
		],
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
		default: 'columns',
	},
	{
		displayName: 'Inputs to Ignore',
		name: 'inputsToIgnore',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'update',
				],
				dataToSend: [
					'mapInput',
				],
			},
		},
		default: '',
		description: 'List of input properties to avoid sending, separated by commas. Leave empty to send all inputs.',
	},
	{
		displayName: 'Fields to Send',
		name: 'fieldsToSend',
		type: 'fixedCollection',
		placeholder: 'Add field to send',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'tableRecord',
				],
				operation: [
					'update',
				],
				dataToSend: [
					'columns',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'column',
						type: 'options',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
						typeOptions: {
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
];
