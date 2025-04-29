import type { INodeProperties } from 'n8n-workflow';

export const ragOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['rag'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new RAG instance',
				action: 'Create a new RAG instance',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a RAG instance',
				action: 'Delete a RAG instance',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get RAG details',
				action: 'Get RAG details',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all RAG instances',
				action: 'Get all RAG instances',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Query a RAG instance',
				action: 'Query a RAG instance',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a RAG instance',
				action: 'Update a RAG instance',
			},
		],
		default: 'create',
	},
];

export const ragFields: INodeProperties[] = [
	// Fields for Create operation
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rag'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the RAG instance',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rag'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Description of the RAG instance',
	},
	{
		displayName: 'Files',
		name: 'files',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rag'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'Files to process (max 4 files, max 25MB each). Supported formats: pdf, docx, pptx, txt, xlsx, mp3, mp4, html, csv, json, py, php, js, css, cs, swift, kt, xml, ts',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['rag'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Chunking Method',
				name: 'chunking_method',
				type: 'options',
				options: [
					{
						name: 'Fixed Size',
						value: 'fixed_size',
						description: 'Good for not so elaborated text',
					},
					{
						name: 'Recursive',
						value: 'recursive',
						description: 'Good for not so elaborated text',
					},
					{
						name: 'Markdown',
						value: 'markdown',
						description: 'Only suitable for files with Markdown',
					},
					{
						name: 'Python',
						value: 'python',
						description: 'Only suitable for Python files',
					},
					{
						name: 'Semantic',
						value: 'semantic',
						description: 'Very slow but good for significantly elaborated texts',
					},
				],
				default: 'fixed_size',
				description: 'Method to use for chunking the text',
			},
			{
				displayName: 'Chunk Size',
				name: 'chunk_size',
				type: 'number',
				displayOptions: {
					show: {
						'/additionalFields.chunking_method': ['fixed_size', 'recursive', 'markdown', 'python'],
					},
				},
				default: 1000,
				description: 'Size of each chunk',
			},
			{
				displayName: 'Chunk Overlap',
				name: 'chunk_overlap',
				type: 'number',
				displayOptions: {
					show: {
						'/additionalFields.chunking_method': ['fixed_size', 'recursive', 'markdown', 'python'],
					},
				},
				default: 50,
				description: 'Number of overlapping tokens between chunks',
			},
			{
				displayName: 'Separator',
				name: 'separator',
				type: 'string',
				displayOptions: {
					show: {
						'/additionalFields.chunking_method': ['fixed_size'],
					},
				},
				default: '\\n',
				description: 'Separator to use for fixed size chunking',
			},
			{
				displayName: 'Separators',
				name: 'separators',
				type: 'string',
				displayOptions: {
					show: {
						'/additionalFields.chunking_method': ['recursive'],
					},
				},
				default: '["\\n\\n", "\\n", " ", ""]',
				description: 'JSON array of separators to use for recursive chunking',
			},
			{
				displayName: 'Breakpoint Threshold Type',
				name: 'breakpoint_threshold_type',
				type: 'options',
				displayOptions: {
					show: {
						'/additionalFields.chunking_method': ['semantic'],
					},
				},
				options: [
					{
						name: 'Percentile',
						value: 'percentile',
					},
					{
						name: 'Interquartile',
						value: 'interquartile',
					},
					{
						name: 'Standard Deviation',
						value: 'standard_deviation',
					},
					{
						name: 'Gradient',
						value: 'gradient',
					},
				],
				default: 'percentile',
				description: 'Type of threshold to use for semantic chunking',
			},
			{
				displayName: 'Buffer Size',
				name: 'buffer_size',
				type: 'number',
				displayOptions: {
					show: {
						'/additionalFields.chunking_method': ['semantic'],
					},
				},
				default: 100,
				description: 'Buffer size for semantic chunking',
			},
		],
	},
	// Fields for Delete, Get, Update, Query operations
	{
		displayName: 'RAG ID',
		name: 'ragId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rag'],
				operation: ['delete', 'get', 'update', 'query'],
			},
		},
		default: '',
		description: 'ID of the RAG instance',
	},
	// Fields for Query operation
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rag'],
				operation: ['query'],
			},
		},
		default: '',
		description: 'Message to query the RAG instance',
	},
	{
		displayName: 'Model',
		name: 'model',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['rag'],
				operation: ['query'],
			},
		},
		default: '',
		description: 'Model to use for the query',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'collection',
		placeholder: 'Add Parameter',
		default: {},
		displayOptions: {
			show: {
				resource: ['rag'],
				operation: ['query'],
			},
		},
		options: [
			{
				displayName: 'Search Type',
				name: 'search_type',
				type: 'options',
				options: [
					{
						name: 'Similarity',
						value: 'similarity',
					},
					{
						name: 'MMR',
						value: 'mmr',
					},
					{
						name: 'Similarity Score Threshold',
						value: 'similarity_score_threshold',
					},
				],
				default: 'similarity',
				description: 'Type of search to perform',
			},
			{
				displayName: 'Number of Documents (K)',
				name: 'k',
				type: 'number',
				default: 4,
				description: 'Number of documents to return',
			},
			{
				displayName: 'Fetch K (MMR)',
				name: 'fetch_k',
				type: 'number',
				default: 20,
				description: 'Amount of documents to pass to MMR algorithm',
			},
			{
				displayName: 'Lambda Mult (MMR)',
				name: 'lambda_mult',
				type: 'number',
				default: 0.5,
				description: 'Diversity of results (1 for minimum, 0 for maximum)',
			},
			{
				displayName: 'Score Threshold',
				name: 'score_threshold',
				type: 'number',
				default: 0.8,
				description: 'Minimum relevance threshold for similarity_score_threshold',
			},
		],
	},
];
