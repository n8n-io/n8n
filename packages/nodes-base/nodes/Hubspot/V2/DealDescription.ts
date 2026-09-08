import type { INodeProperties } from 'n8n-workflow';

export const dealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['deal'],
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
				name: 'Get many',
				value: 'getAll',
				description: 'Get many deals',
				action: 'Get many deals',
			},
			{
				name: 'Get recently created/updated',
				value: 'getRecentlyCreatedUpdated',
				description: 'Get recently created/updated deals',
				action: 'Get recently created/updated deals',
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
		displayName: 'Deal stage name or ID',
		name: 'stage',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDealStages',
		},
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
			},
		},
		default: '',
		options: [],
		description:
			'The deal stage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Deal properties',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['create'],
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
				displayName: 'Associated company names or IDs',
				name: 'associatedCompany',
				type: 'multiOptions',
				description:
					'Whether to include specific Associated Company properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: [],
			},
			{
				displayName: 'Associated vid names or IDs',
				name: 'associatedVids',
				type: 'multiOptions',
				description:
					'Whether to include specific Associated Vid in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getContacts',
				},
				default: [],
			},
			{
				displayName: 'Close date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description:
					'When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format',
			},
			{
				displayName: 'Custom properties',
				name: 'customPropertiesUi',
				placeholder: 'Add custom property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customPropertiesValues',
						displayName: 'Custom property',
						values: [
							{
								displayName: 'Property name or ID',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getDealProperties',
								},
								default: '',
								description:
									'Name of the property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								required: true,
								description: 'Value of the property',
							},
						],
					},
				],
			},
			{
				displayName: 'Deal description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal name',
				name: 'dealName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal owner',
				name: 'dealOwner',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'From list',
						name: 'list',
						type: 'list',
						placeholder: 'Select from the list',
						typeOptions: {
							searchListMethod: 'searchOwners',
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: '58539222',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[0-9]+',
									errorMessage: 'Not a valid HubSpot Owner ID',
								},
							},
						],
					},
				],
				description: 'The HubSpot user to be assigned to the deal',
			},
			{
				displayName: 'Deal type name or ID',
				name: 'dealType',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getDealTypes',
				},
				default: '',
			},
			{
				displayName: 'Pipeline name or ID',
				name: 'pipeline',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getDealPipelines',
				},
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 deal:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal to update',
		name: 'dealId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['update'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				placeholder: 'Select from the list',
				typeOptions: {
					searchListMethod: 'searchDeals',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '58539222',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]+',
							errorMessage: 'Not a valid HubSpot Deal ID',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add update field',
		default: {},
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['update'],
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
				displayName: 'Close date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description:
					'When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format',
			},
			{
				displayName: 'Custom properties',
				name: 'customPropertiesUi',
				placeholder: 'Add custom property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customPropertiesValues',
						displayName: 'Custom property',
						values: [
							{
								displayName: 'Property name or ID',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getDealProperties',
								},
								default: '',
								description:
									'Name of the property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								required: true,
								description: 'Value of the property',
							},
						],
					},
				],
			},
			{
				displayName: 'Deal description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal name',
				name: 'dealName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Deal owner',
				name: 'dealOwner',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'From list',
						name: 'list',
						type: 'list',
						placeholder: 'Select from the list',
						typeOptions: {
							searchListMethod: 'searchOwners',
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: '58539222',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[0-9]+',
									errorMessage: 'Not a valid HubSpot Owner ID',
								},
							},
						],
					},
				],
				description: 'The HubSpot user to be assigned to the deal',
			},
			{
				displayName: 'Deal stage name or ID',
				name: 'stage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDealStages',
				},
				default: '',
				description:
					'The deal stage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Deal type name or ID',
				name: 'dealType',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		displayName: 'Deal to get',
		name: 'dealId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				placeholder: 'Select from the list',
				typeOptions: {
					searchListMethod: 'searchDeals',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '58539222',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]+',
							errorMessage: 'Not a valid HubSpot Deal ID',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Include property versions',
				name: 'includePropertyVersions',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default, you will only get data for the most recent version of a property in the "versions" data. If you include this parameter, you will get data for all previous versions.',
			},
			{
				displayName: 'Deal properties to include',
				name: 'propertiesCollection',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'propertiesValues',
						displayName: 'Deal properties to include',
						values: [
							{
								displayName: 'Deal properties to include',
								name: 'properties',
								type: 'multiOptions',
								typeOptions: {
									loadOptionsMethod: 'getDealProperties',
								},
								default: [],
								description:
									'Whether to include specific Deal properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Include',
								name: 'propertyMode',
								type: 'options',
								options: [
									{
										name: 'Value and history',
										value: 'valueAndHistory',
									},
									{
										name: 'Value only',
										value: 'valueOnly',
									},
								],
								default: 'valueAndHistory',
								description:
									'Specify if the current value for a property should be fetched, or the value and all the historical values for that property',
							},
						],
					},
				],
				description:
					'<p>Used to include specific deal properties in the results. By default, the results will only include Deal ID and will not include the values for any properties for your Deals.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 deal:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deal'],
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
				resource: ['deal'],
				operation: ['getAll'],
				returnAll: [false],
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
		displayName: 'Options',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include associations',
				name: 'includeAssociations',
				type: 'boolean',
				default: false,
				description:
					'Whether to include the IDs of the associated contacts and companies in the results. This will also automatically include the num_associated_contacts property.',
			},
			{
				displayName: 'Deal properties to include',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: [],
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description:
					'Include specific deal properties in the results. By default, the results will only include Deal ID and will not include the values for any properties for your Deals.',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gt: 2 } }],
					},
				},
			},
			{
				displayName: 'Deal properties with history to include',
				name: 'propertiesWithHistory',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: [],
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
				description:
					'Works similarly to properties, but this parameter will include the history for the specified property',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gt: 2 } }],
					},
				},
			},
			{
				displayName: 'Deal properties to include',
				name: 'propertiesCollection',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'propertiesValues',
						displayName: 'Deal properties to include',
						values: [
							{
								displayName: 'Deal properties to include',
								name: 'properties',
								type: 'multiOptions',
								typeOptions: {
									loadOptionsMethod: 'getDealProperties',
								},
								default: [],
								description:
									'Whether to include specific Deal properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Include',
								name: 'propertyMode',
								type: 'options',
								options: [
									{
										name: 'Value and history',
										value: 'valueAndHistory',
									},
									{
										name: 'Value only',
										value: 'valueOnly',
									},
								],
								default: 'valueAndHistory',
								description:
									'Specify if the current value for a property should be fetched, or the value and all the historical values for that property',
							},
						],
					},
				],
				description:
					'<p>Used to include specific deal properties in the results. By default, the results will only include Deal ID and will not include the values for any properties for your Deals.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 deal:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Deal to delete',
		name: 'dealId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				placeholder: 'Select from the list',
				typeOptions: {
					searchListMethod: 'searchDeals',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '58539222',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]+',
							errorMessage: 'Not a valid HubSpot Deal ID',
						},
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*               deal:getRecentDeals            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['getRecentlyCreatedUpdated'],
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
				resource: ['deal'],
				operation: ['getRecentlyCreatedUpdated'],
				returnAll: [false],
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
		displayName: 'Options',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['getRecentlyCreatedUpdated'],
			},
		},
		options: [
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description:
					'Only return deals created after timestamp x. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format.',
			},
			{
				displayName: 'Include property versions',
				name: 'includePropertyVersions',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default, you will only get data for the most recent version of a property in the "versions" data. If you include this parameter, you will get data for all previous versions.',
			},
		],
	},

	/*--------------------------------------------------------------------------- */
	/*                                 deal:search                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['search'],
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
				resource: ['deal'],
				operation: ['search'],
				returnAll: [false],
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
		displayName: 'Filter groups',
		name: 'filterGroupsUi',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add filter group',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['deal'],
				operation: ['search'],
			},
		},
		options: [
			{
				name: 'filterGroupsValues',
				displayName: 'Filter group',
				values: [
					{
						displayName: 'Filters',
						name: 'filtersUi',
						type: 'fixedCollection',
						default: {},
						placeholder: 'Add filter',
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								name: 'filterValues',
								displayName: 'Filter',
								values: [
									{
										displayName: 'Property name or ID',
										name: 'propertyName',
										type: 'options',
										description:
											'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
										typeOptions: {
											loadOptionsMethod: 'getDealProperties',
										},
										default: '',
									},
									{
										displayName: 'Type',
										name: 'type',
										type: 'hidden',
										default: '={{$parameter["&propertyName"].split("|")[1]}}',
									},
									{
										displayName: 'Operator',
										name: 'operator',
										type: 'options',
										displayOptions: {
											hide: {
												type: ['number'],
											},
										},
										options: [
											{
												name: 'Contains exactly',
												value: 'CONTAINS_TOKEN',
											},
											{
												name: 'Equal',
												value: 'EQ',
											},
											{
												name: 'Is known',
												value: 'HAS_PROPERTY',
											},
											{
												name: 'Is unknown',
												value: 'NOT_HAS_PROPERTY',
											},
											{
												name: 'Not equal',
												value: 'NEQ',
											},
										],
										default: 'EQ',
									},
									{
										displayName: 'Operator',
										name: 'operator',
										type: 'options',
										displayOptions: {
											show: {
												type: ['number'],
											},
										},
										options: [
											{
												name: 'Contains exactly',
												value: 'CONTAINS_TOKEN',
											},
											{
												name: 'Equal',
												value: 'EQ',
											},
											{
												name: 'Greater than',
												value: 'GT',
											},
											{
												name: 'Greater than or equal',
												value: 'GTE',
											},
											{
												name: 'Is known',
												value: 'HAS_PROPERTY',
											},
											{
												name: 'Is unknown',
												value: 'NOT_HAS_PROPERTY',
											},
											{
												name: 'Less than',
												value: 'LT',
											},
											{
												name: 'Less than or equal',
												value: 'LTE',
											},
											{
												name: 'Not equal',
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
												operator: ['HAS_PROPERTY', 'NOT_HAS_PROPERTY'],
											},
										},
										required: true,
										type: 'string',
										default: '',
									},
								],
							},
						],
						description:
							'Use filters to limit the results to only CRM objects with matching property values. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>.',
					},
				],
			},
		],
		description:
			'When multiple filters are provided within a Filter Group, they will be combined using a logical AND operator. When multiple Filter Groups are provided, they will be combined using a logical OR operator. The system supports a maximum of three Filter Groups with up to three filters each. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>',
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['deal'],
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
						name: 'Ascending',
						value: 'ASCENDING',
					},
					{
						name: 'Descending',
						value: 'DESCENDING',
					},
				],
				default: 'DESCENDING',
				description:
					'Defines the direction in which search results are ordered. Default value is Descending.',
			},
			{
				displayName: 'Field names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: [],
				description:
					'Whether to include specific Deal properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				displayName: 'Sort by',
				name: 'sortBy',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getDealProperties',
				},
				default: 'createdate',
			},
		],
	},
];
