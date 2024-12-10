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
				action: 'Create an agent',
				routing: {
					request: {
						method: 'POST',
						url: '/create-agent',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an agent',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/delete-agent/{{$parameter.agentId}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an agent',
				routing: {
					request: {
						method: 'GET',
						url: '=/get-agent/{{$parameter.agentId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many agents',
				routing: {
					request: {
						method: 'GET',
						url: '=/list-agents',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an agent',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/update-agent/{{$parameter.agentId}}',
					},
				},
			},
		],
		default: 'create',
	},
];

export const agentFields: INodeProperties[] = [
	// Create operation fields as well as update
	{
		displayName: 'Response Engine',
		name: 'responseEngine',
		type: 'fixedCollection',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'properties',
				displayName: 'Properties',
				values: [
					{
						displayName: 'LLM ID',
						name: 'llmId',
						type: 'string',
						required: true,
						default: '',
						description: 'Unique ID of Retell LLM',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						required: true,
						options: [
							{
								name: 'Retell LLM',
								value: 'retell-llm',
							},
						],
						default: 'retell-llm',
					},
				],
			},
		],
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Voice ID',
		name: 'voiceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getVoices',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create','update'],
			},
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'Unique voice ID used for the agent. Find list of available voices and their preview in Dashboard.',
	},
	{
		displayName: 'Agent Name',
		name: 'agentName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create','update'],
			},
		},
		description: 'Name of the agent',
	},
	{
		displayName: 'Additional Configuration',
		name: 'additionalConfig',
		type: 'json',
		default: '{\n  "voice_speed": 1\n}',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create','update'],
			},
		},
		description: 'Additional agent configuration in JSON format using snake_case keys. See <a href="https://docs.retellai.com/api-references/create-agent">API documentation</a> for all available fields.',
	},
	// Get operation fields
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['get', 'delete', 'update'],
			},
		},
		default: '',
		description: 'The ID of the agent',
	},
];