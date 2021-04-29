import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	apiRequest,
	apiRequestAllItems,
	IAttachment,
} from './GenericFunctions';

import {
	snakeCase,
} from 'change-case';

export class Mattermost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mattermost',
		name: 'mattermost',
		icon: 'file:mattermost.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Mattermost',
		defaults: {
			name: 'Mattermost',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mattermostApi',
				required: true,
			},
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
					{
						name: 'Reaction',
						value: 'reaction',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'message',
				description: 'The resource to operate on',
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
						name: 'Add User',
						value: 'addUser',
						description: 'Add a user to a channel',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new channel',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Soft delete a channel',
					},
					{
						name: 'Member',
						value: 'members',
						description: 'Get a page of members for a channel',
					},
					{
						name: 'Restore',
						value: 'restore',
						description: 'Restores a soft deleted channel',
					},
					{
						name: 'Statistics',
						value: 'statistics',
						description: 'Get statistics for a channel',
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
						name: 'Delete',
						value: 'delete',
						description: 'Soft delete a post, by marking the post as deleted in the database',
					},
					{
						name: 'Post',
						value: 'post',
						description: 'Post a message into a channel',
					},
					{
						name: 'Post Ephemeral',
						value: 'postEphemeral',
						description: 'Post an ephemeral message into a channel',
					},
				],
				default: 'post',
				description: 'The operation to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'reaction',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Add a reaction to a post.',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Remove a reaction from a post',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all the reactions to one or more posts',
					},
				],
				default: 'create',
				description: 'The operation to perform',
			},



			// ----------------------------------
			//         channel
			// ----------------------------------

			// ----------------------------------
			//         channel:create
			// ----------------------------------
			{
				displayName: 'Team ID',
				name: 'teamId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The Mattermost Team.',
			},
			{
				displayName: 'Display Name',
				name: 'displayName',
				type: 'string',
				default: '',
				placeholder: 'Announcements',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'channel',
						],
					},
				},
				required: true,
				description: 'The non-unique UI name for the channel',
			},
			{
				displayName: 'Name',
				name: 'channel',
				type: 'string',
				default: '',
				placeholder: 'announcements',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'channel',
						],
					},
				},
				required: true,
				description: 'The unique handle for the channel, will be present in the channel URL',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'channel',
						],
					},
				},
				options: [
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Public',
						value: 'public',
					},
				],
				default: 'public',
				description: 'The type of channel to create.',
			},


			// ----------------------------------
			//         channel:delete
			// ----------------------------------
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
							'delete',
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the channel to soft delete',
			},

			// ----------------------------------
			//         channel:members
			// ----------------------------------
			{
				displayName: 'Team ID',
				name: 'teamId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'members',
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The Mattermost Team.',
			},
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannelsInTeam',
					loadOptionsDependsOn: [
						'teamId',
					],
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'members',
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The Mattermost Team.',
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'channel',
						],
						operation: [
							'members',
						],
					},
				},
				default: true,
				description: 'By default the response only contain the ID of the user.<br />If this option gets activated it will resolve the user automatically.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'members',
						],
						resource: [
							'channel',
						],
					},
				},
				default: true,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'members',
						],
						resource: [
							'channel',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'How many results to return.',
			},

			// ----------------------------------
			//         channel:restore
			// ----------------------------------
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'restore',
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the channel to restore.',
			},


			// ----------------------------------
			//         channel:addUser
			// ----------------------------------
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
							'addUser',
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the channel to invite user to.',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'addUser',
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the user to invite into channel.',
			},


			// ----------------------------------
			//         channel:statistics
			// ----------------------------------
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
							'statistics',
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the channel to get the statistics from.',
			},

			// ----------------------------------
			//         message
			// ----------------------------------

			// ----------------------------------
			//         message:delete
			// ----------------------------------
			{
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'delete',
						],
					},
				},
				default: '',
				description: 'ID of the post to delete',
			},

			// ----------------------------------
			//         message:post
			// ----------------------------------
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

			// ----------------------------------
			//      message:post (ephemeral)
			// ----------------------------------
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'postEphemeral',
						],
						resource: [
							'message',
						],
					},
				},
				description: 'ID of the user to send the ephemeral message to.',
			},
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'postEphemeral',
						],
						resource: [
							'message',
						],
					},
				},
				description: 'ID of the channel to send the ephemeral message in.',
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
							'postEphemeral',
						],
						resource: [
							'message',
						],
					},
				},
				description: 'Text to send in the ephemeral message.',
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

			// ----------------------------------
			//             reaction
			// ----------------------------------
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'reaction',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'ID of the user sending the reaction.',
			},
			{
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				default: '',
				placeholder: '3moacfqxmbdw38r38fjprh6zsr',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'reaction',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'ID of the post to react to.<br>Obtainable from the post link:<br><code>https://mattermost.internal.n8n.io/[server]/pl/[postId]</code>',
			},
			{
				displayName: 'Emoji Name',
				name: 'emojiName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'reaction',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'Emoji to use for this reaction.',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'reaction',
						],
						operation: [
							'delete',
						],
					},
				},
				description: 'ID of the user whose reaction to delete.',
			},
			{
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				default: '',
				placeholder: '3moacfqxmbdw38r38fjprh6zsr',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'reaction',
						],
						operation: [
							'delete',
						],
					},
				},
				description: 'ID of the post whose reaction to delete.<br>Obtainable from the post link:<br><code>https://mattermost.internal.n8n.io/[server]/pl/[postId]</code>',
			},
			{
				displayName: 'Emoji Name',
				name: 'emojiName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'reaction',
						],
						operation: [
							'delete',
						],
					},
				},
				description: 'Name of the emoji to delete.',
			},
			{
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'reaction',
						],
						operation: [
							'getAll',
						],
					},
				},
				description: 'One or more (comma-separated) posts to retrieve reactions from.',
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
							'reaction',
						],
					},
				},
				default: true,
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
							'reaction',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'How many results to return.',
			},

			// ----------------------------------
			//              user
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new user',
					},
					{
						name: 'Deactive',
						value: 'deactive',
						description: 'Deactivates the user and revokes all its sessions by archiving its user object.',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Retrieve all users',
					},
					{
						name: 'Get By Email',
						value: 'getByEmail',
						description: 'Get a user by email',
					},
					{
						name: 'Get By ID',
						value: 'getById',
						description: 'Get a user by id',
					},
					{
						name: 'Invite',
						value: 'invite',
						description: 'Invite user to team',
					},
				],
				default: '',
				description: 'The operation to perform.',
			},
			// ----------------------------------
			//         user:create
			// ----------------------------------
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'create',
						],
					},
				},
				default: '',
			},
			{
				displayName: 'Auth Service',
				name: 'authService',
				type: 'options',
				options: [
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Gitlab',
						value: 'gitlab',
					},
					{
						name: 'Google',
						value: 'google',
					},
					{
						name: 'LDAP',
						value: 'ldap',
					},
					{
						name: 'Office365',
						value: 'office365',
					},
					{
						name: 'SAML',
						value: 'saml',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'create',
						],
					},
				},
				default: '',
			},
			{
				displayName: 'Auth Data',
				name: 'authData',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'create',
						],
					},
					hide: {
						authService: [
							'email',
						],
					},
				},
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'create',
						],
						authService: [
							'email',
						],
					},
				},
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'create',
						],
						authService: [
							'email',
						],
					},
				},
				default: '',
				description: 'The password used for email authentication.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'user',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'First Name',
						name: 'first_name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Last Name',
						name: 'last_name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Locale',
						name: 'locale',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Nickname',
						name: 'nickname',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Notification Settings',
						name: 'notificationUi',
						type: 'fixedCollection',
						placeholder: 'Add Notification Setting',
						default: {},
						typeOptions: {
							multipleValues: false,
						},
						options: [
							{
								displayName: 'Notify',
								name: 'notificationValues',
								values: [
									{
										displayName: 'Channel',
										name: 'channel',
										type: 'boolean',
										default: true,
										description: `Set to "true" to enable channel-wide notifications (@channel, @all, etc.), "false" to disable. Defaults to "true".`,
									},
									{
										displayName: 'Desktop',
										name: 'desktop',
										type: 'options',
										options: [
											{
												name: 'All',
												value: 'all',
												description: 'Notifications for all activity',
											},
											{
												name: 'Mention',
												value: 'mention',
												description: 'Mentions and direct messages only',
											},
											{
												name: 'None',
												value: 'none',
												description: 'Mentions and direct messages only',
											},
										],
										default: 'all',
									},
									{
										displayName: 'Desktop Sound',
										name: 'desktop_sound',
										type: 'boolean',
										default: true,
										description: `Set to "true" to enable sound on desktop notifications, "false" to disable. Defaults to "true".`,
									},
									{
										displayName: 'Email',
										name: 'email',
										type: 'boolean',
										default: false,
										description: `Set to "true" to enable email notifications, "false" to disable. Defaults to "true".`,
									},
									{
										displayName: 'First Name',
										name: 'first_name',
										type: 'boolean',
										default: false,
										description: `Set to "true" to enable mentions for first name. Defaults to "true" if a first name is set, "false" otherwise.`,
									},
									{
										displayName: 'Mention Keys',
										name: 'mention_keys',
										type: 'string',
										default: '',
										description: `A comma-separated list of words to count as mentions. Defaults to username and @username.`,
									},
									{
										displayName: 'Push',
										name: 'push',
										type: 'options',
										options: [
											{
												name: 'All',
												value: 'all',
												description: 'Notifications for all activity',
											},
											{
												name: 'Mention',
												value: 'mention',
												description: 'Mentions and direct messages only',
											},
											{
												name: 'None',
												value: 'none',
												description: 'Mentions and direct messages only',
											},
										],
										default: 'mention',
									},
								],
							},
						],
					},
				],
			},

			// ----------------------------------
			//         user:deactivate
			// ----------------------------------
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'deactive',
						],
					},
				},
				default: '',
				description: 'User GUID',
			},

			// ----------------------------------
			//         user:invite
			// ----------------------------------
			{
				displayName: 'Team ID',
				name: 'teamId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				required: true,
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'invite',
						],
					},
				},
				default: '',
			},
			{
				displayName: 'Emails',
				name: 'emails',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'invite',
						],
					},
				},
				default: '',
				description: `User's email. Multiple can be set separated by comma.`,
			},

			// ----------------------------------
			//         user:getAll
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'getAll',
						],
					},
				},
				default: true,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'getAll',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'How many results to return.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'getAll',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'In Channel',
						name: 'inChannel',
						type: 'string',
						default: '',
						description: 'The ID of the channel to get users for.',
					},
					{
						displayName: 'In Team',
						name: 'inTeam',
						type: 'string',
						default: '',
						description: 'The ID of the team to get users for.',
					},
					{
						displayName: 'Not In Team',
						name: 'notInTeam',
						type: 'string',
						default: '',
						description: 'The ID of the team to exclude users for.',
					},
					{
						displayName: 'Not In Channel',
						name: 'notInChannel',
						type: 'string',
						default: '',
						description: 'The ID of the channel to exclude users for.',
					},
					{
						displayName: 'Sort',
						name: 'sort',
						type: 'options',
						options: [
							{
								name: 'Created At',
								value: 'createdAt',
							},
							{
								name: 'Last Activity At',
								value: 'lastActivityAt',
							},
							{
								name: 'Status',
								value: 'status',
							},
							{
								name: 'username',
								value: 'username',
							},
						],
						default: 'username',
						description: 'The ID of the channel to exclude users for.',
					},
				],
			},
			// ----------------------------------
			//         user:getByEmail
			// ----------------------------------
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'getByEmail',
						],
					},
				},
				default: '',
				description: `User's email`,
			},

			// ----------------------------------
			//         user:getById
			// ----------------------------------
			{
				displayName: 'User IDs',
				name: 'userIds',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'getById',
						],
					},
				},
				default: '',
				description: `User's ID`,
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'getById',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Since',
						name: 'since',
						type: 'dateTime',
						default: '',
						description: 'Only return users that have been modified since the given Unix timestamp (in milliseconds).',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available channels
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'channels';
				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				if (responseData === undefined) {
					throw new NodeOperationError(this.getNode(), 'No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				let name: string;
				for (const data of responseData) {
					if (data.delete_at !== 0 || (!data.display_name || !data.name)) {
						continue;
					}

					name = `${data.team_display_name} - ${data.display_name || data.name} (${data.type === 'O' ? 'public' : 'private'})`;

					returnData.push({
						name,
						value: data.id,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});

				return returnData;
			},

			// Get all the channels in a team
			async getChannelsInTeam(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const teamId = this.getCurrentNodeParameter('teamId');
				const endpoint = `users/me/teams/${teamId}/channels`;
				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				if (responseData === undefined) {
					throw new NodeOperationError(this.getNode(), 'No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				let name: string;
				for (const data of responseData) {
					if (data.delete_at !== 0 || (!data.display_name || !data.name)) {
						continue;
					}

					const channelTypes: IDataObject = {
						'D': 'direct',
						'G': 'group',
						'O': 'public',
						'P': 'private',
					};

					name = `${data.display_name} (${channelTypes[data.type as string]})`;

					returnData.push({
						name,
						value: data.id,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});

				return returnData;
			},

			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'users/me/teams';
				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				if (responseData === undefined) {
					throw new NodeOperationError(this.getNode(), 'No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				let name: string;
				for (const data of responseData) {

					if (data.delete_at !== 0) {
						continue;
					}

					name = `${data.display_name} (${data.type === 'O' ? 'public' : 'private'})`;

					returnData.push({
						name,
						value: data.id,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});

				return returnData;
			},
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'users';
				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				if (responseData === undefined) {
					throw new NodeOperationError(this.getNode(), 'No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				for (const data of responseData) {

					if (data.delete_at !== 0) {
						continue;
					}

					returnData.push({
						name: data.username,
						value: data.id,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = await this.getCredentials('mattermostApi');

		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}

		let operation: string;
		let resource: string;
		let requestMethod = 'POST';
		let returnAll = false;
		let userIds: string[] = [];

		resource = this.getNodeParameter('resource', 0) as string;
		operation = this.getNodeParameter('operation', 0) as string;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			let endpoint = '';
			body = {};
			qs = {};

			if (resource === 'channel') {
				if (operation === 'create') {
					// ----------------------------------
					//         channel:create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'channels';

					body.team_id = this.getNodeParameter('teamId', i) as string;
					body.display_name = this.getNodeParameter('displayName', i) as string;
					body.name = this.getNodeParameter('channel', i) as string;

					const type = this.getNodeParameter('type', i) as string;
					body.type = type === 'public' ? 'O' : 'P';

				} else if (operation === 'delete') {
					// ----------------------------------
					//         channel:delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const channelId = this.getNodeParameter('channelId', i) as string;
					endpoint = `channels/${channelId}`;

				} else if (operation === 'members') {
					// ----------------------------------
					//         channel:members
					// ----------------------------------

					requestMethod = 'GET';
					const channelId = this.getNodeParameter('channelId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					endpoint = `channels/${channelId}/members`;
					if (returnAll === false) {
						qs.per_page = this.getNodeParameter('limit', i) as number;
					}

				} else if (operation === 'restore') {
					// ----------------------------------
					//         channel:restore
					// ----------------------------------

					requestMethod = 'POST';
					const channelId = this.getNodeParameter('channelId', i) as string;
					endpoint = `channels/${channelId}/restore`;

				} else if (operation === 'addUser') {
					// ----------------------------------
					//         channel:addUser
					// ----------------------------------

					requestMethod = 'POST';

					const channelId = this.getNodeParameter('channelId', i) as string;
					body.user_id = this.getNodeParameter('userId', i) as string;

					endpoint = `channels/${channelId}/members`;

				} else if (operation === 'statistics') {
					// ----------------------------------
					//         channel:statistics
					// ----------------------------------

					requestMethod = 'GET';
					const channelId = this.getNodeParameter('channelId', i) as string;
					endpoint = `channels/${channelId}/stats`;
				}
			} else if (resource === 'message') {
				if (operation === 'delete') {
					// ----------------------------------
					//          message:delete
					// ----------------------------------

					const postId = this.getNodeParameter('postId', i) as string;
					requestMethod = 'DELETE';
					endpoint = `posts/${postId}`;
				} else if (operation === 'post') {
					// ----------------------------------
					//         message:post
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'posts';

					body.channel_id = this.getNodeParameter('channelId', i) as string;
					body.message = this.getNodeParameter('message', i) as string;

					const attachments = this.getNodeParameter('attachments', i, []) as unknown as IAttachment[];

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
								// @ts-ignore
								delete attachment.fields;
							}
						}
					}
					for (const attachment of attachments) {
						if (attachment.actions !== undefined) {
							if (attachment.actions.item !== undefined) {
								// Move the field-content up
								// @ts-ignore
								attachment.actions = attachment.actions.item;
							} else {
								// If it does not have any items set remove it
								// @ts-ignore
								delete attachment.actions;
							}
						}
					}

					for (const attachment of attachments) {
						if (Array.isArray(attachment.actions)) {
							for (const attaction of attachment.actions) {

								if (attaction.type === 'button') {
									delete attaction.type;
								}
								if (attaction.data_source === 'custom') {
									delete attaction.data_source;
								}
								if (attaction.options) {
									attaction.options = attaction.options.option;
								}

								if (attaction.integration.item !== undefined) {
									attaction.integration = attaction.integration.item;
									if (Array.isArray(attaction.integration.context.property)) {
										const tmpcontex = {};
										for (const attactionintegprop of attaction.integration.context.property) {
											Object.assign(tmpcontex, { [attactionintegprop.name]: attactionintegprop.value });
										}
										delete attaction.integration.context;
										attaction.integration.context = tmpcontex;
									}
								}
							}
						}
					}

					body.props = {
						attachments,
					};

					// Add all the other options to the request
					const otherOptions = this.getNodeParameter('otherOptions', i) as IDataObject;
					Object.assign(body, otherOptions);

				} else if (operation === 'postEphemeral') {

					// ----------------------------------
					//      message:post (ephemeral)
					// ----------------------------------

					// https://api.mattermost.com/#tag/posts/paths/~1posts~1ephemeral/post

					body = {
						user_id: this.getNodeParameter('userId', i),
						post: {
							channel_id: this.getNodeParameter('channelId', i),
							message: this.getNodeParameter('message', i),
						},
					} as IDataObject;

					requestMethod = 'POST';
					endpoint = 'posts/ephemeral';

				}

			} else if (resource === 'reaction') {

				// ----------------------------------
				//         reaction:create
				// ----------------------------------

				// https://api.mattermost.com/#tag/reactions/paths/~1reactions/post

				if (operation === 'create') {

					body = {
						user_id: this.getNodeParameter('userId', i),
						post_id: this.getNodeParameter('postId', i),
						emoji_name: (this.getNodeParameter('emojiName', i) as string).replace(/:/g, ''),
						create_at: Date.now(),
					} as { user_id: string; post_id: string; emoji_name: string; create_at: number };

					requestMethod = 'POST';
					endpoint = 'reactions';

				} else if (operation === 'delete') {

					// ----------------------------------
					//         reaction:delete
					// ----------------------------------

					// https://api.mattermost.com/#tag/reactions/paths/~1users~1{user_id}~1posts~1{post_id}~1reactions~1{emoji_name}/delete

					const userId = this.getNodeParameter('userId', i) as string;
					const postId = this.getNodeParameter('postId', i) as string;
					const emojiName = (this.getNodeParameter('emojiName', i) as string).replace(/:/g, '');

					requestMethod = 'DELETE';
					endpoint = `users/${userId}/posts/${postId}/reactions/${emojiName}`;

				} else if (operation === 'getAll') {

					// ----------------------------------
					//         reaction:getAll
					// ----------------------------------

					// https://api.mattermost.com/#tag/reactions/paths/~1posts~1ids~1reactions/post

					const postId = this.getNodeParameter('postId', i) as string;

					requestMethod = 'GET';
					endpoint = `posts/${postId}/reactions`;

					qs.limit = this.getNodeParameter('limit', 0, 0) as number;
				}

			} else if (resource === 'user') {

				if (operation === 'create') {
					// ----------------------------------
					//          user:create
					// ----------------------------------

					const username = this.getNodeParameter('username', i) as string;

					const authService = this.getNodeParameter('authService', i) as string;

					body.auth_service = authService;

					if (authService === 'email') {
						body.email = this.getNodeParameter('email', i) as string;
						body.password = this.getNodeParameter('password', i) as string;
					} else {
						body.auth_data = this.getNodeParameter('authData', i) as string;
					}

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					body.username = username;

					Object.assign(body, additionalFields);

					if (body.notificationUi) {
						body.notify_props = (body.notificationUi as IDataObject).notificationValues;
					}

					requestMethod = 'POST';

					endpoint = 'users';
				}

				// TODO: Remove the "deactive" again in the future. In here temporary
				//       to not break workflows for people which set the option before
				//       typo got fixed. JO 2020-01-17
				if (operation === 'deactive' || operation === 'desactive') {
					// ----------------------------------
					//          user:deactive
					// ----------------------------------
					const userId = this.getNodeParameter('userId', i) as string;
					requestMethod = 'DELETE';
					endpoint = `users/${userId}`;
				}

				if (operation === 'getAll') {
					// ----------------------------------
					//         user:getAll
					// ----------------------------------

					requestMethod = 'GET';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.inTeam) {
						qs.in_team = additionalFields.inTeam;
					}

					if (additionalFields.notInTeam) {
						qs.not_in_team = additionalFields.notInTeam;
					}

					if (additionalFields.inChannel) {
						qs.in_channel = additionalFields.inChannel;
					}

					if (additionalFields.notInChannel) {
						qs.not_in_channel = additionalFields.notInChannel;
					}

					if (additionalFields.sort) {
						qs.sort = snakeCase(additionalFields.sort as string);
					}

					const validRules = {
						inTeam: ['last_activity_at', 'created_at', 'username'],
						inChannel: ['status', 'username'],
					};

					if (additionalFields.sort) {
						if (additionalFields.inTeam !== undefined || additionalFields.inChannel !== undefined) {

							if (additionalFields.inTeam !== undefined
								&& !validRules.inTeam.includes(snakeCase(additionalFields.sort as string))) {
								throw new NodeOperationError(this.getNode(), `When In Team is set the only valid values for sorting are ${validRules.inTeam.join(',')}`);
							}
							if (additionalFields.inChannel !== undefined
								&& !validRules.inChannel.includes(snakeCase(additionalFields.sort as string))) {
								throw new NodeOperationError(this.getNode(), `When In Channel is set the only valid values for sorting are ${validRules.inChannel.join(',')}`);
							}
							if (additionalFields.inChannel !== undefined
								&& additionalFields.inChannel === ''
								&& additionalFields.sort !== 'username') {
								throw new NodeOperationError(this.getNode(), 'When sort is different than username In Channel must be set');
							}

							if (additionalFields.inTeam !== undefined
								&& additionalFields.inTeam === ''
								&& additionalFields.sort !== 'username') {
								throw new NodeOperationError(this.getNode(), 'When sort is different than username In Team must be set');
							}

						} else {
							throw new NodeOperationError(this.getNode(), `When sort is defined either 'in team' or 'in channel' must be defined`);
						}
					}

					if (additionalFields.sort === 'username') {
						qs.sort = '';
					}

					if (returnAll === false) {
						qs.per_page = this.getNodeParameter('limit', i) as number;
					}

					endpoint = `/users`;
				}

				if (operation === 'getByEmail') {
					// ----------------------------------
					//          user:getByEmail
					// ----------------------------------
					const email = this.getNodeParameter('email', i) as string;
					requestMethod = 'GET';
					endpoint = `users/email/${email}`;
				}

				if (operation === 'getById') {
					// ----------------------------------
					//          user:getById
					// ----------------------------------
					userIds = (this.getNodeParameter('userIds', i) as string).split(',') as string[];
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.since) {
						qs.since = new Date(additionalFields.since as string).getTime();
					}

					requestMethod = 'POST';

					endpoint = 'users/ids';

					//@ts-ignore
					body = userIds;

				}

				if (operation === 'invite') {
					// ----------------------------------
					//          user:invite
					// ----------------------------------
					const teamId = this.getNodeParameter('teamId', i) as string;

					const emails = (this.getNodeParameter('emails', i) as string).split(',');

					//@ts-ignore
					body = emails;

					requestMethod = 'POST';

					endpoint = `teams/${teamId}/invite/email`;
				}
			}
			else {
				throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
			}

			let responseData;
			if (returnAll) {
				responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
			} else {
				responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
				if (qs.limit) {
					responseData = responseData.slice(0, qs.limit);
				}
				if (resource === 'channel' && operation === 'members') {
					const resolveData = this.getNodeParameter('resolveData', i) as boolean;
					if (resolveData) {
						const userIds: string[] = [];
						for (const data of responseData) {
							userIds.push(data.user_id);
						}
						if (userIds.length > 0) {
							responseData = await apiRequest.call(this, 'POST', 'users/ids', userIds, qs);
						}
					}
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData);
			} else {
				returnData.push(responseData);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
