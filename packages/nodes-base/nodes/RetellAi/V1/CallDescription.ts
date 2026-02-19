import type { INodeProperties } from 'n8n-workflow';

export const callOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['call'],
			},
		},
		options: [
			{
				name: 'Create Phone Call',
				value: 'createPhoneCall',
				description: 'Create an outbound phone call',
				action: 'Create a phone call',
			},
			{
				name: 'Create Web Call',
				value: 'createWebCall',
				description: 'Create a web-based call',
				action: 'Create a web call',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a call',
				action: 'Delete a call',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a call by ID',
				action: 'Get a call',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many calls',
				action: 'Get many calls',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a call',
				action: 'Update a call',
			},
		],
		default: 'createPhoneCall',
	},
];

export const callFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                            call:createPhoneCall                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'From Number',
		name: 'fromNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['createPhoneCall'],
			},
		},
		default: '',
		placeholder: '+14155551234',
		description: 'The phone number to call from, in E.164 format. Must be a number you own.',
	},
	{
		displayName: 'To Number',
		name: 'toNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['createPhoneCall'],
			},
		},
		default: '',
		placeholder: '+14155555678',
		description: 'The destination phone number, in E.164 format',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['createPhoneCall'],
			},
		},
		options: [
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description: 'Arbitrary key-value pairs to store with the call',
			},
			{
				displayName: 'Override Agent ID',
				name: 'overrideAgentId',
				type: 'string',
				default: '',
				description:
					'Override the agent assigned to the phone number for this specific call',
			},
			{
				displayName: 'Retell LLM Dynamic Variables',
				name: 'retellLlmDynamicVariables',
				type: 'json',
				default: '{}',
				description:
					'Key-value pairs of dynamic variables to inject into the Retell LLM prompt',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                            call:createWebCall                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['createWebCall'],
			},
		},
		default: '',
		description: 'The agent ID to use for the web call',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['createWebCall'],
			},
		},
		options: [
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description: 'Arbitrary key-value pairs to store with the call',
			},
			{
				displayName: 'Retell LLM Dynamic Variables',
				name: 'retellLlmDynamicVariables',
				type: 'json',
				default: '{}',
				description:
					'Key-value pairs of dynamic variables to inject into the Retell LLM prompt',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 call:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Call ID',
		name: 'callId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The ID of the call to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                               call:getMany                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['getMany'],
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
				resource: ['call'],
				operation: ['getMany'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filter Fields',
		name: 'filterFields',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				default: '',
				description: 'Filter calls by agent ID',
			},
			{
				displayName: 'Call Status',
				name: 'callStatus',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Ended',
						value: 'ended',
					},
					{
						name: 'Error',
						value: 'error',
					},
					{
						name: 'Not Connected',
						value: 'not_connected',
					},
					{
						name: 'Ongoing',
						value: 'ongoing',
					},
					{
						name: 'Registered',
						value: 'registered',
					},
				],
				description: 'Filter calls by status',
			},
			{
				displayName: 'Call Type',
				name: 'callType',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Phone Call',
						value: 'phone_call',
					},
					{
						name: 'Web Call',
						value: 'web_call',
					},
				],
				description: 'Filter calls by type',
			},
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Inbound',
						value: 'inbound',
					},
					{
						name: 'Outbound',
						value: 'outbound',
					},
				],
				description: 'Filter calls by direction',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				default: 'descending',
				options: [
					{
						name: 'Ascending',
						value: 'ascending',
					},
					{
						name: 'Descending',
						value: 'descending',
					},
				],
				description: 'Sort order for returned calls',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                               call:update                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Call ID',
		name: 'callId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The ID of the call to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description: 'Arbitrary key-value pairs to store with the call',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                               call:delete                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Call ID',
		name: 'callId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'The ID of the call to delete',
	},
];
