import {
	INodeProperties,
} from 'n8n-workflow';

export const documentOperations = [
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
				description: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
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
			{
				name: 'Update',
				value: 'update',
				description: 'Update a document',
			},
		],
		default: 'get',
		description: 'The operation to perform.'
	}
] as INodeProperties[];

export const documentFields = [
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
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCollections',
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
		description: 'Collection name',
		required: true,
	},
	{
		displayName: 'Document data',
		name: 'documentData',
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
		description: 'Document data in firebase format',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		placeholder: '{"fields": {"name": {"stringValue": "John Doe"}, "age": {"integerValue": 34}, "hobbies": {"arrayValue": {"values": [{"stringValue": "Board Games"}]}}}}',
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
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCollections',
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
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCollections',
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
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCollections',
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
	/* -------------------------------------------------------------------------- */
	/*                              document:update                               */
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
					'update',
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
					'update',
				],
			},
		},
		description: 'Usually the provided default value will work',
		required: true,
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCollections',
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
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
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'Document ID',
		required: true,
	},
	{
		displayName: 'Document data',
		name: 'documentData',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'New data that overrides any previous data.',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		placeholder: '{"fields": {"name": {"stringValue": "John Doe"}, "age": {"integerValue": 34}, "hobbies": {"arrayValue": {"values": [{"stringValue": "Board Games"}]}}}}',
	},
	
] as INodeProperties[];
