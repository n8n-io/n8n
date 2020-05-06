import {
	IExecuteFunctions,
 } from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import {
	validateJSON,
} from './GenericFunctions';

interface Attachment {
	fields: {
		item?: object[];
	};
}

interface Text {
	type?: string;
	text?: string;
	emoji?: boolean;
	verbatim?: boolean;
}

interface Confirm {
	title?: Text;
	text?: Text;
	confirm?: Text;
	deny?: Text;
	style?: string;
}

interface Element {
	type?: string;
	text?: Text;
	action_id?: string;
	url?: string;
	value?: string;
	style?: string;
	confirm?: Confirm;
}

interface Block {
	type?: string;
	elements?: Element[];
	block_id?: string;
	text?: Text;
	fields?: Text[];
	accessory?: Element;
}

export class Slack implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Slack',
		name: 'slack',
		icon: 'file:slack.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Slack',
		defaults: {
			name: 'Slack',
			color: '#BB2244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'slackApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'channel',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new channel',
					},
					{
						name: 'Invite',
						value: 'invite',
						description: 'Invite a user to a channel',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

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
				],
				default: 'post',
				description: 'The operation to perform.',
			},



			// ----------------------------------
			//         channel
			// ----------------------------------

			// ----------------------------------
			//         channel:create
			// ----------------------------------
			{
				displayName: 'Name',
				name: 'channel',
				type: 'string',
				default: '',
				placeholder: 'Channel name',
				displayOptions: {
					show: {
						operation: [
							'create'
						],
						resource: [
							'channel',
						],
					},
				},
				required: true,
				description: 'The name of the channel to create.',
			},

			// ----------------------------------
			//         channel:invite
			// ----------------------------------
			{
				displayName: 'Channel ID',
				name: 'channel',
				type: 'string',
				default: '',
				placeholder: 'myChannel',
				displayOptions: {
					show: {
						operation: [
							'invite'
						],
						resource: [
							'channel',
						],
					},
				},
				required: true,
				description: 'The ID of the channel to invite user to.',
			},
			{
				displayName: 'User ID',
				name: 'username',
				type: 'string',
				default: '',
				placeholder: 'frank',
				displayOptions: {
					show: {
						operation: [
							'invite'
						],
						resource: [
							'channel',
						],
					},
				},
				required: true,
				description: 'The ID of the user to invite into channel.',
			},



			// ----------------------------------
			//         message
			// ----------------------------------

			// ----------------------------------
			//         message:post
			// ----------------------------------
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				default: '',
				placeholder: 'Channel name',
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
							'post'
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
							false
						],
						operation: [
							'post'
						],
						resource: [
							'message',
						],
					},
				},
				description: 'Set the bot\'s user name.',
			},
			{
				displayName: 'JSON parameters',
				name: 'jsonParameters',
				type: 'boolean',
				default: false,
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
							'post'
						],
						resource: [
							'message',
						],
						jsonParameters: [
							false,
						],
					},
				},
				default: {}, // TODO: Remove comment: has to make default array for the main property, check where that happens in UI
				description: 'The attachments to add',
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
				displayName: 'Blocks',
				name: 'blocksUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Block',
				},
				displayOptions: {
					show: {
						operation: [
							'post'
						],
						resource: [
							'message',
						],
						jsonParameters: [
							false,
						],
					},
				},
				default: {},
				description: 'The blocks to add',
				placeholder: 'Add Block',
				options: [
					{
						name: 'blocksValues',
						displayName: 'Block',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Actions',
										value: 'actions',
									},
									{
										name: 'Section',
										value: 'section',
									},
								],
								default: 'actions',
							},
							{
								displayName: 'Block ID',
								name: 'blockId',
								type: 'string',
								displayOptions: {
									show: {
										type: [
											'actions',
										],
									},
								},
								default: '',
								description: `A string acting as a unique identifier for a block.</br>
								You can use this block_id when you receive an interaction payload to</br>
								identify the source of the action. If not specified, a block_id will be generated.</br>
								Maximum length for this field is 255 characters.`,
							},
							{
								displayName: 'Elements',
								name: 'elementsUi',
								placeholder: 'Add Element',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								displayOptions: {
									show: {
										type: [
											'actions',
										],
									},
								},
								default: {},
								options: [
									{
										name: 'elementsValues',
										displayName: 'Element',
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
												],
												default: 'button',
												description: 'The type of element',
											},
											{
												displayName: 'Text',
												name: 'text',
												type: 'string',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												default: '',
												description: 'The text for the block.',
											},
											{
												displayName: 'Emoji',
												name: 'emoji',
												type: 'boolean',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												default: false,
												description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format.',
											},
											{
												displayName: 'Action ID',
												name: 'actionId',
												type: 'string',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												default: '',
												description: `An identifier for this action. You can use this when you receive an interaction</br>
												payload to identify the source of the action. Should be unique among all other action_ids used</br>
												elsewhere by your app. `,
											},
											{
												displayName: 'URL',
												name: 'url',
												type: 'string',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												default: '',
												description: `A URL to load in the user's browser when the button is clicked.</br>
												Maximum length for this field is 3000 characters. If you're using url, you'll still</br>
												receive an interaction payload and will need to send an acknowledgement response.`,
											},
											{
												displayName: 'Value',
												name: 'value',
												type: 'string',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												default: '',
												description: 'The value to send along with the interaction payload.',
											},
											{
												displayName: 'Style',
												name: 'style',
												type: 'options',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												options: [
													{
														name: 'Danger',
														value: 'danger',
													},
													{
														name: 'Default',
														value: 'default',
													},
													{
														name: 'Primary',
														value: 'primary',
													},
												],
												default: 'default',
												description: 'Decorates buttons with alternative visual color schemes.',
											},
											{
												displayName: 'Confirm',
												name: 'confirmUi',
												placeholder: 'Add Confirm',
												type: 'fixedCollection',
												typeOptions: {
													multipleValues: false,
												},
												default: {},
												options: [
													{
														name: 'confirmValue',
														displayName: 'Confirm',
														values: [
															{
																displayName: 'Title',
																name: 'titleUi',
																placeholder: 'Add Title',
																type: 'fixedCollection',
																typeOptions: {
																	multipleValues: false,
																},
																default: {},
																options: [
																	{
																		name: 'titleValue',
																		displayName: 'Title',
																		values: [
																			{
																				displayName: 'Text',
																				name: 'text',
																				type: 'string',
																				default: '',
																				description: 'Text of the title.',
																			},
																			{
																				displayName: 'Emoji',
																				name: 'emoji',
																				type: 'boolean',
																				default: false,
																				description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format',
																			},
																		],
																	},
																],
																description: `Defines the dialog's title.`,
															},
															{
																displayName: 'Text',
																name: 'textUi',
																placeholder: 'Add Text',
																type: 'fixedCollection',
																typeOptions: {
																	multipleValues: false,
																},
																default: {},
																options: [
																	{
																		name: 'textValue',
																		displayName: 'Text',
																		values: [
																			{
																				displayName: 'Text',
																				name: 'text',
																				type: 'string',
																				default: '',
																				description: 'The text for the block',
																			},
																			{
																				displayName: 'Emoji',
																				name: 'emoji',
																				type: 'boolean',
																				default: false,
																				description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format',
																			},
																		],
																	},
																],
																description: `Defines the explanatory text that appears in the confirm dialog.`,
															},
															{
																displayName: 'Confirm',
																name: 'confirmTextUi',
																placeholder: 'Add Confirm',
																type: 'fixedCollection',
																typeOptions: {
																	multipleValues: false,
																},
																default: {},
																options: [
																	{
																		name: 'confirmValue',
																		displayName: 'Confirm',
																		values: [
																			{
																				displayName: 'Text',
																				name: 'text',
																				type: 'string',
																				default: '',
																				description: `Defines the explanatory text that appears in the confirm dialog.`,
																			},
																			{
																				displayName: 'Emoji',
																				name: 'emoji',
																				type: 'boolean',
																				default: false,
																				description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format',
																			},
																		],
																	},
																],
																description: 'Defines the text of the button that confirms the action',
															},
															{
																displayName: 'Deny',
																name: 'denyUi',
																placeholder: 'Add Deny',
																type: 'fixedCollection',
																typeOptions: {
																	multipleValues: false,
																},
																default: {},
																options: [
																	{
																		name: 'denyValue',
																		displayName: 'Deny',
																		values: [
																			{
																				displayName: 'Text',
																				name: 'text',
																				type: 'string',
																				default: '',
																				description: 'Defines the text of the button that cancels the action',
																			},
																			{
																				displayName: 'Emoji',
																				name: 'emoji',
																				type: 'boolean',
																				default: false,
																				description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format',
																			},
																		],
																	},
																],
																description: 'Defines the text of the button that cancels the action',
															},
															{
																displayName: 'Style',
																name: 'style',
																type: 'options',
																options: [
																	{
																		name: 'Danger',
																		value: 'danger',
																	},
																	{
																		name: 'Default',
																		value: 'default',
																	},
																	{
																		name: 'Primary',
																		value: 'primary',
																	},
																],
																default: 'default',
																description: 'Defines the color scheme applied to the confirm button.',
															},
														],
													},
												],
												description: 'Defines an optional confirmation dialog after the button is clicked.',
											},
										],
									},
								],
							},
							{
								displayName: 'Block ID',
								name: 'blockId',
								type: 'string',
								displayOptions: {
									show: {
										type: [
											'section',
										],
									},
								},
								default: '',
								description: `A string acting as a unique identifier for a block.</br>
								You can use this block_id when you receive an interaction payload to</br>
								identify the source of the action. If not specified, a block_id will be generated.</br>
								Maximum length for this field is 255 characters.`,
							},
							{
								displayName: 'Text',
								name: 'textUi',
								placeholder: 'Add Text',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: false,
								},
								displayOptions: {
									show: {
										type: [
											'section',
										],
									},
								},
								default: {},
								options: [
									{
										name: 'textValue',
										displayName: 'Text',
										values: [
											{
												displayName: 'Type',
												name: 'type',
												type: 'options',
												options: [
													{
														name: 'Markdowm',
														value: 'mrkwdn',
													},
													{
														name: 'Plain Text',
														value: 'plainText',
													},
												],
												default: 'mrkwdn',
												description: 'The formatting to use for this text object.',
											},
											{
												displayName: 'Text',
												name: 'text',
												type: 'string',
												default: '',
												description: 'The text for the block. This field accepts any of the standard text formatting markup when type is mrkdwn.',
											},
											{
												displayName: 'Emoji',
												name: 'emoji',
												displayOptions: {
													show: {
														type: [
															'plainText',
														],
													},
												},
												type: 'boolean',
												default: false,
												description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format. This field is only usable when type is plain_text.',
											},
											{
												displayName: 'Verbatim',
												name: 'verbatim',
												displayOptions: {
													show: {
														type: [
															'mrkwdn',
														],
													},
												},
												type: 'boolean',
												default: false,
												description: 'When set to false (as is default) URLs will be auto-converted into links, conversation names will be link-ified, and certain mentions will be automatically parsed. ',
											},
										],
									},
								],
								description: 'Define the text of the button that cancels the action',
							},
							{
								displayName: 'Fields',
								name: 'fieldsUi',
								placeholder: 'Add Fields',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
								},
								displayOptions: {
									show: {
										type: [
											'section',
										],
									},
								},
								default: {},
								options: [
									{
										name: 'fieldsValues',
										displayName: 'Text',
										values: [
											{
												displayName: 'Type',
												name: 'type',
												type: 'options',
												options: [
													{
														name: 'Markdowm',
														value: 'mrkwdn',
													},
													{
														name: 'Plain Text',
														value: 'plainText',
													},
												],
												default: 'mrkwdn',
												description: 'The formatting to use for this text object.',
											},
											{
												displayName: 'Text',
												name: 'text',
												type: 'string',
												default: '',
												description: 'The text for the block. This field accepts any of the standard text formatting markup when type is mrkdwn.',
											},
											{
												displayName: 'Emoji',
												name: 'emoji',
												type: 'boolean',
												displayOptions: {
													show: {
														type: [
															'plainText',
														],
													},
												},
												default: false,
												description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format. This field is only usable when type is plain_text.',
											},
											{
												displayName: 'Verbatim',
												name: 'verbatim',
												displayOptions: {
													show: {
														type: [
															'mrkwdn',
														],
													},
												},
												type: 'boolean',
												default: false,
												description: 'When set to false (as is default) URLs will be auto-converted into links, conversation names will be link-ified, and certain mentions will be automatically parsed. ',
											},
										],
									},
								],
								description: `An array of text objects. Any text objects included with</br>
								fields will be rendered in a compact format that allows for 2 columns of</br>
								side-by-side text. Maximum number of items is 10.`,
							},
							{
								displayName: 'Accessory',
								name: 'accessoryUi',
								placeholder: 'Add Accessory',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: false,
								},
								displayOptions: {
									show: {
										type: [
											'section',
										],
									},
								},
								default: {},
								options: [
									{
										name: 'accessoriesValues',
										displayName: 'Accessory',
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
												],
												default: 'button',
												description: 'The type of element',
											},
											{
												displayName: 'Text',
												name: 'text',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												type: 'string',
												default: '',
												description: 'The text for the block.',
											},
											{
												displayName: 'Emoji',
												name: 'emoji',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												type: 'boolean',
												default: false,
												description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format.',
											},
											{
												displayName: 'Action ID',
												name: 'actionId',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												type: 'string',
												default: '',
												description: `An identifier for this action. You can use this when you receive an interaction</br>
												payload to identify the source of the action. Should be unique among all other action_ids used</br>
												elsewhere by your app. `,
											},
											{
												displayName: 'URL',
												name: 'url',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												type: 'string',
												default: '',
												description: `A URL to load in the user's browser when the button is clicked.</br>
												Maximum length for this field is 3000 characters. If you're using url, you'll still</br>
												receive an interaction payload and will need to send an acknowledgement response.`,
											},
											{
												displayName: 'Value',
												name: 'value',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												type: 'string',
												default: '',
												description: 'The value to send along with the interaction payload.',
											},
											{
												displayName: 'Style',
												name: 'style',
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												type: 'options',
												options: [
													{
														name: 'Danger',
														value: 'danger',
													},
													{
														name: 'Default',
														value: 'default',
													},
													{
														name: 'Primary',
														value: 'primary',
													},
												],
												default: 'default',
												description: 'Decorates buttons with alternative visual color schemes.',
											},
											{
												displayName: 'Confirm',
												name: 'confirmUi',
												placeholder: 'Add Confirm',
												type: 'fixedCollection',
												typeOptions: {
													multipleValues: false,
												},
												displayOptions: {
													show: {
														type: [
															'button',
														],
													},
												},
												default: {},
												options: [
													{
														name: 'confirmValue',
														displayName: 'Confirm',
														values: [
															{
																displayName: 'Title',
																name: 'titleUi',
																placeholder: 'Add Title',
																type: 'fixedCollection',
																typeOptions: {
																	multipleValues: false,
																},
																default: {},
																options: [
																	{
																		name: 'titleValue',
																		displayName: 'Title',
																		values: [
																			{
																				displayName: 'Text',
																				name: 'text',
																				type: 'string',
																				default: '',
																				description: 'Text of the title.',
																			},
																			{
																				displayName: 'Emoji',
																				name: 'emoji',
																				type: 'boolean',
																				default: false,
																				description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format',
																			},
																		],
																	},
																],
																description: 'Defines an optional confirmation dialog after the button is clicked.',
															},
															{
																displayName: 'Text',
																name: 'textUi',
																placeholder: 'Add Text',
																type: 'fixedCollection',
																typeOptions: {
																	multipleValues: false,
																},
																default: {},
																options: [
																	{
																		name: 'textValue',
																		displayName: 'Text',
																		values: [
																			{
																				displayName: 'Text',
																				name: 'text',
																				type: 'string',
																				default: '',
																				description: 'The text for the block',
																			},
																			{
																				displayName: 'Emoji',
																				name: 'emoji',
																				type: 'boolean',
																				default: false,
																				description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format',
																			},
																		],
																	},
																],
																description: `Defines the explanatory text that appears in the confirm dialog.`,
															},
															{
																displayName: 'Confirm',
																name: 'confirmTextUi',
																placeholder: 'Add Confirm',
																type: 'fixedCollection',
																typeOptions: {
																	multipleValues: false,
																},
																default: {},
																options: [
																	{
																		name: 'confirmValue',
																		displayName: 'Confirm',
																		values: [
																			{
																				displayName: 'Text',
																				name: 'text',
																				type: 'string',
																				default: '',
																				description: `Defines the explanatory text that appears in the confirm dialog.`,
																			},
																			{
																				displayName: 'Emoji',
																				name: 'emoji',
																				type: 'boolean',
																				default: false,
																				description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format',
																			},
																		],
																	},
																],
																description: `Defines the explanatory text that appears in the confirm dialog.`,
															},
															{
																displayName: 'Deny',
																name: 'denyUi',
																placeholder: 'Add Deny',
																type: 'fixedCollection',
																typeOptions: {
																	multipleValues: false,
																},
																default: {},
																options: [
																	{
																		name: 'denyValue',
																		displayName: 'Deny',
																		values: [
																			{
																				displayName: 'Text',
																				name: 'text',
																				type: 'string',
																				default: '',
																				description: 'Define the text of the button that cancels the action',
																			},
																			{
																				displayName: 'Emoji',
																				name: 'emoji',
																				type: 'boolean',
																				default: false,
																				description: 'Indicates whether emojis in a text field should be escaped into the colon emoji format',
																			},
																		],
																	},
																],
																description: 'Define the text of the button that cancels the action',
															},
															{
																displayName: 'Style',
																name: 'style',
																type: 'options',
																options: [
																	{
																		name: 'Danger',
																		value: 'danger',
																	},
																	{
																		name: 'Default',
																		value: 'default',
																	},
																	{
																		name: 'Primary',
																		value: 'primary',
																	},
																],
																default: 'default',
																description: 'Defines the color scheme applied to the confirm button.',
															},
														],
													},
												],
												description: 'Defines an optional confirmation dialog after the button is clicked.',
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
				displayName: 'Attachments',
				name: 'attachmentsJson',
				type: 'json',
				default: '',
				required: false,
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'post',
						],
						jsonParameters: [
							true,
						],
					},
				},
				description: 'The attachments to add',
			},
			{
				displayName: 'Blocks',
				name: 'blocksJson',
				type: 'json',
				default: '',
				required: false,
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'post',
						],
						jsonParameters: [
							true,
						],
					},
				},
				description: 'The blocks to add',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = this.getCredentials('slackApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const baseUrl = `https://slack.com/api/`;
		let operation: string;
		let resource: string;
		let requestMethod = 'POST';

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			let endpoint = '';
			body = {};
			qs = {};

			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;

			if (resource === 'channel') {
				if (operation === 'create') {
					// ----------------------------------
					//         channel:create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'channels.create';

					body.name = this.getNodeParameter('channel', i) as string;
				} else if (operation === 'invite') {
					// ----------------------------------
					//         channel:invite
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'channels.invite';

					body.channel = this.getNodeParameter('channel', i) as string;
					body.user = this.getNodeParameter('username', i) as string;
				}
			} else if (resource === 'message') {
				if (operation === 'post') {
					// ----------------------------------
					//         message:post
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'chat.postMessage';

					body.channel = this.getNodeParameter('channel', i) as string;
					body.text = this.getNodeParameter('text', i) as string;
					body.as_user = this.getNodeParameter('as_user', i) as boolean;
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					if (body.as_user === false) {
						body.username = this.getNodeParameter('username', i) as string;
					}

					if (!jsonParameters) {
						const attachments = this.getNodeParameter('attachments', i, []) as unknown as Attachment[];
						const blocksUi = (this.getNodeParameter('blocksUi', i, []) as IDataObject).blocksValues  as IDataObject[];


						// The node does save the fields data differently than the API
						// expects so fix the data befre we send the request
						for (const attachment of attachments) {
							if (attachment.fields !== undefined) {
								if (attachment.fields.item !== undefined) {
									// Move the field-content up
									// @ts-ignore
									attachment.fields = attachment.fields.item;
								} else {
									// If it does not have any items set remove it
									delete attachment.fields;
								}
							}
						}
						body['attachments'] = attachments;

						if (blocksUi) {
							const blocks: Block[] = [];
							for (const blockUi of blocksUi) {
								const block: Block = {};
								const elements: Element[] = [];
								block.block_id = blockUi.blockId as string;
								block.type = blockUi.type as string;
								if (block.type === 'actions') {
									const elementsUi = (blockUi.elementsUi as IDataObject).elementsValues  as IDataObject[];
									if (elementsUi) {
										for (const elementUi of elementsUi) {
											const element: Element = {};
											if (elementUi.actionId === '') {
												throw new Error('Action ID must be set');
											}
											if (elementUi.text === '') {
												throw new Error('Text must be set');
											}
											element.action_id = elementUi.actionId as string;
											element.type = elementUi.type as string;
											element.text = {
												text: elementUi.text as string,
												type: 'plain_text',
												emoji: elementUi.emoji as boolean,
											 };
											if (elementUi.url) {
												element.url = elementUi.url as string;
											}
											if (elementUi.value) {
												element.value = elementUi.value as string;
											}
											if (elementUi.style !== 'default') {
												element.style = elementUi.style as string;
											}
											const confirmUi = (elementUi.confirmUi as IDataObject).confirmValue  as IDataObject;
											 if (confirmUi) {
												const confirm: Confirm = {};
												const titleUi = (confirmUi.titleUi as IDataObject).titleValue  as IDataObject;
												const textUi = (confirmUi.textUi as IDataObject).textValue  as IDataObject;
												const confirmTextUi = (confirmUi.confirmTextUi as IDataObject).confirmValue  as IDataObject;
												const denyUi = (confirmUi.denyUi as IDataObject).denyValue  as IDataObject;
												const style = confirmUi.style as string;
												if (titleUi) {
													confirm.title = {
														type: 'plain_text',
														text: titleUi.text as string,
														emoji: titleUi.emoji as boolean,
													};
												}
												if (textUi) {
													confirm.text = {
														type: 'plain_text',
														text: textUi.text as string,
														emoji: textUi.emoji as boolean,
													};
												}
												if (confirmTextUi) {
													confirm.confirm = {
														type: 'plain_text',
														text: confirmTextUi.text as string,
														emoji: confirmTextUi.emoji as boolean,
													};
												}
												if (denyUi) {
													confirm.deny = {
														type: 'plain_text',
														text: denyUi.text as string,
														emoji: denyUi.emoji as boolean,
													};
												}
												if (style !== 'default') {
													confirm.style = style as string;
												}
												element.confirm = confirm;
											 }
											 elements.push(element);
										}
										block.elements = elements;
									}
								} else if (block.type === 'section') {
									const textUi = (blockUi.textUi as IDataObject).textValue  as IDataObject;
									if (textUi) {
										const text: Text = {};
										if (textUi.type === 'plainText') {
											text.type = 'plain_text';
											text.emoji = textUi.emoji as boolean;
										} else {
											text.type = 'mrkdwn';
											text.verbatim = textUi.verbatim as boolean;
										}
										text.text = textUi.text as string;
										block.text = text;
									} else {
										throw new Error('Property text must be defined');
									}
									const fieldsUi = (blockUi.fieldsUi as IDataObject).fieldsValues  as IDataObject[];
									if (fieldsUi) {
										const fields: Text[] = [];
										for (const fieldUi of fieldsUi) {
											const field: Text = {};
											if (fieldUi.type === 'plainText') {
												field.type = 'plain_text';
												field.emoji = fieldUi.emoji as boolean;
											} else {
												field.type = 'mrkdwn';
												field.verbatim = fieldUi.verbatim as boolean;
											}
											field.text = fieldUi.text as string;
											fields.push(field);
										}
										// If not fields were added then it's not needed to send the property
										if (fields.length > 0) {
											block.fields = fields;
										}
									}
									const accessoryUi = (blockUi.accessoryUi as IDataObject).accessoriesValues  as IDataObject;
									if (accessoryUi) {
										const accessory: Element = {};
										if (accessoryUi.type === 'button') {
											accessory.type = 'button';
											accessory.text = {
												text: accessoryUi.text as string,
												type: 'plain_text',
												emoji: accessoryUi.emoji as boolean,
											};
											if (accessoryUi.url) {
												accessory.url = accessoryUi.url as string;
											}
											if (accessoryUi.value) {
												accessory.value = accessoryUi.value as string;
											}
											if (accessoryUi.style !== 'default') {
												accessory.style = accessoryUi.style as string;
											}
											const confirmUi = (accessoryUi.confirmUi as IDataObject).confirmValue  as IDataObject;
											if (confirmUi) {
											   const confirm: Confirm = {};
											   const titleUi = (confirmUi.titleUi as IDataObject).titleValue  as IDataObject;
											   const textUi = (confirmUi.textUi as IDataObject).textValue  as IDataObject;
											   const confirmTextUi = (confirmUi.confirmTextUi as IDataObject).confirmValue  as IDataObject;
											   const denyUi = (confirmUi.denyUi as IDataObject).denyValue  as IDataObject;
											   const style = confirmUi.style as string;
											   if (titleUi) {
												   confirm.title = {
													   type: 'plain_text',
													   text: titleUi.text as string,
													   emoji: titleUi.emoji as boolean,
												   };
											   }
											   if (textUi) {
												   confirm.text = {
													   type: 'plain_text',
													   text: textUi.text as string,
													   emoji: textUi.emoji as boolean,
												   };
											   }
											   if (confirmTextUi) {
												   confirm.confirm = {
													   type: 'plain_text',
													   text: confirmTextUi.text as string,
													   emoji: confirmTextUi.emoji as boolean,
												   };
											   }
											   if (denyUi) {
												   confirm.deny = {
													   type: 'plain_text',
													   text: denyUi.text as string,
													   emoji: denyUi.emoji as boolean,
												   };
											   }
											   if (style !== 'default') {
												   confirm.style = style as string;
											   }
											   accessory.confirm = confirm;
											}
										}
										block.accessory = accessory;
									}
								}
								blocks.push(block);
							}
							body.blocks = blocks;
						}

					} else {
						const attachmentsJson = this.getNodeParameter('attachmentsJson', i, []) as string;
						const blocksJson = this.getNodeParameter('blocksJson', i, []) as string;
						if (attachmentsJson !== '' && validateJSON(attachmentsJson) === undefined) {
							throw new Error('Attachments it is not a valid json');
						}
						if (blocksJson !== '' && validateJSON(blocksJson) === undefined) {
							throw new Error('Blocks it is not a valid json');
						}
						if (attachmentsJson !== '') {
							body.attachments = attachmentsJson;
						}
						if (blocksJson !== '') {
							body.blocks = blocksJson;
						}
					}
					// Add all the other options to the request
					const otherOptions = this.getNodeParameter('otherOptions', i) as IDataObject;
					Object.assign(body, otherOptions);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const options = {
				method: requestMethod,
				body,
				qs,
				uri: `${baseUrl}/${endpoint}`,
				headers: {
					Authorization: `Bearer ${credentials.accessToken }`,
					'content-type': 'application/json; charset=utf-8'
				},
				json: true
			};

			const responseData = await this.helpers.request(options);

			if (!responseData.ok) {
				throw new Error(`Request to Slack did fail with error: "${responseData.error}"`);
			}

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
