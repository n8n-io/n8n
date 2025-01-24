import type { INodeProperties } from 'n8n-workflow';

export const itemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an item',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls/{{ $parameter["collId"] }}/item',
					},
				},
				action: 'Create item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'DELETE',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls/{{ $parameter["collId"] }}/item/{{ $parameter["id"] }}',
					},
				},
				action: 'Delete item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an item',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls/{{ $parameter["collId"] }}/item/{{ $parameter["id"] }}',
					},
				},
				action: 'Get item',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of items',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls/{{ $parameter["collId"] }}/docs',
					},
				},
				action: 'Get many items',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Query items',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls/{{ $parameter["collId"] }}/item',
					},
				},
				action: 'Query items',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an item',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'PATCH',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls/{{ $parameter["collId"] }}/item/{{ $parameter["id"] }}',
					},
				},
				action: 'Create item',
			},
		],
		default: 'getAll',
	},
];

export const createFields: INodeProperties[] = [
	{
		displayName: 'Database ID',
		name: 'dbId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the database you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'databaseName',
				type: 'string',
				hint: 'Enter the database name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The database name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersDB',
			},
		],
	},
	{
		displayName: 'Collection ID',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the collection you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCollections',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'collectionName',
				type: 'string',
				hint: 'Enter the collection name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The collection name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersCollection',
			},
		],
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'e.g. AndersenFamily',
		description: "Item's ID",
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'id',
				value: '={{$value}}',
			},
		},
	},
	{
		displayName: 'Custom Properties',
		name: 'customProperties',
		type: 'json',
		default: '{}',
		placeholder: '{ "LastName": "Andersen", "Address": { "State": "WA", "City": "Seattle" } }',
		description: 'User-defined JSON object representing the document properties',
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
		//TO-DO-presend-function
		// routing: {
		// 	send: {
		// 		type: 'body',
		// 		property: 'custom_properties',
		// 		value: '={{JSON.parse($value)}}',
		// 	},
		// },
	},
];

export const deleteFields: INodeProperties[] = [
	{
		displayName: 'Database ID',
		name: 'dbId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the database you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'databaseName',
				type: 'string',
				hint: 'Enter the database name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The database name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersDB',
			},
		],
	},
	{
		displayName: 'Collection ID',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the collection you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCollections',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'collectionName',
				type: 'string',
				hint: 'Enter the collection name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The collection name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersCollection',
			},
		],
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'e.g. AndersenFamily',
		description: 'Unique ID for the item',
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['delete'],
			},
		},
	},
];

export const getFields: INodeProperties[] = [
	{
		displayName: 'Database ID',
		name: 'dbId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the database you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'databaseName',
				type: 'string',
				hint: 'Enter the database name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The database name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersDB',
			},
		],
	},
	{
		displayName: 'Collection ID',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the collection you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCollections',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'collectionName',
				type: 'string',
				hint: 'Enter the collection name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The collection name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersCollection',
			},
		],
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'e.g. AndersenFamily',
		description: "Item's ID",
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'id',
				value: '={{$value}}',
			},
		},
	},
];

export const getAllFields: INodeProperties[] = [
	{
		displayName: 'Database ID',
		name: 'dbId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the database you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'databaseName',
				type: 'string',
				hint: 'Enter the database name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The database name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersDB',
			},
		],
	},
	{
		displayName: 'Collection ID',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the collection you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCollections',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'collectionName',
				type: 'string',
				hint: 'Enter the collection name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The collection name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersCollection',
			},
		],
	},
];

//TO-DO-check-fields
export const queryFields: INodeProperties[] = [
	{
		displayName: 'Database ID',
		name: 'dbId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the database you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['query'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'databaseName',
				type: 'string',
				hint: 'Enter the database name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The database name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersDB',
			},
		],
	},
	{
		displayName: 'Collection ID',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the collection you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['query'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCollections',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'collectionName',
				type: 'string',
				hint: 'Enter the collection name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The collection name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersCollection',
			},
		],
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'e.g. AndersenFamily',
		description: "Item's ID",
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['query'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'id',
				value: '={{$value}}',
			},
		},
	},
];

export const updateFields: INodeProperties[] = [
	{
		displayName: 'Database ID',
		name: 'dbId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the database you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['update'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'databaseName',
				type: 'string',
				hint: 'Enter the database name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The database name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersDB',
			},
		],
	},
	{
		displayName: 'Collection ID',
		name: 'collId',
		type: 'resourceLocator',
		required: true,
		default: {
			mode: 'list',
			value: '',
		},
		description: 'Select the collection you want to use',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['update'],
			},
		},
		modes: [
			{
				displayName: 'From list',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCollections',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'collectionName',
				type: 'string',
				hint: 'Enter the collection name',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[\\w+=,.@-]+$',
							errorMessage: 'The collection name must follow the allowed pattern.',
						},
					},
				],
				placeholder: 'e.g. UsersCollection',
			},
		],
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'e.g. AndersenFamily',
		description: 'Unique ID for the document',
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Operations',
		name: 'operations',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		required: true,
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getMappingColumns',
				mode: 'update',
				fieldWords: {
					singular: 'operation',
					plural: 'operations',
				},
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: true,
				matchingFieldsLabels: {
					title: 'Custom Matching Operations',
					description: 'Define the operations to perform, such as "set", "delete", or "add".',
					hint: 'Map input data to the expected structure of the operations array.',
				},
			},
		},
		description: 'Define the operations to perform, such as setting or updating document fields',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['update'],
			},
		},
	},
	//TO-DO-presend-function
];

export const itemFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
	...queryFields,
	...updateFields,
];
