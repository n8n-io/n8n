import { INodeProperties } from 'n8n-workflow';

export const videoOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['video'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a video',
				action: 'Delete a video',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a video',
				action: 'Get a video',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve all videos',
				action: 'Get many videos',
			},
			{
				name: 'Rate',
				value: 'rate',
				description: 'Rate a video',
				action: 'Rate a video',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a video',
				action: 'Update a video',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a video',
				action: 'Upload a video',
			},
		],
		default: 'getAll',
	},
];

export const videoFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 video:upload                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['video'],
			},
		},
		default: '',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Region Code',
		name: 'regionCode',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getCountriesCodes',
		},
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['video'],
			},
		},
		default: '',
	},
	{
		displayName: 'Category Name or ID',
		name: 'categoryId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getVideoCategories',
			loadOptionsDependsOn: ['regionCode'],
		},
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['video'],
			},
		},
		default: '',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['video'],
			},
		},
		default: 'data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['video'],
			},
		},
		options: [
			{
				displayName: 'Default Language Name or ID',
				name: 'defaultLanguage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLanguages',
				},
				default: '',
				description:
					'The language of the text in the playlist resource\'s title and description properties. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: "The playlist's description",
			},
			{
				displayName: 'Embeddable',
				name: 'embeddable',
				type: 'boolean',
				default: false,
				description: 'Whether the video can be embedded on another website',
			},
			{
				displayName: 'License',
				name: 'license',
				type: 'options',
				options: [
					{
						name: 'Creative Common',
						value: 'creativeCommon',
					},
					{
						name: 'Youtube',
						value: 'youtube',
					},
				],
				default: '',
				description: "The video's license",
			},
			{
				displayName: 'Notify Subscribers',
				name: 'notifySubscribers',
				type: 'boolean',
				default: false,
				description:
					"Whether YouTube should send a notification about the new video to users who subscribe to the video's channel",
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
				description: "The playlist's privacy status",
			},
			{
				displayName: 'Public Stats Viewable',
				name: 'publicStatsViewable',
				type: 'boolean',
				default: true,
				description:
					"Whether the extended video statistics on the video's watch page are publicly viewable",
			},
			{
				displayName: 'Publish At',
				name: 'publishAt',
				type: 'dateTime',
				default: '',
				description:
					'If you set a value for this property, you must also set the status.privacyStatus property to private',
			},
			{
				displayName: 'Recording Date',
				name: 'recordingDate',
				type: 'dateTime',
				default: '',
				description: 'The date and time when the video was recorded',
			},
			{
				displayName: 'Self Declared Made For Kids',
				name: 'selfDeclaredMadeForKids',
				type: 'boolean',
				default: false,
				description:
					'Whether the video is designated as child-directed, and it contains the current "made for kids" status of the video',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description:
					'Keyword tags associated with the playlist. Mulplie can be defined separated by comma.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 video:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Video ID',
		name: 'videoId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['video'],
			},
		},
		description: 'ID of the video',
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
				operation: ['delete'],
				resource: ['video'],
			},
		},
		options: [
			{
				displayName: 'On Behalf Of Content Owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description:
					"The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 video:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Video ID',
		name: 'videoId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['video'],
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
				name: 'Live Streaming Details',
				value: 'liveStreamingDetails',
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
				name: 'Recording Details',
				value: 'recordingDetails',
			},
			{
				name: 'Snippet',
				value: 'snippet',
			},
			{
				name: 'Statistics',
				value: 'statistics',
			},
			{
				name: 'Status',
				value: 'status',
			},
			{
				name: 'Topic Details',
				value: 'topicDetails',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['video'],
			},
		},
		description:
			'The fields parameter specifies a comma-separated list of one or more video resource properties that the API response will include',
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
				operation: ['get'],
				resource: ['video'],
			},
		},
		options: [
			{
				displayName: 'On Behalf Of Content Owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description:
					"The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 video:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['video'],
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
				resource: ['video'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 25,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['video'],
			},
		},
		options: [
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'string',
				default: '',
				description:
					'The channelId parameter indicates that the API response should only contain resources created by the channel',
			},
			{
				displayName: 'For Developer',
				name: 'forDeveloper',
				type: 'boolean',
				default: false,
				description:
					"Whether to restrict the search to only retrieve videos uploaded via the developer's application or website",
			},
			{
				displayName: 'Published After',
				name: 'publishedAfter',
				type: 'dateTime',
				default: '',
				description:
					'The publishedAfter parameter indicates that the API response should only contain resources created at or after the specified time',
			},
			{
				displayName: 'Published Before',
				name: 'publishedBefore',
				type: 'dateTime',
				default: '',
				description:
					'The publishedBefore parameter indicates that the API response should only contain resources created before or at the specified time',
			},
			{
				displayName: 'Query',
				name: 'q',
				type: 'string',
				default: '',
				description: 'The q parameter specifies the query term to search for',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Region Code',
				name: 'regionCode',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCountriesCodes',
				},
				default: '',
				description:
					'The regionCode parameter instructs the API to select a video chart available in the specified region. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Related To Video ID',
				name: 'relatedToVideoId',
				type: 'string',
				default: '',
				description:
					'The relatedToVideoId parameter retrieves a list of videos that are related to the video that the parameter value identifies',
			},
			{
				displayName: 'Video Category ID',
				name: 'videoCategoryId',
				type: 'string',
				default: '',
				description:
					'The videoCategoryId parameter identifies the video category for which the chart should be retrieved',
			},
			{
				displayName: 'Video Syndicated',
				name: 'videoSyndicated',
				type: 'boolean',
				default: false,
				description:
					'Whether to restrict a search to only videos that can be played outside youtube.com',
			},
			{
				displayName: 'Video Type',
				name: 'videoType',
				type: 'options',
				options: [
					{
						name: 'Any',
						value: 'any',
					},
					{
						name: 'Episode',
						value: 'episode',
					},
					{
						name: 'Movie',
						value: 'movie',
					},
				],
				default: '',
				description:
					'The videoType parameter lets you restrict a search to a particular type of videos',
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
				operation: ['getAll'],
				resource: ['video'],
			},
		},
		options: [
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'Date',
						value: 'date',
					},
					{
						name: 'Relevance',
						value: 'relevance',
					},
				],
				default: 'relevance',
			},
			{
				displayName: 'Safe Search',
				name: 'safeSearch',
				type: 'options',
				options: [
					{
						name: 'Moderate',
						value: 'moderate',
						description:
							'YouTube will filter some content from search results and, at the least, will filter content that is restricted in your locale',
					},
					{
						name: 'None',
						value: 'none',
						description: 'YouTube will not filter the search result set',
					},
					{
						name: 'Strict',
						value: 'strict',
						description:
							'YouTube will try to exclude all restricted content from the search result set',
					},
				],
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 video:rate                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Video ID',
		name: 'videoId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['rate'],
				resource: ['video'],
			},
		},
		default: '',
	},
	{
		displayName: 'Rating',
		name: 'rating',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['rate'],
				resource: ['video'],
			},
		},
		options: [
			{
				name: 'Dislike',
				value: 'dislike',
				description: 'Records that the authenticated user disliked the video',
			},
			{
				name: 'Like',
				value: 'like',
				description: 'Records that the authenticated user liked the video',
			},
			{
				name: 'None',
				value: 'none',
				description:
					'Removes any rating that the authenticated user had previously set for the video',
			},
		],
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 video:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Video ID',
		name: 'videoId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['video'],
			},
		},
		default: '',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['video'],
			},
		},
		default: '',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Region Code',
		name: 'regionCode',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getCountriesCodes',
		},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['video'],
			},
		},
		default: '',
	},
	{
		displayName: 'Category Name or ID',
		name: 'categoryId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getVideoCategories',
			loadOptionsDependsOn: ['regionCode'],
		},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['video'],
			},
		},
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['video'],
			},
		},
		options: [
			{
				displayName: 'Default Language Name or ID',
				name: 'defaultLanguage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLanguages',
				},
				default: '',
				description:
					'The language of the text in the playlist resource\'s title and description properties. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: "The playlist's description",
			},
			{
				displayName: 'Embeddable',
				name: 'embeddable',
				type: 'boolean',
				default: false,
				description: 'Whether the video can be embedded on another website',
			},
			{
				displayName: 'License',
				name: 'license',
				type: 'options',
				options: [
					{
						name: 'Creative Common',
						value: 'creativeCommon',
					},
					{
						name: 'Youtube',
						value: 'youtube',
					},
				],
				default: '',
				description: "The video's license",
			},
			{
				displayName: 'Notify Subscribers',
				name: 'notifySubscribers',
				type: 'boolean',
				default: false,
				description:
					"Whether YouTube should send a notification about the new video to users who subscribe to the video's channel",
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
						value: 'unlistef',
					},
				],
				default: '',
				description: "The playlist's privacy status",
			},
			{
				displayName: 'Public Stats Viewable',
				name: 'publicStatsViewable',
				type: 'boolean',
				default: true,
				description:
					"Whether the extended video statistics on the video's watch page are publicly viewable",
			},
			{
				displayName: 'Publish At',
				name: 'publishAt',
				type: 'dateTime',
				default: '',
				description:
					'If you set a value for this property, you must also set the status.privacyStatus property to private',
			},
			{
				displayName: 'Recording Date',
				name: 'recordingDate',
				type: 'dateTime',
				default: '',
				description: 'The date and time when the video was recorded',
			},
			{
				displayName: 'Self Declared Made For Kids',
				name: 'selfDeclaredMadeForKids',
				type: 'boolean',
				default: false,
				description:
					'Whether the video is designated as child-directed, and it contains the current "made for kids" status of the video',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description:
					'Keyword tags associated with the playlist. Mulplie can be defined separated by comma.',
			},
		],
	},
];
