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
				description: 'Create a record',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a record',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all records',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a record',
			},
			{
				name: 'Upsert',
				value: 'upsert',
				description: 'Upsert a record',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const recordFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                record:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
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
		description: 'The table identifier',
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
		placeholder: 'Select Fields...',
		description: 'Comma separated list of the properties which should used as columns for the new rows.',
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
					'create',
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
		placeholder: 'Add Option',
		default: {},
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
		options: [
			{
				displayName: 'Return Fields',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTableFields',
					loadOptionsDependsOn: [
						'tableId',
					],
				},
				default: [],
				description: `Specify an array of field ids that will return data for any updates or added record. Record ID (FID 3) is always returned if any field ID is requested.`,
			},
			{
				displayName: 'Use Field IDs',
				name: 'useFieldIDs',
				type: 'boolean',
				default: false,
				description: 'Use Field IDs instead of Field Names in Columns.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                record:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'The table identifier',
	},
	{
		displayName: 'Where',
		name: 'where',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'delete',
				],
			},
		},
		description: `The filter to delete records. To delete all records specify a filter that will include all records, for example {3.GT.0} where 3 is the ID of the Record ID field.`,
	},
	/* -------------------------------------------------------------------------- */
	/*                                record:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
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
		description: 'The table identifier',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
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
		default: false,
		description: 'Returns a list of your user contacts.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
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
		options: [
			{
				displayName: 'Select',
				name: 'select',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTableFields',
				},
				default: [],
				description: 'An array of field ids for the fields that should be returned in the response. If empty, the default columns on the table will be returned.',
			},
			{
				displayName: 'Sort By',
				name: 'sortByUi',
				placeholder: 'Add Sort By',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'sortByValues',
						displayName: 'Sort By',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getTableFields',
								},
								default: '',
								description: 'The unique identifier of a field in a table.',
							},
							{
								displayName: 'Order',
								name: 'order',
								type: 'options',
								options: [
									{
										name: 'ASC',
										value: 'ASC',
									},
									{
										name: 'DESC',
										value: 'DESC',
									},
								],
								default: 'ASC',
							},
						],
					},
				],
				description: `By default, queries will be sorted by the given sort fields or the default sort if the query does not provide any. Set to false to avoid sorting when the order of the data returned is not important. Returning data without sorting can improve performance.`,
			},
			{
				displayName: 'Where',
				name: 'where',
				type: 'string',
				default: '',
				description: 'The filter, using the <a href="https://help.quickbase.com/api-guide/componentsquery.html">Quick Base query language</a>, which determines the records to return.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                record:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The table identifier',
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
					'update',
				],
			},
		},
		default: '',
		required: true,
		placeholder: 'id,name,description',
		description: 'Comma separated list of the properties which should used as columns for the new rows.',
	},
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'update can use the key field on the table, or any other supported unique field.',
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
					'update',
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
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTableFields',
					loadOptionsDependsOn: [
						'tableId',
					],
				},
				default: [],
				description: `Specify an array of field ids that will return data for any updates or added record. Record ID (FID 3) is always returned if any field ID is requested.`,
			},
			{
				displayName: 'Use Field IDs',
				name: 'useFieldIDs',
				type: 'boolean',
				default: false,
				description: 'Use Field IDs instead of Field Names in Columns.',
			},
			// {
			// 	displayName: 'Merge Field ID',
			// 	name: 'mergeFieldId',
			// 	type: 'options',
			// 	typeOptions: {
			// 		loadOptionsMethod: 'getUniqueTableFields',
			// 	},
			// 	default: '',
			// 	description: `You're updating records in a Quick Base table with data from an external file. In order for a merge like this to work,
			// 	Quick Base needs a way to match records in the source data with corresponding records in the destination table. You make this possible by
			// 	choosing the field in the app table that holds unique matching values. This is called a merge field.`,
			// },
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                record:upsert                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table ID',
		name: 'tableId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'upsert',
				],
			},
		},
		description: 'The table identifier',
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
					'upsert',
				],
			},
		},
		default: '',
		required: true,
		placeholder: 'id,name,description',
		description: 'Comma separated list of the properties which should used as columns for the new rows.',
	},
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'upsert',
				],
			},
		},
		default: '',
		description: 'update can use the key field on the table, or any other supported unique field.',
	},
	{
		displayName: 'Merge Field ID',
		name: 'mergeFieldId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUniqueTableFields',
		},
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'upsert',
				],
			},
		},
		default: '',
		description: `<p>You're updating records in a Quick Base table with data from an external file. In order for a merge like this to work, Quick Base needs a way to match records in the source data with corresponding records in the destination table.</p><p>You make this possible by choosing the field in the app table that holds unique matching values. This is called a merge field.</p>`,
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
					'upsert',
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
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'record',
				],
				operation: [
					'upsert',
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTableFields',
					loadOptionsDependsOn: [
						'tableId',
					],
				},
				default: [],
				description: `Specify an array of field ids that will return data for any updates or added record. Record ID (FID 3) is always returned if any field ID is requested.`,
			},
			{
				displayName: 'Use Field IDs',
				name: 'useFieldIDs',
				type: 'boolean',
				default: false,
				description: 'Use Field IDs instead of Field Names in Columns.',
			},
		],
	},
];
