import { INodeProperties } from 'n8n-workflow';

export const customObjectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['customObject'],
			},
		},
		options: [
			{
				name: 'Create/Update',
				value: 'upsert',
				description: 'Get all custom Objects',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a custom Object',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Archive a custom Object',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a custom Object',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search custom Objects',
			},
			{
				name: 'Update',
				value: 'update',
				description: '(Partially) Update a custom Object',
			},
			{
				name: 'Batched get',
				value: 'batchGet',
				description: 'Like get, but this has fewer options and costs only one request per 100 objects. Requires continueOnFail',
			},
			{
				name: 'Batched delete',
				value: 'batchDelete',
				description: 'Like delete, but this costs only up to two requests per 100 objects. Requires continueOnFail',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
	{
		displayName: 'Custom Object Type',
		name: 'customObjectType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['customObject'],
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Properties',
				name: 'customPropertiesUi',
				placeholder: 'Add Property',
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
									loadOptionsMethod: 'getCustomObjectProperties',
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
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                              customObject:update                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID property',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectIdProperties',
		},
		required: false,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The property that will be used as the ID. The property has to have "hasUniqueValue" set to true.',
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
		description: 'The value of the idProperty of the object. If idProperty is not set, this defaults to the hubspot object id.',
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
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Properties',
				name: 'customPropertiesUi',
				placeholder: 'Add Property',
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
									loadOptionsMethod: 'getCustomObjectProperties',
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
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                              customObject:upsert                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID property',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectIdProperties',
		},
		required: false,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['upsert'],
			},
		},
		default: '',
		description: 'The property that will be used as the ID. The property has to have "hasUniqueValue" set to true.',
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
		description: 'The value of the idProperty of the object. If idProperty is not set, this defaults to the hubspot object id.',
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
				operation: ['upsert'],
			},
		},
		options: [
			{
				displayName: 'Properties',
				name: 'customPropertiesUi',
				placeholder: 'Add Property',
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
									loadOptionsMethod: 'getCustomObjectProperties',
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
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                             customObject:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID property',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectIdProperties',
		},
		required: false,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The property that will be used as the ID. The property has to have "hasUniqueValue" set to true.',
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
		description: 'The value of the idProperty of the object. If idProperty is not set, this defaults to the hubspot object id.',
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
				displayName: 'Properties',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: '',
				description: `A list of the properties to be returned in the response. `,
			},
			{
				displayName: 'Properties with history',
				name: 'propertiesWithHistory',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: '',
				description: `A list of the properties to be returned along with their history of previous values.`,
			},
			// {
			//     displayName: 'Associations',
			//     name: 'associations',
			//     type: 'multiOptions',
			//     typeOptions: {
			//         loadOptionsMethod: 'getCustomObjectAssociations',
			//     },
			//     default: '',
			//     description: `A list of object types to retrieve associated IDs for.`,
			// },
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: false,
				description: `Whether to return only results that have been archived.`,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                          customObject:batchGet                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID property',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectIdProperties',
		},
		required: false,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['batchGet'],
			},
		},
		default: '',
		description: 'The property that will be used as the ID. The property has to have "hasUniqueValue" set to true.',
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
		description: 'The value of the idProperty of the object. If idProperty is not set, this defaults to the hubspot object id.',
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
				displayName: 'Properties',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: '',
				description: `A list of the properties to be returned in the response. `,
			},
			{
				displayName: 'Properties with history',
				name: 'propertiesWithHistory',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: '',
				description: `A list of the properties to be returned along with their history of previous values.`,
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
		description: 'If all results should be returned or only up to a given limit.',
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
		default: 100,
		description: 'How many results to return.',
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
				displayName: 'Properties',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: '',
				description: `A list of the properties to be returned in the response. `,
			},
			{
				displayName: 'Filter Groups',
				name: 'filterGroups',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Filter Group',
				typeOptions: {
					multipleValues: true,
				},
				required: false,
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
														name: 'Between',
														value: 'BETWEEN',
													},
													{
														name: 'In a set',
														value: 'IN',
													},
													{
														name: `Not in a set`,
														value: 'NOT_IN',
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
												displayName: 'Low value',
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
												displayName: 'High value',
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
												default: [],
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
				displayName: 'Sort',
				name: 'sortBy',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: '',
				description: `Sort the results ascending by this property`,
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: `Search all searchable properties for this string`,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                              customObject:delete                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID property',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCustomObjectIdProperties',
		},
		required: false,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['delete', 'batchDelete'],
			},
		},
		default: '',
		description: 'The property that will be used as the ID. The property has to have "hasUniqueValue" set to true.',
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
		description: 'The value of the idProperty of the object. If idProperty is not set, this defaults to the hubspot object id.',
	},
	//*-------------------------------------------------------------------------- */
	/*                               customObject:search                          */
	/* -------------------------------------------------------------------------- */
	// {
	//     displayName: 'Get All',
	//     name: 'returnAll',
	//     type: 'boolean',
	//     displayOptions: {
	//         show: {
	//             resource: ['customObject'],
	//             operation: ['search'],
	//         },
	//     },
	//     default: false,
	//     description: 'If all results should be returned or only up to a given limit.',
	// },
	// {
	//     displayName: 'Limit',
	//     name: 'limit',
	//     type: 'number',
	//     displayOptions: {
	//         show: {
	//             resource: ['customObject'],
	//             operation: ['search'],
	//             returnAll: [false],
	//         },
	//     },
	//     typeOptions: {
	//         minValue: 1,
	//         maxValue: 250,
	//     },
	//     default: 100,
	//     description: 'How many results to return.',
	// },
];
