import {
	INodeProperties,
} from 'n8n-workflow';

export const videoOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'video',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a video',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a video',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all videos',
			},
			{
				name: 'Rate',
				value: 'rate',
				description: 'Rate a video',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a video',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a video',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.'
	}
] as INodeProperties[];

export const videoFields = [
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
				operation: [
					'upload',
				],
				resource: [
					'video',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Country Code',
		name: 'countryCode',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCountriesCodes',
		},
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'video',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Category ID',
		name: 'categoryId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getVideoCategories',
			loadOptionsDependsOn: [
				'countryCode',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'video',
				],
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
				operation: [
					'upload',
				],
				resource: [
					'video',
				],
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
				operation: [
					'upload',
				],
				resource: [
					'video',
				],
			},
		},
		options: [
			{
				displayName: 'Default Language',
				name: 'defaultLanguage',
				type: 'string',
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
				displayName: 'Embeddable',
				name: 'embeddable',
				type: 'boolean',
				default: false,
				description: `This value indicates whether the video can be embedded on another website.`,
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
				default: false,
				description: `The video's license.`,
			},
			{
				displayName: 'Notify Subscribers',
				name: 'notifySubscribers',
				type: 'boolean',
				default: false,
				description: `The notifySubscribers parameter indicates whether YouTube should send a notification about the new video to users who subscribe to the video's channel`,
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
				description: `The playlist's privacy status.`,
			},
			{
				displayName: 'Public Stats Viewable',
				name: 'publicStatsViewable',
				type: 'boolean',
				default: true,
				description: `This value indicates whether the extended video statistics on the video's watch page are publicly viewable.`,
			},
			{
				displayName: 'Publish At',
				name: 'publishAt',
				type: 'dateTime',
				default: '',
				description: `If you set a value for this property, you must also set the status.privacyStatus property to private.`,
			},
			{
				displayName: 'Recording Date',
				name: 'recordingDate',
				type: 'dateTime',
				default: '',
				description: `The date and time when the video was recorded`,
			},
			{
				displayName: 'Self Declared Made For Kids',
				name: 'selfDeclaredMadeForKids',
				type: 'boolean',
				default: false,
				description: `This value indicates whether the video is designated as child-directed, and it contains the current "made for kids" status of the video`,
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
				operation: [
					'delete',
				],
				resource: [
					'video',
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
					'video',
				],
			},
		},
		options: [
			{
				displayName: 'On Behalf Of Content Owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify<br>
				a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value`,
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
				operation: [
					'get',
				],
				resource: [
					'video',
				],
			},
		},
		default: ''
	},
	{
		displayName: 'Fields',
		name: 'part',
		type: 'multiOptions',
		options: [
			{
				name: 'Content Details',
				value: 'contentDetails',
			},
			{
				name: 'Field Details',
				value: 'fieldDetails',
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
				name: 'Processing Details',
				value: 'processingDetails',
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
				name: 'Suggestions',
				value: 'suggestions',
			},
			{
				name: 'Topic Details',
				value: 'topicDetails',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'video',
				],
			},
		},
		description: 'The fields parameter specifies a comma-separated list of one or more video resource properties that the API response will include.',
		default: ''
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
					'video',
				],
			},
		},
		options: [
			{
				displayName: 'On Behalf Of Content Owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify<br>
				a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value`,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 video:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Fields',
		name: 'part',
		type: 'multiOptions',
		options: [
			{
				name: 'Content Details',
				value: 'contentDetails',
			},
			{
				name: 'File Details',
				value: 'fileDetails',
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
				name: 'Processing Details',
				value: 'processingDetails',
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
				name: 'Suggestions',
				value: 'suggestions',
			},
			{
				name: 'Topic Details',
				value: 'topicDetails',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'video',
				],
			},
		},
		description: 'The fields parameter specifies a comma-separated list of one or more video resource properties that the API response will include.',
		default: ''
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
					'video',
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
					'video',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
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
					'video',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				description: `The id parameter specifies a comma-separated list of the YouTube video ID(s) for the resource(s) that are being retrieved. In a video resource, the id property specifies the video's YouTube video ID.`,
			},
			{
				displayName: 'My Rating',
				name: 'myRating',
				type: 'options',
				options: [
					{
						name: 'Dislike',
						value: 'dislike',
					},
					{
						name: 'Like',
						value: 'like',
					},
				],
				default: '',
				description: `Set this parameter's value to like or dislike to instruct the API to only return videos liked or disliked by the authenticated user.`,
			},
			{
				displayName: 'Region Code',
				name: 'regionCode',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCountriesCodes',
				},
				default: '',
				description: `The regionCode parameter instructs the API to select a video chart available in the specified region.`,
			},
			{
				displayName: 'Video Category ID',
				name: 'videoCategoryId',
				type: 'string',
				default: '',
				description: `The videoCategoryId parameter identifies the video category for which the chart should be retrieved.`,
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
					'video',
				],
			},
		},
		options: [
			{
				displayName: 'On Behalf Of Content Owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description: `The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify<br>
				a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value`,
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
				operation: [
					'rate',
				],
				resource: [
					'video',
				],
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
				operation: [
					'rate',
				],
				resource: [
					'video',
				],
			},
		},
		options: [
			{
				name: 'Dislike',
				value: 'dislike',
				description: 'Records that the authenticated user disliked the video.',
			},
			{
				name: 'Like',
				value: 'like',
				description: 'Records that the authenticated user liked the video.',
			},
			{
				name: 'None',
				value: 'none',
				description: 'Removes any rating that the authenticated user had previously set for the video.',
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
				operation: [
					'update',
				],
				resource: [
					'video',
				],
			},
		},
		default: '',
	},
	// {
	// 	displayName: 'Country Code',
	// 	name: 'countryCode',
	// 	type: 'options',
	// 	typeOptions: {
	// 		loadOptionsMethod: 'getCountriesCodes',
	// 	},
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'update',
	// 			],
	// 			resource: [
	// 				'video',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// },
	// {
	// 	displayName: 'Category ID',
	// 	name: 'categoryId',
	// 	type: 'options',
	// 	typeOptions: {
	// 		loadOptionsMethod: 'getVideoCategories',
	// 		loadOptionsDependsOn: [
	// 			'countryCode',
	// 		],
	// 	},
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'update',
	// 			],
	// 			resource: [
	// 				'video',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// },
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'video',
				],
			},
		},
		options: [
			{
				displayName: 'Default Language',
				name: 'defaultLanguage',
				type: 'string',
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
				displayName: 'Embeddable',
				name: 'embeddable',
				type: 'boolean',
				default: false,
				description: `This value indicates whether the video can be embedded on another website.`,
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
				default: false,
				description: `The video's license.`,
			},
			{
				displayName: 'Notify Subscribers',
				name: 'notifySubscribers',
				type: 'boolean',
				default: false,
				description: `The notifySubscribers parameter indicates whether YouTube should send a notification about the new video to users who subscribe to the video's channel`,
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
				description: `The playlist's privacy status.`,
			},
			{
				displayName: 'Public Stats Viewable',
				name: 'publicStatsViewable',
				type: 'boolean',
				default: true,
				description: `This value indicates whether the extended video statistics on the video's watch page are publicly viewable.`,
			},
			{
				displayName: 'Publish At',
				name: 'publishAt',
				type: 'dateTime',
				default: '',
				description: `If you set a value for this property, you must also set the status.privacyStatus property to private.`,
			},
			{
				displayName: 'Recording Date',
				name: 'recordingDate',
				type: 'dateTime',
				default: '',
				description: `The date and time when the video was recorded`,
			},
			{
				displayName: 'Self Declared Made For Kids',
				name: 'selfDeclaredMadeForKids',
				type: 'boolean',
				default: false,
				description: `This value indicates whether the video is designated as child-directed, and it contains the current "made for kids" status of the video`,
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: `Keyword tags associated with the playlist. Mulplie can be defined separated by comma`,
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
] as INodeProperties[];
