import {
	INodeProperties,
} from 'n8n-workflow';

export const playlistOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'playlist',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a playlist',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a playlist',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a playlist',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all playlists',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a playlist',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const playlistFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 playlist:create                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'playlist',
				],
			},
		},
		default: '',
		description: `The playlist's title.`,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'playlist',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: `The playlist's description.`,
			},
			{
				displayName: 'Privacy Status',
				name: 'privacyStatus',
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
					{
						name: 'Unlisted',
						value: 'unlisted',
					},
				],
				default: '',
				description: `The playlist's privacy status.`,
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: `Keyword tags associated with the playlist. Mulplie can be defined separated by comma`,
			},
			{
				displayName: 'Default Language',
				name: 'defaultLanguage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLanguages',
				},
				default: '',
				description: `The language of the text in the playlist resource's title and description properties.`,
			},
			{
				displayName: 'On Behalf Of Content Owner Channel',
				name: 'onBehalfOfContentOwnerChannel',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwnerChannel parameter specifies the YouTube channel ID of the channel to which a video is being added. This parameter is required when a request specifies a value for the onBehalfOfContentOwner parameter, and it can only be used in conjunction with that parameter.`,
			},
			{
				displayName: 'On Behalf Of Content Owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value`,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 playlist:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Playlist ID',
		name: 'playlistId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'playlist',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Fields',
		name: 'part',
		type: 'multiOptions',
		options: [
			{
				name: '*',
				value: '*',
			},
			{
				name: 'Content Details',
				value: 'contentDetails',
			},
			{
				name: 'ID',
				value: 'id',
			},
			{
				name: 'Localizations',
				value: 'localizations',
			},
			{
				name: 'Player',
				value: 'player',
			},
			{
				name: 'Snippet',
				value: 'snippet',
			},
			{
				name: 'Status',
				value: 'status',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'playlist',
				],
			},
		},
		description: 'The fields parameter specifies a comma-separated list of one or more playlist resource properties that the API response will include.',
		default: ['*'],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'playlist',
				],
			},
		},
		options: [
			{
				displayName: 'On Behalf Of Content Owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value`,
			},
			{
				displayName: 'On Behalf Of Content Owner Channel',
				name: 'onBehalfOfContentOwnerChannel',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwnerChannel parameter specifies the YouTube channel ID of the channel to which a video is being added`,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 playlist:delete                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Playlist ID',
		name: 'playlistId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'playlist',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'playlist',
				],
			},
		},
		options: [
			{
				displayName: 'On Behalf Of Content Owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value`,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 playlist:getAll                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Fields',
		name: 'part',
		type: 'multiOptions',
		options: [
			{
				name: '*',
				value: '*',
			},
			{
				name: 'Content Details',
				value: 'contentDetails',
			},
			{
				name: 'ID',
				value: 'id',
			},
			{
				name: 'Localizations',
				value: 'localizations',
			},
			{
				name: 'Player',
				value: 'player',
			},
			{
				name: 'Snippet',
				value: 'snippet',
			},
			{
				name: 'Status',
				value: 'status',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'playlist',
				],
			},
		},
		description: 'The fields parameter specifies a comma-separated list of one or more playlist resource properties that the API response will include.',
		default: ['*'],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'playlist',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'playlist',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 25,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'playlist',
				],
			},
		},
		options: [
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'string',
				default: '',
				description: `This value indicates that the API should only return the specified channel's playlists.`,
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				description: `The id parameter specifies a comma-separated list of the YouTube playlist ID(s) for the resource(s) that are being retrieved. In a playlist resource, the id property specifies the playlist's YouTube playlist ID.`,
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'playlist',
				],
			},
		},
		options: [
			{
				displayName: 'On Behalf Of Content Owner Channel',
				name: 'onBehalfOfContentOwnerChannel',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwnerChannel parameter specifies the YouTube channel ID of the channel to which a video is being added. This parameter is required when a request specifies a value for the onBehalfOfContentOwner parameter, and it can only be used in conjunction with that parameter.`,
			},
			{
				displayName: 'On Behalf Of Content Owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value`,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 playlist:update                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Playlist ID',
		name: 'playlistId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'playlist',
				],
			},
		},
		default: '',
		description: `The playlist's title.`,
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'playlist',
				],
			},
		},
		default: '',
		description: `The playlist's title.`,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'playlist',
				],
			},
		},
		options: [
			{
				displayName: 'Default Language',
				name: 'defaultLanguage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLanguages',
				},
				default: '',
				description: `The language of the text in the playlist resource's title and description properties.`,
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: `The playlist's description.`,
			},
			{
				displayName: 'On Behalf Of Content Owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value`,
			},
			{
				displayName: 'Privacy Status',
				name: 'privacyStatus',
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
					{
						name: 'Unlisted',
						value: 'unlisted',
					},
				],
				default: '',
				description: `The playlist's privacy status.`,
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: `Keyword tags associated with the playlist. Mulplie can be defined separated by comma`,
			},
		],
	},
];
