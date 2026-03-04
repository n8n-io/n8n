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
				name: 'Get Final Response',
				value: 'getFinalResponse',
				description: 'Get the final response from an agent conversation',
				action: 'Get final response from an agent conversation',
			},
			{
				name: 'Initiate Conversation',
				value: 'initiateConversation',
				description: 'Initiate a new conversation with an AI agent',
				action: 'Initiate conversation with an AI agent',
			},
			{
				name: 'Send Message',
				value: 'sendMessage',
				description: 'Send a message to an existing agent conversation',
				action: 'Send message to an agent conversation',
			},
		],
		default: 'initiateConversation',
	},
];

export const agentFields: INodeProperties[] = [
	// ----------------------------------
	//   agent:initiateConversation
	// ----------------------------------
	{
		displayName: 'Agent Name',
		name: 'agentName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['initiateConversation'],
			},
		},
		default: '',
		placeholder: 'e.g., TestApp__SummaryAgent',
		description: 'The fully qualified name of the AI agent (e.g., TestApp__SummaryAgent)',
	},
	{
		displayName: 'Context ID',
		name: 'contextId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['initiateConversation'],
			},
		},
		default: '',
		placeholder: 'e.g., STE6VGVzdEFwcF9fQ2xhaW1fNjlhODQ3M2FmYmIzODQ1NDJiNzFjY2I5',
		description: 'The encoded context ID for the conversation',
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
				operation: ['initiateConversation'],
			},
		},
		options: [
			{
				displayName: 'Execute Starter Question',
				name: 'executeStarterQuestion',
				type: 'boolean',
				default: false,
				description: 'Whether to execute the starter question when initiating the conversation',
			},
		],
	},

	// ----------------------------------
	//      agent:sendMessage
	// ----------------------------------
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['sendMessage'],
			},
		},
		default: '',
		placeholder: 'e.g., TestApp__SummaryAgent',
		description: 'The ID (fully qualified name) of the AI agent',
	},
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['sendMessage'],
			},
		},
		default: '',
		placeholder: 'e.g., CONV-001',
		description: 'The ID of the conversation to send the message to',
	},
	{
		displayName: 'Request',
		name: 'request',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['sendMessage'],
			},
		},
		default: '',
		placeholder: 'e.g., Hi',
		description: 'The message text to send to the agent',
	},

	// ----------------------------------
	//    agent:getFinalResponse
	// ----------------------------------
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['getFinalResponse'],
			},
		},
		default: '',
		placeholder: 'e.g., STE6UGVnYVBsYXRmb3JtX19BZ2VudENvbnZl...',
		description: 'The ID of the conversation to retrieve the final response for',
	},
];
