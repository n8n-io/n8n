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
				description: 'Create a new RAG base',
				action: 'Create a new RAG base',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a RAG base',
				action: 'Delete a RAG base',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get RAG base details',
				action: 'Get RAG base details',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all RAG bases',
				action: 'List all RAG bases',
			},
			{
				name: 'Prompt',
				value: 'prompt',
				description: 'Send a prompt to a RAG base',
				action: 'Send a prompt to a RAG base',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a RAG base',
				action: 'Update a RAG base',
			},
		],
		default: 'list',
	},
];

export const ragFields: INodeProperties[] = [
	{
		displayName: 'RAG ID',
		name: 'ragId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete', 'get', 'prompt', 'update'],
				resource: ['rag'],
			},
		},
		default: '',
		description: 'The unique identifier of the RAG base',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['rag'],
			},
		},
		default: '',
		description: 'Name of the RAG base',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['rag'],
			},
		},
		default: '',
		description: 'Description of the RAG base',
	},
	{
		displayName: 'Files',
		name: 'files',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['rag'],
			},
		},
		default: '',
		description: 'Files to process (up to 4 files). Supported types: pdf, docx, csv, txt, xlsx, py',
	},
	{
		displayName: 'Chunking Method',
		name: 'chunking_method',
		type: 'options',
		required: false,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['rag'],
			},
		},
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
		required: false,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['rag'],
				chunking_method: ['fixed_size', 'recursive', 'markdown', 'python'],
			},
		},
		default: 1000,
		description: 'Size of each chunk',
	},
	{
		displayName: 'Chunk Overlap',
		name: 'chunk_overlap',
		type: 'number',
		required: false,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['rag'],
				chunking_method: ['fixed_size', 'recursive', 'markdown', 'python'],
			},
		},
		default: 50,
		description: 'Number of overlapping tokens between chunks',
	},
	{
		displayName: 'Separator',
		name: 'separator',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['rag'],
				chunking_method: ['fixed_size'],
			},
		},
		default: '\\n',
		description: 'Separator to use for fixed size chunking',
	},
	{
		displayName: 'Separators',
		name: 'separators',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['rag'],
				chunking_method: ['recursive'],
			},
		},
		default: '["\\n\\n", "\\n", " ", ""]',
		description: 'JSON array of separators to use for recursive chunking',
	},
	{
		displayName: 'Breakpoint Threshold Type',
		name: 'breakpoint_threshold_type',
		type: 'options',
		required: false,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['rag'],
				chunking_method: ['semantic'],
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
		required: false,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['rag'],
				chunking_method: ['semantic'],
			},
		},
		default: 100,
		description: 'Buffer size for semantic chunking',
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['prompt'],
				resource: ['rag'],
			},
		},
		default: '',
		description: 'The prompt text for the RAG model',
	},
	{
		displayName: 'Model',
		name: 'model',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['prompt'],
				resource: ['rag'],
			},
		},
		default: '',
		description: 'The specific LLM to be used',
	},
	{
		displayName: 'Search Type',
		name: 'search_type',
		type: 'options',
		required: false,
		displayOptions: {
			show: {
				operation: ['prompt'],
				resource: ['rag'],
			},
		},
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
		displayName: 'Number of Documents',
		name: 'k',
		type: 'number',
		required: false,
		displayOptions: {
			show: {
				operation: ['prompt'],
				resource: ['rag'],
			},
		},
		default: 4,
		description: 'Number of documents to return',
	},
	{
		displayName: 'Fetch K',
		name: 'fetch_k',
		type: 'number',
		required: false,
		displayOptions: {
			show: {
				operation: ['prompt'],
				resource: ['rag'],
				search_type: ['mmr'],
			},
		},
		default: 20,
		description: 'Amount of documents to pass to MMR algorithm',
	},
	{
		displayName: 'Lambda Mult',
		name: 'lambda_mult',
		type: 'number',
		required: false,
		displayOptions: {
			show: {
				operation: ['prompt'],
				resource: ['rag'],
				search_type: ['mmr'],
			},
		},
		typeOptions: {
			minValue: 0,
			maxValue: 1,
		},
		default: 0.5,
		description: 'Diversity of results (0 for maximum diversity, 1 for minimum)',
	},
	{
		displayName: 'Score Threshold',
		name: 'score_threshold',
		type: 'number',
		required: false,
		displayOptions: {
			show: {
				operation: ['prompt'],
				resource: ['rag'],
				search_type: ['similarity_score_threshold'],
			},
		},
		default: 0.8,
		description: 'Minimum relevance threshold',
	},
];
