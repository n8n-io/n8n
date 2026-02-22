import type { INodeProperties } from 'n8n-workflow';

export const voiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['voice'],
			},
		},
		options: [
			{
				name: 'Add Community Voice',
				value: 'addCommunity',
				description: 'Add a community voice to your account',
				action: 'Add a community voice',
			},
			{
				name: 'Clone',
				value: 'clone',
				description: 'Clone a voice from audio files',
				action: 'Clone a voice',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a voice by ID',
				action: 'Get a voice',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many voices',
				action: 'Get many voices',
			},
			{
				name: 'Search Community',
				value: 'search',
				description: 'Search community voices',
				action: 'Search community voices',
			},
		],
		default: 'getMany',
	},
];

export const voiceFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                          voice:addCommunity                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Provider Voice ID',
		name: 'providerVoiceId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['addCommunity'],
			},
		},
		default: '',
		description: 'Voice ID assigned by the provider',
	},
	{
		displayName: 'Voice Name',
		name: 'voiceName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['addCommunity'],
			},
		},
		default: '',
		description: 'Custom name for the voice. 1-200 characters.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['addCommunity'],
			},
		},
		options: [
			{
				displayName: 'Public User ID',
				name: 'publicUserId',
				type: 'string',
				default: '',
				description: 'Required for ElevenLabs only. User ID of the voice owner.',
			},
			{
				displayName: 'Voice Provider',
				name: 'voiceProvider',
				type: 'options',
				default: 'elevenlabs',
				options: [
					{
						name: 'Cartesia',
						value: 'cartesia',
					},
					{
						name: 'ElevenLabs',
						value: 'elevenlabs',
					},
					{
						name: 'MiniMax',
						value: 'minimax',
					},
				],
				description: 'Voice source platform',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                             voice:clone                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Voice Name',
		name: 'voiceName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['clone'],
			},
		},
		default: '',
		description: 'Name for the cloned voice. 1-200 characters.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['clone'],
			},
		},
		options: [
			{
				displayName: 'Voice Provider',
				name: 'voiceProvider',
				type: 'options',
				default: 'elevenlabs',
				options: [
					{
						name: 'Cartesia',
						value: 'cartesia',
					},
					{
						name: 'ElevenLabs',
						value: 'elevenlabs',
					},
					{
						name: 'MiniMax',
						value: 'minimax',
					},
				],
				description:
					'Voice provider for cloning. For Cartesia and MiniMax, only 1 audio file is supported.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                             voice:search                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Search Query',
		name: 'searchQuery',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'Search query to find voices by name, description, or ID',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Voice Provider',
				name: 'voiceProvider',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Cartesia',
						value: 'cartesia',
					},
					{
						name: 'ElevenLabs',
						value: 'elevenlabs',
					},
					{
						name: 'MiniMax',
						value: 'minimax',
					},
				],
				description: 'Filter results by voice provider',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                              voice:get                                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Voice ID',
		name: 'voiceId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['get'],
			},
		},
		default: '',
		placeholder: '11labs-Adrian',
		description: 'The unique voice identifier to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                            voice:getMany                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['voice'],
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
				resource: ['voice'],
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
];
