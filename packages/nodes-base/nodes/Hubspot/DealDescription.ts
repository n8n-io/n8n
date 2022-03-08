import {
	INodeProperties,
} from 'n8n-workflow';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a deal',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all deals',
			},
			{
				name: 'Get Recently Created',
				value: 'getRecentlyCreated',
				description: 'Get recently created deals',
			},
			{
				name: 'Get Recently Modified',
				value: 'getRecentlyModified',
				description: 'Get recently modified deals',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search deals',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a deal',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const dealFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                deal:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal Stage',
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
		description: 'The dealstage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages.',
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
				displayName: 'Associated Company',
				name: 'associatedCompany',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
			},
			{
				displayName: 'Associated Vids',
				name: 'associatedVids',
				type: 'multiOptions',
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
								displayName: 'Property',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getDealCustomProperties',
								},
								default: '',
								description: 'Name of the property.',
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
				displayName: 'Deal Type',
				name: 'dealType',
				type: 'options',
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
								displayName: 'Property',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getDealCustomProperties',
								},
								default: '',
								description: 'Name of the property.',
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
				displayName: 'Deal Stage',
				name: 'stage',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getDealStages',
				},
				default: '',
				description: 'The dealstage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages.',
			},
			{
				displayName: 'Deal Type',
				name: 'dealType',
				type: 'options',
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
				displayName: 'Include Property Versions	',
				name: 'includePropertyVersions',
				type: 'boolean',
				default: false,
				description: `By default, you will only get data for the most recent version of a property in the "versions" data. If you include this parameter, you will get data for all previous versions.`,
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
		description: 'If all results should be returned or only up to a given limit.',
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
		description: 'How many results to return.',
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
				description: `Include the IDs of the associated contacts and companies in the results.
				This will also automatically include the num_associated_contacts property.`,
			},
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: [],
				description: `<p>Used to include specific deal properties in the results. By default, the results will only include Deal ID and will not include the values for any properties for your Deals.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>`,
			},
			{
				displayName: 'Properties With History',
				name: 'propertiesWithHistory',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: [],
				description: `Works similarly to properties=, but this parameter will include the history for the specified property, instead of just including the current value. Use this parameter when you need the full history of changes to a property's value.`,
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
		description: 'If all results should be returned or only up to a given limit.',
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
		description: 'How many results to return.',
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
				description: `Only return deals created after timestamp x`,
			},
			{
				displayName: 'Include Property Versions',
				name: 'includePropertyVersions',
				type: 'boolean',
				default: false,
				description: `By default, you will only get data for the most recent version of a property in the "versions" data. If you include this parameter, you will get data for all previous versions.`,
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
		description: 'If all results should be returned or only up to a given limit.',
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
		description: 'How many results to return.',
	},
	{
		displayName: 'Filter Groups',
		name: 'filterGroupsUi',
		type: 'fixedCollection',
		default: '',
		placeholder: 'Add Filter Group',
		typeOptions: {
			multipleValues: true,
		},
		required: false,
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
						default: '',
						placeholder: 'Add Filter',
						typeOptions: {
							multipleValues: true,
						},
						required: false,
						options: [
							{
								name: 'filterValues',
								displayName: 'Filter',
								values: [
									{
										displayName: 'Property Name',
										name: 'propertyName',
										type: 'options',
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
												name: 'Equal',
												value: 'EQ',
											},
											{
												name: 'Not Equal',
												value: 'NEQ',
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
												name: 'Contains Exactly',
												value: 'CONSTAIN_TOKEN',
											},
											{
												name: `Doesn't Contain Exactly`,
												value: 'NOT_CONSTAIN_TOKEN',
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
						description: 'Use filters to limit the results to only CRM objects with matching property values. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>',
					},
				],
			},
		],
		description: `When multiple filters are provided within a filterGroup, they will be combined using a logical AND operator. When multiple filterGroups are provided, they will be combined using a logical OR operator. The system supports a maximum of three filterGroups with up to three filters each. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>`,
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
				displayName: 'Fields',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: [],
				description: `<p>Used to include specific deal properties in the results. By default, the results will only include Deal ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>`,
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Perform a text search against all property values for an object type',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: 'createdate',
			},
		],
	},
];
