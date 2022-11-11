import { INodeProperties } from 'n8n-workflow';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a message',
			},
			{
				name: 'Get Permalink',
				value: 'getPermalink',
				action: 'Get a message permalink',
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search for messages',
			},
			{
				name: 'Send',
				value: 'post',
				action: 'Send a message',
			},
			{
				name: 'Send (Ephemeral)',
				value: 'postEphemeral',
				action: 'Send an ephemeral message',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a message',
			},
		],
		default: 'post',
	},
];

export const messageFields: INodeProperties[] = [
	/* ----------------------------------------------------------------------- */
	/*                                 message:getPermalink
	/* ----------------------------------------------------------------------- */
	{
		name: 'channelId',
		displayName: 'Channel',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a channel...',
		description: 'The Slack channel to get the message permalink from',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getPermalink'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a channel...',
				typeOptions: {
					searchListMethod: 'getChannels',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Not a valid Slack Channel ID',
						},
					},
				],
				placeholder: 'C0122KQ70S7E',
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://app.slack.com/client/TS9594PZK/B0556F47Z3A',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'http(s)?://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
							errorMessage: 'Not a valid Slack Channel URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: 'https://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
				},
			},
		],
	},
	{
		displayName: 'Message Timestamp',
		name: 'timestamp',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getPermalink'],
			},
		},
		description: 'Timestamp of the message to message.',
		placeholder: '1663233118.856619',
	},

	/* -------------------------------------------------------------------------- */
	/*                          message:post/postEphemeral                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Send message to',
		name: 'select',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['post', 'postEphemeral'],
			},
		},
		options: [
			{
				name: 'Channel',
				value: 'channel',
			},
			{
				name: 'User',
				value: 'user',
			},
		],
		default: '',
		placeholder: 'Select...',
	},
	{
		name: 'channelId',
		displayName: 'Channel',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a channel...',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a channel...',
				typeOptions: {
					searchListMethod: 'getChannels',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Not a valid Slack Channel ID',
						},
					},
				],
				placeholder: 'C0122KQ70S7E',
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://app.slack.com/client/TS9594PZK/B0556F47Z3A',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'http(s)?://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
							errorMessage: 'Not a valid Slack Channel URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: 'https://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
				},
			},
		],
		displayOptions: {
			show: {
				operation: ['post', 'postEphemeral'],
				resource: ['message'],
				select: ['channel'],
			},
		},
		required: true,
		description: 'The Slack channel to send to',
	},
	{
		name: 'user',
		displayName: 'User',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a user...',
		displayOptions: {
			show: {
				operation: ['post', 'postEphemeral'],
				resource: ['message'],
				select: ['user'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a user...',
				typeOptions: {
					searchListMethod: 'getUsers',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Not a valid Slack User ID',
						},
					},
				],
				placeholder: 'U123AB45JGM',
			},
		],
	},
	{
		displayName: 'Message Type',
		name: 'messageType',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['post', 'postEphemeral'],
				resource: ['message'],
			},
		},
		description:
			'Whether to send a simple text message, or use Slack’s Blocks UI builder for more sophisticated messages that include form fields, sections and more',
		options: [
			{
				name: 'Simple Text Message',
				value: 'text',
				description: 'Supports basic Markdown',
			},
			{
				name: 'Blocks',
				value: 'block',
				description:
					"Combine text, buttons, form elements, dividers and more in Slack 's visual builder",
			},
			{
				name: 'Attachments',
				value: 'attachment',
			},
		],
		default: 'text',
	},
	{
		displayName: 'Message Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['post', 'postEphemeral'],
				resource: ['message'],
				messageType: ['text'],
			},
		},
		description:
			"The message text to post. Supports <a href='https://api.slack.com/reference/surfaces/formatting'>markdown</a> by default - this can be disabled in 'Options'",
	},
	{
		displayName: 'Blocks',
		name: 'blocksUi',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['post', 'postEphemeral'],
				resource: ['message'],
				messageType: ['block'],
			},
		},
		typeOptions: {
			rows: 3,
		},
		description:
			"Enter the JSON output from Slack's visual Block Kit Builder here. You can then use expressions to add variable content to your blocks.",
		hint: "Use Blocks to build an interactive message.<br> To create blocks, use <a target='_blank' href='https://app.slack.com/block-kit-builder'>Slack's Block Kit Builder</a>",
		default: '',
	},
	{
		displayName: 'This is a legacy Slack feature. Slack advises to instead use Blocks.',
		name: 'noticeAttachments',
		type: 'notice',
		displayOptions: {
			show: {
				operation: ['post', 'postEphemeral'],
				resource: ['message'],
				messageType: ['attachment'],
			},
		},
		default: '',
	},
	{
		displayName: 'Attachments',
		name: 'attachments',
		type: 'collection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add attachment',
		},
		displayOptions: {
			show: {
				operation: ['post', 'postEphemeral'],
				resource: ['message'],
				messageType: ['attachment'],
			},
		},
		default: {}, // TODO: Remove comment: has to make default array for the main property, check where that happens in UI
		placeholder: 'Add attachment item',
		options: [
			{
				displayName: 'Fallback Text',
				name: 'fallback',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Required plain-text summary of the attachment',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Title Link',
				name: 'title_link',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '#ff0000',
				description: 'Color of the line left of text',
			},
			{
				displayName: 'Pretext',
				name: 'pretext',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text which appears before the message block',
			},
			{
				displayName: 'Author Name',
				name: 'author_name',
				type: 'string',
				default: '',
				description: 'Name that should appear',
			},
			{
				displayName: 'Author Link',
				name: 'author_link',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Author Icon',
				name: 'author_icon',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Icon which should appear for the user',
			},
			{
				displayName: 'Image URL',
				name: 'image_url',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Thumbnail URL',
				name: 'thumb_url',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Footer',
				name: 'footer',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text of footer to add',
			},
			{
				displayName: 'Footer Icon',
				name: 'footer_icon',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Icon which should appear next to footer',
			},
			{
				displayName: 'Message Timestamp',
				name: 'ts',
				type: 'dateTime',
				default: '',
				description: 'Timestamp of the message to post.',
				placeholder: '1663233118.856619',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				placeholder: 'Add Fields',
				description: 'Fields to add to message',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'item',
						displayName: 'Item',
						values: [
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Short',
								name: 'short',
								type: 'boolean',
								default: true,
								description: 'Whether items can be displayed next to each other',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'otherOptions',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['post', 'postEphemeral'],
				resource: ['message'],
			},
		},
		default: {},
		description: 'Other options to set',
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Icon Emoji',
				name: 'icon_emoji',
				type: 'string',
				default: '',
				description:
					'Emoji to use as the icon for this message. This field only has an effect when using a Bot connection. Add chat:write.customize scope on Slack API',
			},
			{
				displayName: 'Icon URL',
				name: 'icon_url',
				type: 'string',
				default: '',
				description: 'URL to an image to use as the icon for this message',
			},
			{
				displayName: 'Link User and Channel names',
				name: 'link_names',
				type: 'boolean',
				default: false,
				description: 'Whether to turn @users and #channels in message text into clickable links',
			},
			{
				displayName: 'Reply to a Message',
				name: 'thread_ts',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Reply to a Message',
				description: "Provide another message's Timestamp value to make this message a reply",
				options: [
					{
						displayName: 'Reply to a Message',
						name: 'replyValues',
						values: [
							{
								displayName: 'Message timestamp to reply to',
								name: 'timestamp_reply',
								type: 'string',
								default: '',
								placeholder: '1663233118.856619',
							},
							{
								displayName: 'Reply to thread',
								name: 'reply_broadcast',
								type: 'boolean',
								default: false,
								description:
									'Whether the reply should be made visible to everyone in the channel or conversation. Use in conjunction with thread_ts.',
							},
						],
					},
				],
			},
			{
				displayName: 'Markdown',
				name: 'mrkdwn',
				type: 'boolean',
				default: true,
				description: 'Whether to use Slack Markdown parsing',
			},
			{
				displayName: 'Unfurl Links',
				name: 'unfurl_links',
				type: 'boolean',
				default: false,
				description: 'Whether to enable unfurling of primarily text-based content',
			},
			{
				displayName: 'Unfurl Media',
				name: 'unfurl_media',
				type: 'boolean',
				default: true,
				description: 'Whether to disable unfurling of media content',
			},
			{
				displayName: 'Send as User',
				name: 'sendAsUser',
				type: 'string',
				displayOptions: {
					show: {
						'/authentication': ['accessToken'],
					},
				},
				default: '',
				description:
					'The message will be sent from this username (i.e. as if this individual sent the message). Add chat:write.customize scope on Slack API',
			},
		],
	},

	/* ----------------------------------------------------------------------- */
	/*                                 message:update                          */
	/* ----------------------------------------------------------------------- */
	{
		name: 'channelId',
		displayName: 'Channel',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a channel...',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a channel...',
				typeOptions: {
					searchListMethod: 'getChannels',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Not a valid Slack Channel ID',
						},
					},
				],
				placeholder: 'C0122KQ70S7E',
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://app.slack.com/client/TS9594PZK/B0556F47Z3A',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'http(s)?://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
							errorMessage: 'Not a valid Slack Channel URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: 'https://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
				},
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['update'],
			},
		},
		description: 'The Slack channel to update the message from',
	},
	{
		displayName: 'Message Text',
		name: 'text',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['update'],
			},
		},
		description:
			"The message text to update. Supports <a href='https://api.slack.com/reference/surfaces/formatting'>markdown</a> by default - this can be disabled in 'Options'",
	},
	{
		displayName: 'Message Timestamp',
		name: 'ts',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['update'],
			},
		},
		description: 'Timestamp of the message to update.',
		placeholder: '1663233118.856619',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Link User and Channel names',
				name: 'link_names',
				type: 'boolean',
				default: false,
				description: 'Whether to find and link channel names and usernames',
			},
			{
				displayName: 'Parse',
				name: 'parse',
				type: 'options',
				options: [
					{
						name: 'Client',
						value: 'client',
					},
					{
						name: 'Full',
						value: 'full',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'client',
				description: 'Change how messages are treated',
			},
		],
	},
	{
		displayName: 'Attachments',
		name: 'attachments',
		type: 'collection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add attachment',
		},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['message'],
			},
		},
		default: {}, // TODO: Remove comment: has to make default array for the main property, check where that happens in UI
		placeholder: 'Add attachment item',
		options: [
			{
				displayName: 'Fallback Text',
				name: 'fallback',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Required plain-text summary of the attachment',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Title Link',
				name: 'title_link',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '#ff0000',
				description: 'Color of the line left of text',
			},
			{
				displayName: 'Pretext',
				name: 'pretext',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text which appears before the message block',
			},
			{
				displayName: 'Author Name',
				name: 'author_name',
				type: 'string',
				default: '',
				description: 'Name that should appear',
			},
			{
				displayName: 'Author Link',
				name: 'author_link',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Author Icon',
				name: 'author_icon',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Icon which should appear for the user',
			},
			{
				displayName: 'Image URL',
				name: 'image_url',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Thumbnail URL',
				name: 'thumb_url',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Footer',
				name: 'footer',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text of footer to add',
			},
			{
				displayName: 'Footer Icon',
				name: 'footer_icon',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Icon which should appear next to footer',
			},
			{
				displayName: 'Message Timestamp',
				name: 'ts',
				type: 'dateTime',
				default: '',
				description: 'Timestamp of the message to reply.',
				placeholder: '1663233118.856619',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				placeholder: 'Add Fields',
				description: 'Fields to add to message',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'item',
						displayName: 'Item',
						values: [
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
								description: 'Title of the item',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the item',
							},
							{
								displayName: 'Short',
								name: 'short',
								type: 'boolean',
								default: true,
								description: 'Whether items can be displayed next to each other',
							},
						],
					},
				],
			},
		],
	},

	/* ----------------------------------------------------------------------- */
	/*                                 message:delete
	/* ----------------------------------------------------------------------- */
	{
		name: 'channelId',
		displayName: 'Channel',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a channel...',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a channel...',
				typeOptions: {
					searchListMethod: 'getChannels',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Not a valid Slack Channel ID',
						},
					},
				],
				placeholder: 'C0122KQ70S7E',
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://app.slack.com/client/TS9594PZK/B0556F47Z3A',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'http(s)?://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
							errorMessage: 'Not a valid Slack Channel URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: 'https://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
				},
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['delete'],
			},
		},
		description: 'The Slack channel to delete the message from',
	},
	{
		displayName: 'Message Timestamp',
		name: 'timestamp',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['delete'],
			},
		},
		description: 'Timestamp of the message to delete.',
		placeholder: '1663233118.856619',
	},

	/* ----------------------------------------------------------------------- */
	/*                                 message:search
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'Search query',
		name: 'query',
		type: 'string',
		description: 'The text to search for within messages',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Sort by',
		name: 'sort',
		description: 'How search results should be sorted. You can sort by',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['search'],
			},
		},
		options: [
			{
				name: 'Newest',
				value: 'newest',
			},
			{
				name: 'Oldest',
				value: 'oldest',
			},
			{
				name: 'Relevance Score',
				value: 'relevance',
			},
		],
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['search'],
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
				resource: ['message'],
				operation: ['search'],
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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['search'],
			},
		},
		required: false,
		options: [
			{
				name: 'searchChannel',
				displayName: 'Search in Channel',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				placeholder: 'Select a channel...',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a channel...',
						typeOptions: {
							searchListMethod: 'getChannels',
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[a-zA-Z0-9]{2,}',
									errorMessage: 'Not a valid Slack Channel ID',
								},
							},
						],
						placeholder: 'C0122KQ70S7E',
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'https://app.slack.com/client/TS9594PZK/B0556F47Z3A',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'http(s)?://app.slack.com/client/([a-zA-Z0-9]{2,})/.*',
									errorMessage: 'Not a valid Trello Board URL',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: 'https://trello.com/b/([a-zA-Z0-9]{2,})',
						},
					},
				],
			},
		],
		default: {},
	},
];
