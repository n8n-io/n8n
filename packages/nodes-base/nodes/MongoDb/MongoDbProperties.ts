import type { INodeProperties } from 'n8n-workflow';

export const nodeProperties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Search Index',
				value: 'searchIndexes',
			},
			{
				name: 'Document',
				value: 'document',
			},
		],
		default: 'document',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['document'],
			},
		},
		options: [
			{
				name: 'Aggregate',
				value: 'aggregate',
				description: 'Aggregate documents',
				action: 'Aggregate documents',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete documents',
				action: 'Delete documents',
			},
			{
				name: 'Find',
				value: 'find',
				description: 'Find documents',
				action: 'Find documents',
			},
			{
				name: 'Find And Replace',
				value: 'findOneAndReplace',
				description: 'Find and replace documents',
				action: 'Find and replace documents',
			},
			{
				name: 'Find And Update',
				value: 'findOneAndUpdate',
				description: 'Find and update documents',
				action: 'Find and update documents',
			},
			{
				name: 'Insert',
				value: 'insert',
				description: 'Insert documents',
				action: 'Insert documents',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update documents',
				action: 'Update documents',
			},
		],
		default: 'find',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['searchIndexes'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'createSearchIndex',
				action: 'Create Search Index',
			},
			{
				name: 'Drop',
				value: 'dropSearchIndex',
				action: 'Drop Search Index',
			},
			{
				name: 'List',
				value: 'listSearchIndexes',
				action: 'List Search Indexes',
			},
			{
				name: 'Update',
				value: 'updateSearchIndex',
				action: 'Update Search Index',
			},
		],
		default: 'createSearchIndex',
	},
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		required: true,
		default: '',
		description: 'MongoDB Collection',
	},

	// ----------------------------------
	//         aggregate
	// ----------------------------------
	{
		displayName: 'Query',
		name: 'query',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				operation: ['aggregate'],
				resource: ['document'],
			},
		},
		default: '',
		placeholder: '[{ "$match": { "name": "$1", "age": { "$gte": "$2" } } }]',
		hint: 'Use query parameters for dynamic values instead of embedding expressions in the query. <a href="https://docs.mongodb.com/manual/core/aggregation-pipeline/" target="_blank">Learn more about aggregation pipelines</a>.',
		required: true,
		description:
			'MongoDB aggregation pipeline in JSON format. Use $1, $2, and so on as complete values to reference Query Parameters below.',
	},

	// ----------------------------------
	//         delete
	// ----------------------------------
	{
		displayName: 'Delete Query (JSON Format)',
		name: 'query',
		type: 'json',
		typeOptions: {
			rows: 5,
		},
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['document'],
			},
		},
		default: '{}',
		placeholder: '{ "name": "$1", "age": "$2" }',
		hint: 'Use query parameters for dynamic values instead of embedding expressions in the query',
		required: true,
		description:
			'MongoDB delete query in JSON format. Use $1, $2, and so on as complete values to reference Query Parameters below.',
	},

	// ----------------------------------
	//         find
	// ----------------------------------
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['find'],
				resource: ['document'],
			},
		},
		default: {},
		placeholder: 'Add option',
		description: 'Add query options',
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 0,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-limit
				description:
					'Use limit to specify the maximum number of documents or 0 for unlimited documents',
			},
			{
				displayName: 'Skip',
				name: 'skip',
				type: 'number',
				default: 0,
				description: 'The number of documents to skip in the results set',
			},
			{
				displayName: 'Sort (JSON Format)',
				name: 'sort',
				type: 'json',
				typeOptions: {
					rows: 2,
				},
				default: '{}',
				placeholder: '{ "field": -1 }',
				description: 'A JSON that defines the sort order of the result set',
			},
			{
				displayName: 'Projection (JSON Format)',
				name: 'projection',
				type: 'json',
				typeOptions: {
					rows: 4,
				},
				default: '{}',
				placeholder: '{ "_id": 0, "field": 1 }',
				description:
					'A JSON that defines a selection of fields to retrieve or exclude from the result set',
			},
		],
	},
	{
		displayName: 'Query (JSON Format)',
		name: 'query',
		type: 'json',
		typeOptions: {
			rows: 5,
		},
		displayOptions: {
			show: {
				operation: ['find'],
				resource: ['document'],
			},
		},
		default: '{}',
		placeholder: '{ "name": "$1", "age": "$2" }',
		hint: 'Use query parameters for dynamic values instead of embedding expressions in the query',
		required: true,
		description:
			'MongoDB find query in JSON format. Use $1, $2, and so on as complete values to reference Query Parameters below.',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'json',
		typeOptions: {
			rows: 2,
		},
		displayOptions: {
			show: {
				operation: ['aggregate', 'delete', 'find'],
				resource: ['document'],
			},
		},
		default: '[]',
		placeholder: '["value1", 123, true, null]',
		validateType: 'array',
		description:
			'JSON array of values to use for $1, $2, and so on, in order. Values can be strings, numbers, booleans, null, or arrays of these values. You can also use an expression that returns an array.',
		hint: 'For example, ["Alice", 30] replaces $1 with "Alice" and $2 with 30',
	},

	// ----------------------------------
	//         insert
	// ----------------------------------
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['insert'],
				resource: ['document'],
			},
		},
		default: '',
		placeholder: 'name,description',
		description: 'Comma-separated list of the fields to be included into the new document',
	},

	// ----------------------------------
	//         update
	// ----------------------------------
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update', 'findOneAndReplace', 'findOneAndUpdate'],
				resource: ['document'],
			},
		},
		default: 'id',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Name of the property which decides which rows in the database should be updated. Normally that would be "id".',
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update', 'findOneAndReplace', 'findOneAndUpdate'],
				resource: ['document'],
			},
		},
		default: '',
		placeholder: 'name,description',
		description: 'Comma-separated list of the fields to be included into the new document',
	},
	{
		displayName: 'Upsert',
		name: 'upsert',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['update', 'findOneAndReplace', 'findOneAndUpdate'],
				resource: ['document'],
			},
		},
		default: false,
		description: 'Whether to perform an insert if no documents match the update key',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['update', 'insert', 'findOneAndReplace', 'findOneAndUpdate'],
				resource: ['document'],
			},
		},
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Date Fields',
				name: 'dateFields',
				type: 'string',
				default: '',
				description: 'Comma-separated list of fields that will be parsed as Mongo Date type',
			},
			{
				displayName: 'Use Dot Notation',
				name: 'useDotNotation',
				type: 'boolean',
				default: false,
				description: 'Whether to use dot notation to access date fields',
			},
		],
	},
	{
		displayName: 'Index Name',
		name: 'indexName',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['listSearchIndexes'],
				resource: ['searchIndexes'],
			},
		},
		default: '',
		description: 'If provided, only lists indexes with the specified name',
	},
	{
		displayName: 'Index Name',
		name: 'indexNameRequired',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['createSearchIndex', 'dropSearchIndex', 'updateSearchIndex'],
				resource: ['searchIndexes'],
			},
		},
		default: '',
		required: true,
		description: 'The name of the search index',
	},
	{
		displayName: 'Index Definition',
		name: 'indexDefinition',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['createSearchIndex', 'updateSearchIndex'],
				resource: ['searchIndexes'],
			},
		},
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		placeholder: '{ "type": "vectorSearch", "definition": {} }',
		hint: 'Learn more about search index definitions <a href="https://www.mongodb.com/docs/atlas/atlas-search/index-definitions/">here</a>',
		default: '{}',
		required: true,
		description: 'The search index definition',
	},
	{
		displayName: 'Index Type',
		name: 'indexType',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['createSearchIndex'],
				resource: ['searchIndexes'],
			},
		},
		options: [
			{
				value: 'vectorSearch',
				name: 'Vector Search',
			},
			{
				name: 'Search',
				value: 'search',
			},
		],
		default: 'vectorSearch',
		required: true,
		description: 'The search index index type',
	},
];
