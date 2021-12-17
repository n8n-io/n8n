import {
	INodeProperties,
} from 'n8n-workflow';

export const tableRecordOperations: INodeProperties[] = [
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
	},
];

export const tableRecordFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                tableRecord:create                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table Name',
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
					'create',
				],
			},
		},
		required: true,
		description: 'The table name',
	},
	{
		displayName: 'Data to Send',
		name: 'dataToSend',
		type: 'options',
		options: [
			{
				name: 'Auto-map Input Data to Columns',
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
				description: `Don't send any column data`,
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
		required: false,
		description: 'List of input properties to avoid sending, separated by commas. Leave empty to send all inputs',
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
						displayName: 'Field Name',
						name: 'column',
						type: 'options',
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
		displayName: 'Table Name',
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
					'getAll',
				],
			},
		},
		required: true,
		description: 'The table name',
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
		description: 'If all results should be returned or only up to a given limit',
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
		description: 'The max number of results to return',
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
				description: 'A list of fields to return',
			},
			{
				displayName: 'Filter',
				name: 'sysparm_query',
				type: 'string',
				default: '',
				description: 'An encoded query string used to filter the results. <a href="https://developer.servicenow.com/dev.do#!/learn/learning-plans/quebec/servicenow_application_developer/app_store_learnv2_rest_quebec_more_about_query_parameters">More info</a>',
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
		displayName: 'Table Name',
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
		description: 'Name of the table in which the record exists',
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
				description: 'A list of fields to return',
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
		displayName: 'Table Name',
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
					'update',
				],
			},
		},
		required: true,
		description: 'The table name',
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
				name: 'Auto-map Input Data to Columns',
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
				description: `Don't send any column data`,
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
		required: false,
		description: 'List of input properties to avoid sending, separated by commas. Leave empty to send all inputs',
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
						displayName: 'Field Name',
						name: 'column',
						type: 'options',
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
