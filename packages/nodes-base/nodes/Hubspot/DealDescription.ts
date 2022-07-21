import {
	INodeProperties,
} from 'n8n-workflow';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a deal',
				action: 'Create a deal',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deal',
				action: 'Delete a deal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a deal',
				action: 'Get a deal',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all deals',
				action: 'Get all deals',
			},
			{
				name: 'Get Recently Created',
				value: 'getRecentlyCreated',
				description: 'Get recently created deals',
				action: 'Get recently created deals',
			},
			{
				name: 'Get Recently Modified',
				value: 'getRecentlyModified',
				description: 'Get recently modified deals',
				action: 'Get recently modified deals',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search deals',
				action: 'Search for deals',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a deal',
				action: 'Update a deal',
			},
		],
		default: 'create',
	},
];

export const dealFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                deal:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal Stage Name or ID',
		name: 'stage',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDealStages',
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		options: [],
		description: 'The dealstage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Associated Company Names or IDs',
				name: 'associatedCompany',
				type: 'multiOptions',
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
			},
			{
				displayName: 'Associated Vid Names or IDs',
				name: 'associatedVids',
				type: 'multiOptions',
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getContacts',
				},
				default: [],
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Custom Properties',
				name: 'customPropertiesUi',
				placeholder: 'Add Custom Property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customPropertiesValues',
						displayName: 'Custom Property',
						values: [
							{
								displayName: 'Property Name or ID',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getDealCustomProperties',
								},
								default: '',
								description: 'Name of the property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
			{
				displayName: 'Deal Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal Name',
				name: 'dealName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal Type Name or ID',
				name: 'dealType',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getDealTypes',
				},
				default: '',
			},
			{
				displayName: 'Pipeline',
				name: 'pipeline',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 deal:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular deal',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Update Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Custom Properties',
				name: 'customPropertiesUi',
				placeholder: 'Add Custom Property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customPropertiesValues',
						displayName: 'Custom Property',
						values: [
							{
								displayName: 'Property Name or ID',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getDealCustomProperties',
								},
								default: '',
								description: 'Name of the property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
			{
				displayName: 'Deal Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal Name',
				name: 'dealName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal Stage Name or ID',
				name: 'stage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDealStages',
				},
				default: '',
				description: 'The dealstage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Deal Type Name or ID',
				name: 'dealType',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getDealTypes',
				},
				default: '',
			},
			{
				displayName: 'Pipeline',
				name: 'pipeline',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  deal:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular deal',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Include Property Versions',
				name: 'includePropertyVersions',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'By default, you will only get data for the most recent version of a property in the "versions" data. If you include this parameter, you will get data for all previous versions.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 deal:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'getAll',
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
					'deal',
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
			maxValue: 250,
		},
		default: 100,
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
				resource: [
					'deal',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Include Associations',
				name: 'includeAssociations',
				type: 'boolean',
				default: false,
				description: 'Whether to include the IDs of the associated contacts and companies in the results. This will also automatically include the num_associated_contacts property.',
			},
			{
				displayName: 'Property Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: [],
				description: '<p>Used to include specific deal properties in the results. By default, the results will only include Deal ID and will not include the values for any properties for your Deals.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Properties with History',
				name: 'propertiesWithHistory',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: [],
				description: 'Works similarly to properties=, but this parameter will include the history for the specified property, instead of just including the current value. Use this parameter when you need the full history of changes to a property\'s value. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},

		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 deal:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular deal',
	},

	/* -------------------------------------------------------------------------- */
	/*               deal:getRecentlyCreated deal:getRecentlyModified             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'getRecentlyCreated',
					'getRecentlyModified',
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
					'deal',
				],
				operation: [
					'getRecentlyCreated',
					'getRecentlyModified',
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
		default: 100,
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
				resource: [
					'deal',
				],
				operation: [
					'getRecentlyCreated',
					'getRecentlyModified',
				],
			},
		},
		options: [
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description: 'Only return deals created after timestamp x',
			},
			{
				displayName: 'Include Property Versions',
				name: 'includePropertyVersions',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'By default, you will only get data for the most recent version of a property in the "versions" data. If you include this parameter, you will get data for all previous versions.',
			},
		],
	},

	/*--------------------------------------------------------------------------- */
	/*                                 deal:search                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'deal',
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
					'deal',
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
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filter Groups',
		name: 'filterGroupsUi',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Filter Group',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'search',
				],
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
						default: {},
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
											loadOptionsMethod: 'getDealProperties',
										},
										default: '',
									},
									{
										displayName: 'Operator',
										name: 'operator',
										type: 'options',
										options: [
											{
												name: 'Contains Exactly',
												value: 'CONSTAIN_TOKEN',
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
												],
											},
										},
										type: 'string',
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
		description: 'When multiple filters are provided within a filterGroup, they will be combined using a logical AND operator. When multiple filterGroups are provided, they will be combined using a logical OR operator. The system supports a maximum of three filterGroups with up to three filters each. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'deal',
				],
				operation: [
					'search',
				],
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
					loadOptionsMethod: 'getDealProperties',
				},
				default: [],
				description: '<p>Used to include specific deal properties in the results. By default, the results will only include Deal ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Perform a text search against all property values for an object type',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: 'createdate',
			},
		],
	},
];
