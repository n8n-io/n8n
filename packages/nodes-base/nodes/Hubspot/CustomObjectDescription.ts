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
			// {
			// 	name: 'Create/Update',
			// 	value: 'upsert',
			// 	description: 'Get all custom Objects',
			// },
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
				name: 'Update',
				value: 'update',
				description: '(Partially) Update a custom Object',
			},
			// {
			//     name: 'Search',
			//     value: 'search',
			//     description: 'Search custom Objects',
			// },
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
				operation: ['delete'],
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
				operation: ['delete'],
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
