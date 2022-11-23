import { INodeProperties } from 'n8n-workflow';

export const channelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channel'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a channel',
				action: 'Create a channel',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a channel',
				action: 'Delete a channel',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a channel',
				action: 'Get a channel',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many channels',
				action: 'Get many channels',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a channel',
				action: 'Update a channel',
			},
		],
		default: 'create',
	},
];

export const channelFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 channel:create                             */
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
				resource: ['channel'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['channel'],
			},
		},
		default: '',
		description: 'Channel name as it will appear to the user in Microsoft Teams',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['channel'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: "Channel's description",
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Standard',
						value: 'standard',
					},
				],
				default: 'standard',
				description: 'The type of the channel',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 channel:delete                             */
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
				operation: ['delete'],
				resource: ['channel'],
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
				operation: ['delete'],
				resource: ['channel'],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 channel:get                                */
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
				operation: ['get'],
				resource: ['channel'],
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
				operation: ['get'],
				resource: ['channel'],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 channel:getAll                             */
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
				resource: ['channel'],
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
				resource: ['channel'],
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
				resource: ['channel'],
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

	/* -------------------------------------------------------------------------- */
	/*                                 channel:update                             */
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
				operation: ['update'],
				resource: ['channel'],
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
				operation: ['update'],
				resource: ['channel'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['channel'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Channel name as it will appear to the user in Microsoft Teams',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: "Channel's description",
			},
		],
	},
];
