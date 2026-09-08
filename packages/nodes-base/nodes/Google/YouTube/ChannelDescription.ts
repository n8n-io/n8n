import type { INodeProperties } from 'n8n-workflow';

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
				name: 'Get',
				value: 'get',
				description: 'Retrieve a channel',
				action: 'Get a channel',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Retrieve many channels',
				action: 'Get many channels',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a channel',
				action: 'Update a channel',
			},
			{
				name: 'Upload banner',
				value: 'uploadBanner',
				description: 'Upload a channel banner',
				action: 'Upload a channel banner',
			},
		],
		default: 'getAll',
	},
];

export const channelFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 channel:getAll                             */
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
				name: 'Branding settings',
				value: 'brandingSettings',
			},
			{
				name: 'Content details',
				value: 'contentDetails',
			},
			{
				name: 'Content owner details',
				value: 'contentOwnerDetails',
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
				name: 'Topic details',
				value: 'topicDetails',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['channel'],
			},
		},
		description:
			'The fields parameter specifies a comma-separated list of one or more channel resource properties that the API response will include',
		default: ['*'],
	},
	{
		displayName: 'Return all',
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
			maxValue: 50,
		},
		default: 25,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['channel'],
			},
		},
		options: [
			{
				displayName: 'Category ID',
				name: 'categoryId',
				type: 'string',
				default: '',
				description:
					'The categoryId parameter specifies a YouTube guide category, thereby requesting YouTube channels associated with that category',
			},
			{
				displayName: 'For username',
				name: 'forUsername',
				type: 'string',
				default: '',
				description:
					'The forUsername parameter specifies a YouTube username, thereby requesting the channel associated with that username',
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				description:
					"The ID parameter specifies a comma-separated list of the YouTube channel ID(s) for the resource(s) that are being retrieved. In a channel resource, the ID property specifies the channel's YouTube channel ID.",
			},
			{
				displayName: 'Managed by me',
				name: 'managedByMe',
				type: 'boolean',
				default: false,
				description:
					'Whether to instruct the API to only return channels managed by the content owner that the onBehalfOfContentOwner parameter specifies',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['channel'],
			},
		},
		options: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Language code',
				name: 'h1',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLanguages',
				},
				default: '',
				description:
					'The hl parameter instructs the API to retrieve localized resource metadata for a specific application language that the YouTube website supports. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'On behalf of content owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
				description:
					"The onBehalfOfContentOwner parameter indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 channel:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['channel'],
			},
		},
		description: 'ID of the channel',
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
				name: 'Branding settings',
				value: 'brandingSettings',
			},
			{
				name: 'Content details',
				value: 'contentDetails',
			},
			{
				name: 'Content owner details',
				value: 'contentOwnerDetails',
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
				name: 'Topic details',
				value: 'topicDetails',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['channel'],
			},
		},
		description:
			'The fields parameter specifies a comma-separated list of one or more channel resource properties that the API response will include',
		default: ['*'],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 channel:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['channel'],
			},
		},
		default: '',
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['channel'],
			},
		},
		options: [
			{
				displayName: 'Branding settings',
				name: 'brandingSettingsUi',
				type: 'fixedCollection',
				default: {},
				description: 'Encapsulates information about the branding of the channel',
				placeholder: 'Add branding settings',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'channelSettingsValues',
						displayName: 'Channel settings',
						values: [
							{
								displayName: 'Channel',
								name: 'channel',
								type: 'collection',
								default: {},
								placeholder: 'Add channel settings',
								typeOptions: {
									multipleValues: false,
								},
								options: [
									{
										displayName: 'Country',
										name: 'country',
										type: 'string',
										default: '',
										description:
											'The country with which the channel is associated. Update this property to set the value of the snippet.country property.',
									},
									{
										displayName: 'Description',
										name: 'description',
										type: 'string',
										default: '',
										description:
											"The channel description, which appears in the channel information box on your channel page. The property's value has a maximum length of 1000 characters.",
									},
									{
										displayName: 'Default language',
										name: 'defaultLanguage',
										type: 'string',
										default: '',
										description:
											'The content tab that users should display by default when viewers arrive at your channel page',
									},
									{
										displayName: 'Default tab',
										name: 'defaultTab',
										type: 'string',
										default:
											'The content tab that users should display by default when viewers arrive at your channel page.',
									},
									{
										displayName: 'Featured channels title',
										name: 'featuredChannelsTitle',
										type: 'string',
										default: '',
										description:
											'The title that displays above the featured channels module. The title has a maximum length of 30 characters.',
									},
									{
										displayName: 'Featured channels URLs',
										name: 'featuredChannelsUrls',
										type: 'string',
										typeOptions: {
											multipleValues: true,
										},
										description:
											'A list of up to 100 channels that you would like to link to from the featured channels module. The property value is a list of YouTube channel ID values, each of which uniquely identifies a channel.',
										default: [],
									},
									{
										displayName: 'Keywords',
										name: 'keywords',
										type: 'string',
										placeholder: 'tech,news',
										description:
											'Keywords associated with your channel. The value is a space-separated list of strings.',
										default: '',
									},
									{
										displayName: 'Moderate comments',
										name: 'moderateComments',
										type: 'boolean',
										description:
											'Whether user-submitted comments left on the channel page need to be approved by the channel owner to be publicly visible',
										default: false,
									},
									{
										displayName: 'Profile color',
										name: 'profileColor',
										// eslint-disable-next-line n8n-nodes-base/node-param-color-type-unused
										type: 'string',
										default: '',
										description: "A prominent color that complements the channel's content",
									},
									{
										displayName: 'Show related channels',
										name: 'showRelatedChannels',
										type: 'boolean',
										description:
											'Whether YouTube should show an algorithmically generated list of related channels on your channel page',
										default: false,
									},
									{
										displayName: 'Show browse view',
										name: 'showBrowseView',
										type: 'boolean',
										description:
											'Whether the channel page should display content in a browse or feed view',
										default: false,
									},
									{
										displayName: 'Tracking analytics AccountId',
										name: 'trackingAnalyticsAccountId',
										type: 'string',
										description:
											'The ID for a Google Analytics account that you want to use to track and measure traffic to your channel',
										default: '',
									},
									{
										displayName: 'Unsubscribed trailer',
										name: 'unsubscribedTrailer',
										type: 'string',
										description:
											"The video that should play in the featured video module in the channel page's browse view for unsubscribed viewers",
										default: '',
									},
								],
							},
						],
						description: 'The channel object encapsulates branding properties of the channel page',
					},
					{
						name: 'imageSettingsValues',
						displayName: 'Image settings',
						values: [
							{
								displayName: 'Image',
								name: 'image',
								type: 'collection',
								default: {},
								placeholder: 'Add channel settings',
								description:
									"The image object encapsulates information about images that display on the channel's channel page or video watch pages",
								typeOptions: {
									multipleValues: false,
								},
								options: [
									{
										displayName: 'Banner external URL',
										name: 'bannerExternalUrl',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Tracking image URL',
										name: 'trackingImageUrl',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Watch icon image URL',
										name: 'watchIconImageUrl',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						name: 'statusValue',
						displayName: 'Status',
						values: [
							{
								displayName: 'Status',
								name: 'status',
								type: 'collection',
								default: {},
								placeholder: 'Add status',
								typeOptions: {
									multipleValues: false,
								},
								options: [
									{
										displayName: 'Self declared made for kids',
										name: 'selfDeclaredMadeForKids',
										type: 'boolean',
										default: false,
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'On behalf of content owner',
				name: 'onBehalfOfContentOwner',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 channel:uploadBanner                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['uploadBanner'],
				resource: ['channel'],
			},
		},
		description: 'ID of the channel',
		default: '',
	},
	{
		displayName: 'Input binary field',
		name: 'binaryProperty',
		type: 'string',
		required: true,
		hint: 'The name of the input binary field containing the file to be uploaded',
		displayOptions: {
			show: {
				operation: ['uploadBanner'],
				resource: ['channel'],
			},
		},
		default: 'data',
	},
];
