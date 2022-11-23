import { INodeProperties } from 'n8n-workflow';

export const channelMessageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channelMessage'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a message',
				action: 'Create a message in a channel',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many messages',
				action: 'Get many messages in a channel',
			},
		],
		default: 'create',
	},
];

export const channelMessageFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 channelMessage:create                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team',
		name: 'teamId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Team',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Team...',
				typeOptions: {
					searchListMethod: 'getTeams',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'b16cb45e-df51-4ff6-a044-dd90bf2bfdb2',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
							errorMessage: 'Not a valid Microsoft Teams Team ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
				},
			},
		],
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['channelMessage'],
			},
		},
	},
	{
		displayName: 'Channel',
		name: 'channelId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Channel',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Channel...',
				typeOptions: {
					searchListMethod: 'getChannels',
					// missing searchListDependsOn: ['teamId'],
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: '19:-xlxyqXNSCxpI1SDzgQ_L9ZvzSR26pgphq1BJ9y7QJE1@thread.tacv2',
				// validation missing because no documentation found how these unique ids look like.
			},
		],
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['channelMessage'],
			},
		},
	},
	{
		displayName: 'Message Type',
		name: 'messageType',
		required: true,
		type: 'options',
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'HTML',
				value: 'html',
			},
		],
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['channelMessage'],
			},
		},
		default: 'text',
		description: 'The type of the content',
	},
	{
		displayName: 'Message',
		name: 'message',
		required: true,
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['channelMessage'],
			},
		},
		default: '',
		description: 'The content of the item',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['channelMessage'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Make Reply',
				name: 'makeReply',
				type: 'string',
				default: '',
				description: 'An optional ID of the message you want to reply to',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 channelMessage:getAll                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team',
		name: 'teamId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Team',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Team...',
				typeOptions: {
					searchListMethod: 'getTeams',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'b16cb45e-df51-4ff6-a044-dd90bf2bfdb2',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
							errorMessage: 'Not a valid Microsoft Teams Team ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
				},
			},
		],
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['channelMessage'],
			},
		},
	},
	{
		displayName: 'Channel',
		name: 'channelId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Channel',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Channel...',
				typeOptions: {
					searchListMethod: 'getChannels',
					// missing searchListDependsOn: ['teamId'],
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: '19:-xlxyqXNSCxpI1SDzgQ_L9ZvzSR26pgphq1BJ9y7QJE1@thread.tacv2',
				// validation missing because no documentation found how these unique ids look like.
			},
		],
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['channelMessage'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['channelMessage'],
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
				operation: ['getAll'],
				resource: ['channelMessage'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
