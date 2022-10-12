import { INodeProperties } from 'n8n-workflow';

export const customObjectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['customObject'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a custom object',
				action: 'Create a custom object',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or Update a custom object',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Archive a custom object',
				action: 'Delete a custom object',
			},
			{
				name: 'Delete (Batch)',
				value: 'batchDelete',
				description: 'Like delete, but this costs only up to two requests per 100 objects',
				action: 'Delete (Batch) a custom object',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a custom object',
				action: 'Get a custom object',
			},
			{
				name: 'Get (Batch)',
				value: 'batchGet',
				description: 'Like get, but this has fewer options and costs only one request per 100 objects',
				action: 'Get (Batch) a custom object',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search custom object',
				action: 'Search a custom object',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a custom object',
				action: 'Update a custom object',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Custom Object Type Name or ID',
		name: 'objectType',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['customObject'],
			},
			hide: {
				operation: ['define'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectTypes',
		},
		default: '',
	},
];

export const customObjectFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                              customObject:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Properties',
		name: 'customObjectProperties',
		placeholder: 'Add Property',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Custom Property',
				values: [
					{
						displayName: 'Property Name or ID',
						name: 'property',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: ['objectType'],
							loadOptionsMethod: 'getCustomObjectProperties',
						},
						default: '',
						description: 'Name of the property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the property',
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                              customObject:update                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID Property Name or ID',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectIdProperties',
			loadOptionsDependsOn: ['objectType'],
		},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['update'],
			},
		},
		required: true,
		default: '',
		description: 'The property that will be used as the ID. The property has to have "hasUniqueValue" set to true. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The value of the ID Property of the object',
	},
	{
		displayName: 'Properties',
		name: 'customObjectProperties',
		placeholder: 'Add Property',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['update'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Custom Property',
				values: [
					{
						displayName: 'Property Name or ID',
						name: 'property',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: ['objectType'],
							loadOptionsMethod: 'getCustomObjectProperties',
						},
						default: '',
						description: 'Name of the property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the property',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                              customObject:upsert                           */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'ID Property',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectIdProperties',
			loadOptionsDependsOn: ['objectType'],
		},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['upsert'],
			},
		},
		required: true,
		default: '',
		description: 'The property that will be used as the ID. The property has to have "hasUniqueValue" set to true. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		hint: 'When "Hubspot object ID" is used and object with such ID does not exist, a new object will be created with ID assigned by system',
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['upsert'],
			},
		},
		default: '',
		description: 'The value of the ID Property of the object',
	},
	{
		displayName: 'Properties',
		name: 'customObjectProperties',
		placeholder: 'Add Property',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				name: 'values',
				displayName: 'Custom Property',
				values: [
					{
						displayName: 'Property Name or ID',
						name: 'property',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: ['objectType'],
							loadOptionsMethod: 'getCustomObjectProperties',
						},
						default: '',
						description: 'Name of the property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the property',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                             customObject:get                               */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'ID Property',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectIdProperties',
			loadOptionsDependsOn: ['objectType'],
		},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['get'],
			},
		},
		required: true,
		default: '',
		description: 'The property that will be used as the ID. The property has to have "hasUniqueValue" set to true. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The value of the ID Property of the object',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Property Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: ['objectType'],
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: [],
				description: 'A list of the properties to be returned in the response. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Properties With History',
				name: 'propertiesWithHistory',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: ['objectType'],
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: [],
				description: 'A list of the properties to be returned along with their history of previous values. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                          customObject:batchGet                             */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'ID Property',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectIdProperties',
			loadOptionsDependsOn: ['objectType'],
		},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['batchGet'],
			},
		},
		required: true,
		default: '',
		description: 'The property that will be used as the ID. The property has to have "hasUniqueValue" set to true. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['batchGet'],
			},
		},
		default: '',
		description: 'The value of the ID Property of the object',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['batchGet'],
			},
		},
		options: [
			{
				displayName: 'Property Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjectProperties',
					loadOptionsDependsOn: ['objectType'],
				},
				default: [],
				description: 'A list of the properties to be returned in the response. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Properties With History',
				name: 'propertiesWithHistory',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjectProperties',
					loadOptionsDependsOn: ['objectType'],
				},
				default: [],
				description: 'A list of the properties to be returned along with their history of previous values. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                            customObject:search                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'customObject',
				],
				operation: [
					'search',
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
				resource: [
					'customObject',
				],
				operation: [
					'search',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filter Groups',
		name: 'filterGroups',
		type: 'fixedCollection',
		default: [],
		placeholder: 'Add Filter Group',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['search'],
			},
		},
		options: [
			{
				name: 'filterGroupsValues',
				displayName: 'Filter Group',
				values: [
					{
						displayName: 'Filters',
						name: 'filtersUi',
						type: 'fixedCollection',
						default: [],
						placeholder: 'Add Filter',
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								name: 'filterValues',
								displayName: 'Filter',
								values: [
									{
										displayName: 'Property Name or ID',
										name: 'propertyName',
										type: 'options',
										description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
										typeOptions: {
											loadOptionsDependsOn: ['objectType'],
											loadOptionsMethod: 'getCustomObjectProperties',
										},
										default: '',
									},
									{
										displayName: 'Operator',
										name: 'operator',
										type: 'options',
										options: [
											{
												name: 'Between',
												value: 'BETWEEN',
											},
											{
												name: 'Contains Exactly',
												value: 'CONTAINS_TOKEN',
											},
											{
												name: 'Does Not Contain Exactly',
												value: 'NOT_CONTAINS_TOKEN',
											},
											{
												name: 'Equal',
												value: 'EQ',
											},
											{
												name: 'Greater Than',
												value: 'GT',
											},
											{
												name: 'Greater Than Or Equal',
												value: 'GTE',
											},
											{
												name: 'In a Set',
												value: 'IN',
											},
											{
												name: 'Is Known',
												value: 'HAS_PROPERTY',
											},
											{
												name: 'Is Unknown',
												value: 'NOT_HAS_PROPERTY',
											},
											{
												name: 'Less Than',
												value: 'LT',
											},
											{
												name: 'Less Than Or Equal',
												value: 'LTE',
											},
											{
												name: 'Not Equal',
												value: 'NEQ',
											},
											{
												name: 'Not In a Set',
												value: 'NOT_IN',
											},
										],
										default: 'EQ',
									},
									{
										displayName: 'Value',
										name: 'value',
										displayOptions: {
											hide: {
												operator: [
													'HAS_PROPERTY',
													'NOT_HAS_PROPERTY',
													'BETWEEN',
													'IN',
													'NOT_IN',
												],
											},
										},
										type: 'string',
										default: '',
									},
									{
										displayName: 'Low Value',
										name: 'value',
										displayOptions: {
											show: {
												operator: [
													'BETWEEN',
												],
											},
										},
										type: 'string',
										default: '',
										description: 'The lower bound for a between filter',
									},
									{
										displayName: 'High Value',
										name: 'highValue',
										displayOptions: {
											show: {
												operator: [
													'BETWEEN',
												],
											},
										},
										type: 'string',
										default: '',
										description: 'The upper bound for a between filter',
									},
									{
										displayName: 'Values',
										name: 'values',
										displayOptions: {
											show: {
												operator: [
													'IN',
													'NOT_IN',
												],
											},
										},
										type: 'string',
										typeOptions: {
											multipleValues: true,
										},
										default: '',
									},
								],
							},
						],
						description: 'Use filters to limit the results to only CRM objects with matching property values. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>.',
					},
				],
			},
		],
		description: 'When multiple filters are provided within a filterGroup, they will be combined using a logical AND operator. When multiple filterGroups are provided, they will be combined using a logical OR operator. The system supports a maximum of three filterGroups with up to three filters each. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'ASCENDING',
					},
					{
						name: 'DESC',
						value: 'DESCENDING',
					},
				],
				default: 'DESCENDING',
				description: 'Defines the direction in which search results are ordered. Default value is DESC.',
			},
			{
				displayName: 'Field Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: ['objectType'],
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: [],
				description: 'A list of the properties to be returned in the response. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},

			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['objectType'],
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: '',
				description: 'Sort the results ascending by this property. . Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Search all searchable properties for this string',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                              customObject:delete                           */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'ID Property',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectIdProperties',
			loadOptionsDependsOn: ['objectType'],
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['delete', 'batchDelete'],
			},
		},
		default: '',
		description: 'The property that will be used as the ID. The property has to have "hasUniqueValue" set to true. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Object ID',
		name: 'objectId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['delete', 'batchDelete'],
			},
		},
		default: '',
		description: 'The value of the ID Property of the object',
	},
];
