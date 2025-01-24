import type { INodeProperties } from 'n8n-workflow';

export const containerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['container'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a container',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'POST',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls',
					},
				},
				action: 'Create container',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a container',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'DELETE',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls/{{ $parameter["collId"] }}',
					},
				},
				action: 'Delete container',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a container',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls/{{ $parameter["id"] }}',
					},
				},
				action: 'Get item',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of containers',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '=/dbs/{{ $parameter["dbId"] }}/colls',
					},
				},
				action: 'Get many containers',
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
				resource: ['container'],
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
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'e.g. AndersenFamily',
		description: "Container's ID",
		required: true,
		displayOptions: {
			show: {
				resource: ['container'],
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
		displayName: 'Partition Key',
		name: 'partitionKey',
		type: 'json',
		default: '{}',
		placeholder: '"paths": ["/AccountNumber"],"kind": "Hash", "Version": 2',
		description: 'User-defined JSON object representing the partition key',
		required: true,
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['create'],
			},
		},
		// TO-DO-presend-function
		// routing: {
		// 	send: {
		// 		type: 'body',
		// 		property: 'id',
		// 		value: '={{$value}}',
		// 	},
		// },
	},
	{
		displayName: 'Additional Keys',
		name: 'additionalKeys',
		type: 'fixedCollection',
		default: {},
		placeholder: '"paths": ["/AccountNumber"],"kind": "Hash", "Version": 2',
		description: 'User-defined JSON object representing the document properties',
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Indexing Policy',
				name: 'indexingPolicy',
				type: 'json',
				default: '{}',
				placeholder:
					'"automatic": true, "indexingMode": "Consistent", "includedPaths": [{ "path": "/*", "indexes": [{ "dataType": "String", "precision": -1, "kind": "Range" }]}]',
				description: 'This value is used to configure indexing policy',
				// TO-DO-presend-function
			},
		],
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
				resource: ['container'],
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
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'e.g. AndersenFamily',
		description: "Container's ID",
		required: true,
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['get'],
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
				resource: ['container'],
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
				resource: ['container'],
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
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		placeholder: 'e.g. AndersenFamily',
		description: 'Unique ID for the container',
		required: true,
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['delete'],
			},
		},
	},
];

export const containerFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
];
