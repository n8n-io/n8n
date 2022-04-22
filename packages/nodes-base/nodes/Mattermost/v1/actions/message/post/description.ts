import {
	MessageProperties,
} from '../../Interfaces';

export const messagePostDescription: MessageProperties = [
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		options: [],
		default: '',
		required: true,
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
		description: 'The ID of the channel to post to.',
	},
	{
		displayName: 'Message',
		name: 'message',
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
		default: {},
		description: 'The attachment to add',
		placeholder: 'Add attachment item',
		options: [
			{
				displayName: 'Actions',
				name: 'actions',
				placeholder: 'Add Actions',
				description: 'Actions to add to message. More information can be found <a href="https://docs.mattermost.com/developer/interactive-messages.html" target="_blank">here</a>',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Item',
						name: 'item',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Button',
										value: 'button',
									},
									{
										name: 'Select',
										value: 'select',
									},
								],
								default: 'button',
								description: 'The type of the action.',
							},
							{
								displayName: 'Data Source',
								name: 'data_source',
								type: 'options',
								displayOptions: {
									show: {
										type: [
											'select',
										],
									},
								},
								options: [
									{
										name: 'Channels',
										value: 'channels',
									},
									{
										name: 'Custom',
										value: 'custom',
									},
									{
										name: 'Users',
										value: 'users',
									},

								],
								default: 'custom',
								description: 'The type of the action.',
							},
							{
								displayName: 'Options',
								name: 'options',
								placeholder: 'Add Option',
								description: 'Adds a new option to select field.',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								displayOptions: {
									show: {
										data_source: [
											'custom',
										],
										type: [
											'select',
										],
									},
								},
								default: {},
								options: [
									{
										name: 'option',
										displayName: 'Option',
										default: {},
										values: [
											{
												displayName: 'Option Text',
												name: 'text',
												type: 'string',
												default: '',
												description: 'Text of the option.',
											},
											{
												displayName: 'Option Value',
												name: 'value',
												type: 'string',
												default: '',
												description: 'Value of the option.',
											},
										],
									},
								],
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the Action.',
							},
							{
								displayName: 'Integration',
								name: 'integration',
								placeholder: 'Add Integration',
								description: 'Integration to add to message.',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: false,
								},
								default: {},
								options: [
									{
										displayName: 'Item',
										name: 'item',
										default: {},
										values: [
											{
												displayName: 'URL',
												name: 'url',
												type: 'string',
												default: '',
												description: 'URL of the Integration.',
											},
											{
												displayName: 'Context',
												name: 'context',
												placeholder: 'Add Context to Integration',
												description: 'Adds a Context values set.',
												type: 'fixedCollection',
												typeOptions: {
													multipleValues: true,
												},
												default: {},
												options: [
													{
														name: 'property',
														displayName: 'Property',
														default: {},
														values: [
															{
																displayName: 'Property Name',
																name: 'name',
																type: 'string',
																default: '',
																description: 'Name of the property to set.',
															},
															{
																displayName: 'Property Value',
																name: 'value',
																type: 'string',
																default: '',
																description: 'Value of the property to set.',
															},
														],
													},
												],
											},
										],
									},
								],
							},
						],
					},
				],
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
				displayName: 'Author Name',
				name: 'author_name',
				type: 'string',
				default: '',
				description: 'Name that should appear.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '#ff0000',
				description: 'Color of the line left of text.',
			},
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
						],
					},
				],
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
		],
	},
	{
		displayName: 'Other Options',
		name: 'otherOptions',
		type: 'collection',
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
		default: {},
		description: 'Other options to set',
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Make Comment',
				name: 'root_id',
				type: 'string',
				default: '',
				description: 'The post ID to comment on',
			},
		],
	},
];
