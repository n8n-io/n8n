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
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a custom Object',
			},
			{
				name: 'Define',
				value: 'define',
				description: 'Define new schema for a custom Object',
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
				description: 'Update a custom Object',
			},
			{
				name: 'Batched Get',
				value: 'batchGet',
				description: 'Like get, but this has fewer options and costs only one request per 100 objects. Requires continueOnFail.',
			},
			{
				name: 'Batched Delete',
				value: 'batchDelete',
				description: 'Like delete, but this costs only up to two requests per 100 objects. Requires continueOnFail.',
			},
			{
				name: 'Batched Create/Update',
				value: 'batchUpsert',
				description: 'Like upsert, but this costs only up to three requests per 100 objects. Requires continueOnFail.',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Custom Object Type',
		name: 'objectType',
		type: 'options',
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
				default: [],
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
									loadOptionsDependsOn: ['objectType'],
									loadOptionsMethod: 'getCustomObjectProperties',
								},
								default: '',
								description: 'Name of the property',
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
	/*                              customObject:define                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'A unique name for this object. For internal use only.',
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['define'],
			},
		},
	},
	{
		displayName: 'Primary Display Property',
		name: 'primaryDisplayProperty',
		type: 'string',
		default: '',
		hint: 'Property with such name must be defined in properties',
		required: true,
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['define'],
			},
		},
	},
	{
		displayName: 'Labels',
		name: 'labels',
		default: {},
		type: 'fixedCollection',
		placeholder: 'Add Labels',
		required: true,
		typeOptions: {
			multipleValues: false,

		},
		options: [
			{
				displayName: 'Labels',
				name: 'labels',
				values: [
					{
						displayName: 'Singular',
						name: 'singular',
						type: 'string',
						default: '',
						required: true,
					},
					{
						displayName: 'Plural',
						name: 'plural',
						type: 'string',
						default: '',
						required: true,
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['define'],
			},
		},
	},
	{
		displayName: 'Properties',
		name: 'properties',
		default: [],
		type: 'fixedCollection',
		required: true,
		placeholder: 'Add Property',
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Properties',
				name: 'values',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						required: true,
						description: 'The internal property name, which must be used when referencing the property from the API',
					},
					{
						displayName: 'Label',
						name: 'label',
						type: 'string',
						default: '',
						required: true,
						description: 'A human-readable property label that will be shown in HubSpot',
					},
					{
						displayName: 'Options',
						name: 'options',
						type: 'collection',
						placeholder: 'Add Option',
						default: {},
						options: [
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'A description of the property that will be shown as help text in HubSpot',
							},
							{
								displayName: 'Display Order',
								name: 'displayOrder',
								type: 'number',
								default: 0,
								description: 'The order that this property should be displayed in the HubSpot UI',
							},
							{
								displayName: 'Group Name',
								name: 'groupName',
								type: 'string',
								default: '',
								description: 'The name of the group this property belongs to',
							},
							{
								displayName: 'Has Unique Value',
								name: 'hasUniqueValue',
								type: 'boolean',
								default: false,
								description: 'Whether or not the property\'s value must be unique',
							},
							{
								displayName: 'Hidden',
								name: 'hidden',
								type: 'boolean',
								default: false,
								description: 'Whether or not the property is hidden',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'string',
								description: 'The data type of the property',
								options: [
									{
										name: 'Boolean',
										value: 'bool',
									},
									{
										name: 'Date',
										value: 'date',
									},
									{
										name: 'Datetime',
										value: 'datetime',
									},
									{
										name: 'Enumeration',
										value: 'enumeration',
									},
									{
										name: 'Number',
										value: 'number',
									},
									{
										name: 'String',
										value: 'string',
									},
								],
							},
						],
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['define'],
			},
		},
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
				operation: ['define'],
			},
		},
		options: [
			{
				displayName: 'Associated Objects',
				name: 'associatedObjects',
				type: 'string',
				default: '',
				description: 'Associations defined for this object type',
				hint: 'Comma separeted values',
			},
			{
				displayName: 'Required Properties',
				name: 'requiredProperties',
				type: 'string',
				default: '',
				description: 'The names of properties that should be required when creating an object of this type',
				hint: 'Comma separeted values',
			},
			{
				displayName: 'Searchable Properties',
				name: 'searchableProperties',
				type: 'string',
				default: '',
				description: 'TNames of properties that will be indexed for this object type in by HubSpot\'s product search',
				hint: 'Comma separeted values',
			},
			{
				displayName: 'Secondary Display Properties',
				name: 'secondaryDisplayProperties',
				type: 'string',
				default: '',
				description: 'The names of secondary properties for this object. These will be displayed as secondary on the HubSpot record page for this object type.',
				hint: 'Comma separeted values',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                              customObject:update                           */
	/* -------------------------------------------------------------------------- */
	{
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
				operation: ['update'],
			},
		},
		required: true,
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
		description: 'The value of the ID Property of the object',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
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
				default: [],
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
									loadOptionsDependsOn: ['objectType'],
									loadOptionsMethod: 'getCustomObjectProperties',
								},
								default: '',
								description: 'Name of the property',
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
		displayName: 'ID Property',
		name: 'idProperty',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['objectType'],
			loadOptionsMethod: 'getCustomObjectIdProperties',
		},
		displayOptions: {
			show: {
				resource: ['customObject'],
				operation: ['upsert', 'batchUpsert'],
			},
		},
		required: true,
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
				operation: ['upsert', 'batchUpsert'],
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
				operation: ['upsert', 'batchUpsert'],
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
				default: [],
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
									loadOptionsDependsOn: ['objectType'],
									loadOptionsMethod: 'getCustomObjectProperties',
								},
								default: '',
								description: 'Name of the property',
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
				displayName: 'Properties',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: ['objectType'],
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: [],
				description: 'A list of the properties to be returned in the response',
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
				description: 'A list of the properties to be returned along with their history of previous values',
			},
			// {
			//     displayName: 'Associations',
			//     name: 'associations',
			//     type: 'multiOptions',
			//     typeOptions: {
			//         loadOptionsMethod: 'getCustomObjectAssociations',
			//		   loadOptionsDependsOn: ['objectType'],
			//     },
			//     default: '',
			//     description: 'A list of object types to retrieve associated IDs for.',
			// },
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: false,
				description: 'Whether to return only results that have been archived',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                          customObject:batchGet                             */
	/* -------------------------------------------------------------------------- */
	{
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
				displayName: 'Properties',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjectProperties',
					loadOptionsDependsOn: ['objectType'],
				},
				default: [],
				description: 'A list of the properties to be returned in the response',
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
				description: 'A list of the properties to be returned along with their history of previous values',
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
					loadOptionsDependsOn: ['objectType'],
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: [],
				description: 'A list of the properties to be returned in the response',
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
								default: [],
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
														name: 'In a Set',
														value: 'IN',
													},
													{
														name: 'Not In a Set',
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
														value: 'CONTAINS_TOKEN',
													},
													{
														name: 'Does Not Contain Exactly',
														value: 'NOT_CONTAINS_TOKEN',
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
												default: [],
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
				displayName: 'Sort',
				name: 'sortBy',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['objectType'],
					loadOptionsMethod: 'getCustomObjectProperties',
				},
				default: '',
				description: 'Sort the results ascending by this property',
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
		description: 'The value of the ID Property of the object',
	},
];
