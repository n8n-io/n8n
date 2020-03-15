import { INodeProperties } from 'n8n-workflow';

export const messageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				name: 'Post',
				value: 'post',
				description: 'Post a message into a channel',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Updates a message.',
			},
		],
		default: 'post',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const messageFields = [

/* -------------------------------------------------------------------------- */
/*                                message:post                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel',
		name: 'channel',
		type: 'string',
		default: '',
		placeholder: 'Channel name',
		displayOptions: {
			show: {
				operation: [
					'post',
				],
				resource: [
					'message',
				],
			},
		},
		required: true,
		description: 'The channel to send the message to.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				operation: [
					'post',
				],
				resource: [
					'message',
				],
			},
		},
		description: 'The text to send.',
	},
	{
		displayName: 'As User',
		name: 'as_user',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				authentication: [
					'accessToken',
				],
				operation: [
					'post'
				],
				resource: [
					'message',
				],
			},
		},
		description: 'Post the message as authenticated user instead of bot.',
	},
	{
		displayName: 'User Name',
		name: 'username',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				as_user: [
					false,
				],
				operation: [
					'post',
				],
				resource: [
					'message',
				],
			},
		},
		description: 'Set the bot\'s user name.',
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
				operation: [
					'post',
				],
				resource: [
					'message',
				],
			},
		},
		default: {}, // TODO: Remove comment: has to make default array for the main property, check where that happens in UI
		description: 'The attachment to add',
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
				description: 'Required plain-text summary of the attachment.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text to send.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Title of the message.',
			},
			{
				displayName: 'Title Link',
				name: 'title_link',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Link of the title.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '#ff0000',
				description: 'Color of the line left of text.',
			},
			{
				displayName: 'Pretext',
				name: 'pretext',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text which appears before the message block.',
			},
			{
				displayName: 'Author Name',
				name: 'author_name',
				type: 'string',
				default: '',
				description: 'Name that should appear.',
			},
			{
				displayName: 'Author Link',
				name: 'author_link',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Link for the author.',
			},
			{
				displayName: 'Author Icon',
				name: 'author_icon',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Icon which should appear for the user.',
			},
			{
				displayName: 'Image URL',
				name: 'image_url',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'URL of image.',
			},
			{
				displayName: 'Thumbnail URL',
				name: 'thumb_url',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'URL of thumbnail.',
			},
			{
				displayName: 'Footer',
				name: 'footer',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text of footer to add.',
			},
			{
				displayName: 'Footer Icon',
				name: 'footer_icon',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Icon which should appear next to footer.',
			},
			{
				displayName: 'Timestamp',
				name: 'ts',
				type: 'dateTime',
				default: '',
				description: 'Time message relates to.',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				placeholder: 'Add Fields',
				description: 'Fields to add to message.',
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
								description: 'Title of the item.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the item.',
							},
							{
								displayName: 'Short',
								name: 'short',
								type: 'boolean',
								default: true,
								description: 'If items can be displayed next to each other.',
							},
						]
					},
				],
			}
		],
	},
	{
		displayName: 'Other Options',
		name: 'otherOptions',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'post'
				],
				resource: [
					'message',
				],
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
				displayOptions: {
					show: {
						'/as_user': [
							false
						],
						'/operation': [
							'post'
						],
						'/resource': [
							'message',
						],
					},
				},
				default: '',
				description: 'Emoji to use as the icon for this message. Overrides icon_url.',
			},
			{
				displayName: 'Icon URL',
				name: 'icon_url',
				type: 'string',
				displayOptions: {
					show: {
						'/as_user': [
							false
						],
						'/operation': [
							'post'
						],
						'/resource': [
							'message',
						],
					},
				},
				default: '',
				description: 'URL to an image to use as the icon for this message.',
			},
			{
				displayName: 'Make Reply',
				name: 'thread_ts',
				type: 'string',
				default: '',
				description: 'Provide another message\'s ts value to make this message a reply.',
			},
			{
				displayName: 'Unfurl Links',
				name: 'unfurl_links',
				type: 'boolean',
				default: false,
				description: 'Pass true to enable unfurling of primarily text-based content.',
			},
			{
				displayName: 'Unfurl Media',
				name: 'unfurl_media',
				type: 'boolean',
				default: true,
				description: 'Pass false to disable unfurling of media content.',
			},
			{
				displayName: 'Markdown',
				name: 'mrkdwn',
				type: 'boolean',
				default: true,
				description: 'Use Slack Markdown parsing.',
			},
			{
				displayName: 'Reply Broadcast',
				name: 'reply_broadcast',
				type: 'boolean',
				default: false,
				description: 'Used in conjunction with thread_ts and indicates whether reply should be made visible to everyone in the channel or conversation.',
			},
			{
				displayName: 'Link Names',
				name: 'link_names',
				type: 'boolean',
				default: false,
				description: 'Find and link channel names and usernames.',
			},
		],
	},
/* ----------------------------------------------------------------------- */
/*                                 message:update                          */
/* ----------------------------------------------------------------------- */
	{
		displayName: 'Channel',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				]
			},
		},
		description: 'Channel containing the message to be updated.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				]
			},
		},
		description: `New text for the message, using the default formatting rules. It's not required when presenting attachments.`,
	},
	{
		displayName: 'TS',
		name: 'ts',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				]
			},
		},
		description: `Timestamp of the message to be updated.`,
	},
	{
		displayName: 'As User',
		name: 'as_user',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				authentication: [
					'accessToken',
				],
				operation: [
					'update'
				],
				resource: [
					'message',
				],
			},
		},
		description: 'Pass true to update the message as the authed user. Bot users in this context are considered authed users.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Link Names',
				name: 'link_names',
				type: 'boolean',
				default: false,
				description: 'Find and link channel names and usernames.',
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
				operation: [
					'update'
				],
				resource: [
					'message',
				],
			},
		},
		default: {}, // TODO: Remove comment: has to make default array for the main property, check where that happens in UI
		description: 'The attachment to add',
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
				description: 'Required plain-text summary of the attachment.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text to send.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Title of the message.',
			},
			{
				displayName: 'Title Link',
				name: 'title_link',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Link of the title.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '#ff0000',
				description: 'Color of the line left of text.',
			},
			{
				displayName: 'Pretext',
				name: 'pretext',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text which appears before the message block.',
			},
			{
				displayName: 'Author Name',
				name: 'author_name',
				type: 'string',
				default: '',
				description: 'Name that should appear.',
			},
			{
				displayName: 'Author Link',
				name: 'author_link',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Link for the author.',
			},
			{
				displayName: 'Author Icon',
				name: 'author_icon',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Icon which should appear for the user.',
			},
			{
				displayName: 'Image URL',
				name: 'image_url',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'URL of image.',
			},
			{
				displayName: 'Thumbnail URL',
				name: 'thumb_url',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'URL of thumbnail.',
			},
			{
				displayName: 'Footer',
				name: 'footer',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text of footer to add.',
			},
			{
				displayName: 'Footer Icon',
				name: 'footer_icon',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Icon which should appear next to footer.',
			},
			{
				displayName: 'Timestamp',
				name: 'ts',
				type: 'dateTime',
				default: '',
				description: 'Time message relates to.',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				placeholder: 'Add Fields',
				description: 'Fields to add to message.',
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
								description: 'Title of the item.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the item.',
							},
							{
								displayName: 'Short',
								name: 'short',
								type: 'boolean',
								default: true,
								description: 'If items can be displayed next to each other.',
							},
						]
					},
				],
			}
		],
	},
] as INodeProperties[];
