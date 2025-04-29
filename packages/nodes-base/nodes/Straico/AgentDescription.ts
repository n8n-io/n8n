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
				description: 'Delete an existing agent',
				action: 'Delete an agent',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get agent details',
				action: 'Get agent details',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all agents',
				action: 'List all agents',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing agent',
				action: 'Update an agent',
			},
		],
		default: 'list',
	},
];

export const agentFields: INodeProperties[] = [
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete', 'get', 'update'],
				resource: ['agent'],
			},
		},
		default: '',
		description: 'The unique identifier of the agent',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['agent'],
			},
		},
		default: '',
		description: 'The name of the agent',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['agent'],
			},
		},
		default: '',
		description: 'A description of the agent\'s purpose and capabilities',
	},
	{
		displayName: 'Model',
		name: 'model',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['agent'],
			},
		},
		default: 'gpt-4',
		description: 'The AI model to be used by the agent',
	},
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['agent'],
			},
		},
		default: '',
		description: 'System instructions that define the agent\'s behavior and capabilities',
	},
	{
		displayName: 'Tools',
		name: 'tools',
		type: 'multiOptions',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['agent'],
			},
		},
		options: [
			{
				name: 'Web Search',
				value: 'web_search',
			},
			{
				name: 'Code Interpreter',
				value: 'code_interpreter',
			},
			{
				name: 'File Management',
				value: 'file_management',
			},
		],
		default: [],
		description: 'The tools that the agent has access to',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['list'],
				resource: ['agent'],
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
				operation: ['list'],
				resource: ['agent'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
