import {
	INodeProperties,
} from 'n8n-workflow';

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a document',
			},
			{
				name: 'Create/Update',
				value: 'upsert',
				description: 'Create/Update a document',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a document',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a document',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all documents from a collection',
			},
			// {
			// 	name: 'Update',
			// 	value: 'update',
			// 	description: 'Update a document',
			// },
			{
				name: 'Query',
				value: 'query',
				description: 'Runs a query against your documents',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const documentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                document:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'As displayed in firebase console URL.',
		required: true,
	},
	{
		displayName: 'Database',
		name: 'database',
		type: 'string',
		default: '(default)',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Usually the provided default value will work',
		required: true,
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Collection name',
		required: true,
	},
	{
		displayName: 'Columns / attributes',
		name: 'columns',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'List of attributes to save',
		required: true,
		placeholder: 'productId, modelName, description',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'document',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                document:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'As displayed in firebase console URL',
		required: true,
	},
	{
		displayName: 'Database',
		name: 'database',
		type: 'string',
		default: '(default)',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Usually the provided default value will work',
		required: true,
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Collection name',
		required: true,
	},
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'document',
				],
			},
		},
		default: '',
		description: 'Document ID',
		required: true,
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'document',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},

	/* -------------------------------------------------------------------------- */
	/*                              document:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'As displayed in firebase console URL',
		required: true,
	},
	{
		displayName: 'Database',
		name: 'database',
		type: 'string',
		default: '(default)',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Usually the provided default value will work',
		required: true,
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Collection name',
		required: true,
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'If all results should be returned or only up to a given limit.',
		required: true,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'document',
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
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'document',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},

	/* -------------------------------------------------------------------------- */
	/*                              document:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'As displayed in firebase console URL',
		required: true,
	},
	{
		displayName: 'Database',
		name: 'database',
		type: 'string',
		default: '(default)',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Usually the provided default value will work',
		required: true,
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Collection name',
		required: true,
	},
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'document',
				],
			},
		},
		default: '',
		description: 'Document ID',
		required: true,
	},
	// 	/* ---------------------------------------------------------------------- */
	// /*                              document:update                               */
	// /* -------------------------------------------------------------------------- */
	// {
	// 	displayName: 'Project ID',
	// 	name: 'projectId',
	// 	type: 'options',
	// 	default: '',
	// 	typeOptions: {
	// 		loadOptionsMethod: 'getProjects',
	// 	},
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'document',
	// 			],
	// 			operation: [
	// 				'update',
	// 			],
	// 		},
	// 	},
	// 	description: 'As displayed in firebase console URL',
	// 	required: true,
	// },
	// {
	// 	displayName: 'Database',
	// 	name: 'database',
	// 	type: 'string',
	// 	default: '(default)',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'document',
	// 			],
	// 			operation: [
	// 				'update',
	// 			],
	// 		},
	// 	},
	// 	description: 'Usually the provided default value will work',
	// 	required: true,
	// },
	// {
	// 	displayName: 'Collection',
	// 	name: 'collection',
	// 	type: 'string',
	// 	default: '',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'document',
	// 			],
	// 			operation: [
	// 				'update',
	// 			],
	// 		},
	// 	},
	// 	description: 'Collection name',
	// 	required: true,
	// },
	// {
	// 	displayName: 'Update Key',
	// 	name: 'updateKey',
	// 	type: 'string',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'document',
	// 			],
	// 			operation: [
	// 				'update',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	description: 'Must correspond to a document ID',
	// 	required: true,
	// 	placeholder: 'documentId',
	// },
	// {
	// 	displayName: 'Columns /Attributes',
	// 	name: 'columns',
	// 	type: 'string',
	// 	default: '',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'document',
	// 			],
	// 			operation: [
	// 				'update',
	// 			],
	// 		},
	// 	},
	// 	description: 'Columns to insert',
	// 	required: true,
	// 	placeholder: 'age, city, location',
	// },
	// {
	// 	displayName: 'Simple',
	// 	name: 'simple',
	// 	type: 'boolean',
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'update',
	// 			],
	// 			resource: [
	// 				'document',
	// 			],
	// 		},
	// 	},
	// 	default: true,
	// 	description: 'When set to true a simplify version of the response will be used else the raw data.',
	// },
	/* -------------------------------------------------------------------------- */
	/*                              document:upsert                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'upsert',
				],
			},
		},
		description: 'As displayed in firebase console URL',
		required: true,
	},
	{
		displayName: 'Database',
		name: 'database',
		type: 'string',
		default: '(default)',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'upsert',
				],
			},
		},
		description: 'Usually the provided default value will work',
		required: true,
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'upsert',
				],
			},
		},
		description: 'Collection name',
		required: true,
	},
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'upsert',
				],
			},
		},
		default: '',
		description: 'Must correspond to a document ID',
		required: true,
		placeholder: 'documentId',
	},
	{
		displayName: 'Columns /Attributes',
		name: 'columns',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'upsert',
				],
			},
		},
		description: 'Columns to insert',
		required: true,
		placeholder: 'age, city, location',
	},
	/* -------------------------------------------------------------------------- */
	/*                              document:query                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'query',
				],
			},
		},
		description: 'As displayed in firebase console URL',
		required: true,
	},
	{
		displayName: 'Database',
		name: 'database',
		type: 'string',
		default: '(default)',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'query',
				],
			},
		},
		description: 'Usually the provided default value will work',
		required: true,
	},
	{
		displayName: 'Query JSON',
		name: 'query',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'query',
				],
			},
		},
		description: 'JSON query to execute',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		placeholder: '{"structuredQuery": {"where": {"fieldFilter": {"field": {"fieldPath": "age"},"op": "EQUAL", "value": {"integerValue": 28}}}, "from": [{"collectionId": "users-collection"}]}}',
	},
	{
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'query',
				],
				resource: [
					'document',
				],
			},
		},
		default: true,
		description: 'Return a simplified version of the response instead of the raw data.',
	},
];
