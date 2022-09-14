import { INodeProperties } from 'n8n-workflow';

export const recordOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a record',
				action: 'Create a record',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a record',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a record',
				action: 'Delete a record',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many records',
				action: 'Get many records',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a record',
				action: 'Update a record',
			},
		],
		default: 'create',
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
				resource: ['record'],
				operation: ['create'],
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
				resource: ['record'],
				operation: ['create'],
			},
		},
		default: '',
		required: true,
		placeholder: 'Select Fields...',
		description:
			'Comma-separated list of the properties which should used as columns for the new rows',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['create'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Return Field Names or IDs',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTableFields',
					loadOptionsDependsOn: ['tableId'],
				},
				default: [],
				description:
					'Specify an array of field IDs that will return data for any updates or added record. Record ID (FID 3) is always returned if any field ID is requested. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Use Field IDs',
				name: 'useFieldIDs',
				type: 'boolean',
				default: false,
				description: 'Whether to use Field IDs instead of Field Names in Columns',
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
				resource: ['record'],
				operation: ['delete'],
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
				resource: ['record'],
				operation: ['delete'],
			},
		},
		description:
			'The filter to delete records. To delete all records specify a filter that will include all records, for example {3.GT.0} where 3 is the ID of the Record ID field.',
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
				resource: ['record'],
				operation: ['getAll'],
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
				resource: ['record'],
				operation: ['getAll'],
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
				resource: ['record'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Select',
				name: 'select',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTableFields',
				},
				default: [],
				description:
					'An array of field IDs for the fields that should be returned in the response. If empty, the default columns on the table will be returned. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
								displayName: 'Field Name or ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getTableFields',
								},
								default: '',
								description:
									'The unique identifier of a field in a table. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				description:
					'By default, queries will be sorted by the given sort fields or the default sort if the query does not provide any. Set to false to avoid sorting when the order of the data returned is not important. Returning data without sorting can improve performance.',
			},
			{
				displayName: 'Where',
				name: 'where',
				type: 'string',
				default: '',
				description:
					'The filter, using the <a href="https://help.quickbase.com/api-guide/componentsquery.html">Quick Base query language</a>, which determines the records to return',
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
				resource: ['record'],
				operation: ['update'],
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
				resource: ['record'],
				operation: ['update'],
			},
		},
		default: '',
		required: true,
		placeholder: 'id,name,description',
		description:
			'Comma-separated list of the properties which should used as columns for the new rows',
	},
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'Update can use the key field on the table, or any other supported unique field',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['update'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Field Names or IDs',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTableFields',
					loadOptionsDependsOn: ['tableId'],
				},
				default: [],
				description:
					'Specify an array of field IDs that will return data for any updates or added record. Record ID (FID 3) is always returned if any field ID is requested. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Use Field IDs',
				name: 'useFieldIDs',
				type: 'boolean',
				default: false,
				description: 'Whether to use Field IDs instead of Field Names in Columns',
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
				resource: ['record'],
				operation: ['upsert'],
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
				resource: ['record'],
				operation: ['upsert'],
			},
		},
		default: '',
		required: true,
		placeholder: 'id,name,description',
		description:
			'Comma-separated list of the properties which should used as columns for the new rows',
	},
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['upsert'],
			},
		},
		default: '',
		description: 'Update can use the key field on the table, or any other supported unique field',
	},
	{
		displayName: 'Merge Field Name or ID',
		name: 'mergeFieldId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUniqueTableFields',
		},
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['upsert'],
			},
		},
		default: '',
		description:
			'<p>You\'re updating records in a Quick Base table with data from an external file. In order for a merge like this to work, Quick Base needs a way to match records in the source data with corresponding records in the destination table.</p><p>You make this possible by choosing the field in the app table that holds unique matching values. This is called a merge field.</p>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['upsert'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				displayName: 'Field Names or IDs',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTableFields',
					loadOptionsDependsOn: ['tableId'],
				},
				default: [],
				description:
					'Specify an array of field IDs that will return data for any updates or added record. Record ID (FID 3) is always returned if any field ID is requested. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Use Field IDs',
				name: 'useFieldIDs',
				type: 'boolean',
				default: false,
				description: 'Whether to use Field IDs instead of Field Names in Columns',
			},
		],
	},
];
