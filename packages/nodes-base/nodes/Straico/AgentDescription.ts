// @ts-ignore
import type { INodeProperties } from 'n8n-workflow';

export const agentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['agent'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new agent',
				action: 'Create a new agent',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an agent',
				action: 'Delete an agent',
			},
			{
				name: 'Execute',
				value: 'execute',
				description: 'Execute an agent',
				action: 'Execute an agent',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get agent details',
				action: 'Get agent details',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all agents',
				action: 'Get all agents',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an agent',
				action: 'Update an agent',
			},
			{
				name: 'Add RAG',
				value: 'addRag',
				description: 'Add RAG to agent',
				action: 'Add RAG to agent',
			},
		],
		default: 'create',
	},
];

export const agentFields: INodeProperties[] = [
	// Fields for Create operation
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'Name of the agent',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'Description of the agent',
	},
	{
		displayName: 'Default LLM',
		name: 'default_llm',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'Default LLM to use for the agent',
	},
	{
		displayName: 'Custom Prompt',
		name: 'custom_prompt',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create', 'update'],
			},
		},
		default: '',
		description: 'Custom prompt for the agent',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Comma-separated list of tags',
			},
			{
				displayName: 'Visibility',
				name: 'visibility',
				type: 'options',
				options: [
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Public',
						value: 'public',
					},
				],
				default: 'private',
				description: 'Visibility of the agent',
			},
		],
	},
	// Fields for Delete, Get, Update operations
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['delete', 'get', 'update', 'execute', 'addRag'],
			},
		},
		default: '',
		description: 'ID of the agent',
	},
	// Fields for Execute operation
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['execute'],
			},
		},
		default: '',
		description: 'Message for the agent',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'collection',
		placeholder: 'Add Parameter',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['execute'],
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
	// Fields for Add RAG operation
	{
		displayName: 'RAG ID',
		name: 'ragId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['addRag'],
			},
		},
		default: '',
		description: 'ID of the RAG to add',
	},
];

