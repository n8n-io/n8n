import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	addAdditionalFields,
	apiRequest,
	getPropertyName,
} from './GenericFunctions';


export class Telegram implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Telegram',
		name: 'telegram',
		icon: 'file:telegram.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Telegram',
		defaults: {
			name: 'Telegram',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'telegramApi',
				required: true,
				testedBy: 'telegramBotTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					// {
					// 	name: 'Bot',
					// 	value: 'bot',
					// },
					{
						name: 'Chat',
						value: 'chat',
					},
					{
						name: 'Callback',
						value: 'callback',
					},
					{
						name: 'File',
						value: 'file',
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
			//         operation
			// ----------------------------------

			// {
			// 	displayName: 'Operation',
			// 	name: 'operation',
			// 	type: 'options',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'bot',
			// 			],
			// 		},
			// 	},
			// 	options: [
			// 		{
			// 			name: 'Info',
			// 			value: 'info',
			// 			description: 'Get information about the bot associated with the access token.',
			// 		},
			// 	],
			// 	default: 'info',
			// 	description: 'The operation to perform.',
			// },

			// ----------------------------------
			//         operation
			// ----------------------------------

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'chat',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get up to date information about a chat.',
					},
					{
						name: 'Leave',
						value: 'leave',
						description: 'Leave a group, supergroup or channel.',
					},
					{
						name: 'Member',
						value: 'member',
						description: 'Get the member of a chat.',
					},
					{
						name: 'Set Description',
						value: 'setDescription',
						description: 'Set the description of a chat.',
					},
					{
						name: 'Set Title',
						value: 'setTitle',
						description: 'Set the title of a chat.',
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'callback',
						],
					},
				},
				options: [
					{
						name: 'Answer Query',
						value: 'answerQuery',
						description: 'Send answer to callback query sent from inline keyboard.',
					},
					{
						name: 'Answer Inline Query',
						value: 'answerInlineQuery',
						description: 'Send answer to callback query sent from inline bot.',
					},
				],
				default: 'answerQuery',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'file',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a file.',
					},
				],
				default: 'get',
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
						name: 'Delete Chat Message',
						value: 'deleteMessage',
						description: 'Delete a chat message',
					},
					{
						name: 'Edit Message Text',
						value: 'editMessageText',
						description: 'Edit a text message',
					},
					{
						name: 'Pin Chat Message',
						value: 'pinChatMessage',
						description: 'Pin a chat message',
					},
					{
						name: 'Send Animation',
						value: 'sendAnimation',
						description: 'Send an animated file',
					},
					{
						name: 'Send Audio',
						value: 'sendAudio',
						description: 'Send a audio file',
					},
					{
						name: 'Send Chat Action',
						value: 'sendChatAction',
						description: 'Send a chat action',
					},
					{
						name: 'Send Document',
						value: 'sendDocument',
						description: 'Send a document',
					},
					{
						name: 'Send Location',
						value: 'sendLocation',
						description: 'Send a location',
					},
					{
						name: 'Send Media Group',
						value: 'sendMediaGroup',
						description: 'Send group of photos or videos to album',
					},
					{
						name: 'Send Message',
						value: 'sendMessage',
						description: 'Send a text message',
					},
					{
						name: 'Send Photo',
						value: 'sendPhoto',
						description: 'Send a photo',
					},
					{
						name: 'Send Sticker',
						value: 'sendSticker',
						description: 'Send a sticker',
					},
					{
						name: 'Send Video',
						value: 'sendVideo',
						description: 'Send a video',
					},
					{
						name: 'Unpin Chat Message',
						value: 'unpinChatMessage',
						description: 'Unpin a chat message',
					},
				],
				default: 'sendMessage',
				description: 'The operation to perform.',
			},


			// ----------------------------------
			//         chat / message
			// ----------------------------------

			{
				displayName: 'Chat ID',
				name: 'chatId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'deleteMessage',
							'get',
							'leave',
							'member',
							'pinChatMessage',
							'setDescription',
							'setTitle',
							'sendAnimation',
							'sendAudio',
							'sendChatAction',
							'sendDocument',
							'sendLocation',
							'sendMessage',
							'sendMediaGroup',
							'sendPhoto',
							'sendSticker',
							'sendVideo',
							'unpinChatMessage',
						],
						resource: [
							'chat',
							'message',
						],
					},
				},
				required: true,
				description: 'Unique identifier for the target chat or username of the target channel (in the format @channelusername).',
			},

			// ----------------------------------
			//       message:deleteMessage
			// ----------------------------------
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'deleteMessage',
						],
						resource: [
							'message',
						],
					},
				},
				required: true,
				description: 'Unique identifier of the message to delete.',
			},

			// ----------------------------------
			//       message:pinChatMessage
			// ----------------------------------
			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'pinChatMessage',
							'unpinChatMessage',
						],
						resource: [
							'message',
						],
					},
				},
				required: true,
				description: 'Unique identifier of the message to pin or unpin.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'pinChatMessage',
						],
						resource: [
							'message',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Disable Notification',
						name: 'disable_notification',
						type: 'boolean',
						default: false,
						description: 'Do not send a notification to all chat members about the new pinned message.',
					},
				],
			},

			// ----------------------------------
			//         chat
			// ----------------------------------

			// ----------------------------------
			//         chat:member
			// ----------------------------------
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'member',
						],
						resource: [
							'chat',
						],
					},
				},
				required: true,
				description: 'Unique identifier of the target user.',
			},


			// ----------------------------------
			//         chat:setDescription
			// ----------------------------------
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'setDescription',
						],
						resource: [
							'chat',
						],
					},
				},
				required: true,
				description: 'New chat description, 0-255 characters.',
			},


			// ----------------------------------
			//         chat:setTitle
			// ----------------------------------
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'setTitle',
						],
						resource: [
							'chat',
						],
					},
				},
				required: true,
				description: 'New chat title, 1-255 characters.',
			},


			// ----------------------------------
			//         callback
			// ----------------------------------

			// ----------------------------------
			//         callback:answerQuery
			// ----------------------------------
			{
				displayName: 'Query ID',
				name: 'queryId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'answerQuery',
						],
						resource: [
							'callback',
						],
					},
				},
				required: true,
				description: 'Unique identifier for the query to be answered.',
			},

			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'answerQuery',
						],
						resource: [
							'callback',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Cache Time',
						name: 'cache_time',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: 'The maximum amount of time in seconds that the result of the callback query may be cached client-side.',
					},
					{
						displayName: 'Show Alert',
						name: 'show_alert',
						type: 'boolean',
						default: false,
						description: 'If true, an alert will be shown by the client instead of a notification at the top of the chat screen.',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Text of the notification. If not specified, nothing will be shown to the user, 0-200 characters.',
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						description: 'URL that will be opened by the user\'s client.',
					},
				],
			},

			// -----------------------------------------------
			//         callback:answerInlineQuery
			// -----------------------------------------------
			{
				displayName: 'Query ID',
				name: 'queryId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'answerInlineQuery',
						],
						resource: [
							'callback',
						],
					},
				},
				required: true,
				description: 'Unique identifier for the answered query.',
			},
			{
				displayName: 'Results',
				name: 'results',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'answerInlineQuery',
						],
						resource: [
							'callback',
						],
					},
				},
				required: true,
				description: 'A JSON-serialized array of results for the inline query.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'answerInlineQuery',
						],
						resource: [
							'callback',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Cache Time',
						name: 'cache_time',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: 'The maximum amount of time in seconds that the result of the callback query may be cached client-side.',
					},
					{
						displayName: 'Show Alert',
						name: 'show_alert',
						type: 'boolean',
						default: false,
						description: 'If true, an alert will be shown by the client instead of a notification at the top of the chat screen.',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Text of the notification. If not specified, nothing will be shown to the user, 0-200 characters.',
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						description: 'URL that will be opened by the user\'s client.',
					},
				],
			},


			// ----------------------------------
			//         file
			// ----------------------------------

			// ----------------------------------
			//         file:get/download
			// ----------------------------------

			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'file',
						],
					},
				},
				required: true,
				description: 'The ID of the file.',
			},
			{
				displayName: 'Download',
				name: 'download',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'file',
						],
					},
				},
				default: true,
				description: 'Download the file.',
			},

			// ----------------------------------
			//         message
			// ----------------------------------

			// ----------------------------------
			//         message:editMessageText
			// ----------------------------------

			{
				displayName: 'Message Type',
				name: 'messageType',
				type: 'options',
				displayOptions: {
					show: {
						operation: [
							'editMessageText',
						],
						resource: [
							'message',
						],
					},
				},
				options: [
					{
						name: 'Inline Message',
						value: 'inlineMessage',
					},
					{
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
				description: 'The type of the message to edit.',
			},

			{
				displayName: 'Chat ID',
				name: 'chatId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						messageType: [
							'message',
						],
						operation: [
							'editMessageText',
						],
						resource: [
							'message',
						],
					},
				},
				required: true,
				description: 'Unique identifier for the target chat or username of the target channel (in the format @channelusername). To find your chat id ask @get_id_bot.',
			},
			// ----------------------------------
			//         message:sendAnimation/sendAudio/sendDocument/sendPhoto/sendSticker/sendVideo
			// ----------------------------------

			{
				displayName: 'Binary Data',
				name: 'binaryData',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendAnimation',
							'sendAudio',
							'sendDocument',
							'sendPhoto',
							'sendVideo',
							'sendSticker',
						],
						resource: [
							'message',
						],
					},
				},
				description: 'If the data to upload should be taken from binary field.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'sendAnimation',
							'sendAudio',
							'sendDocument',
							'sendPhoto',
							'sendVideo',
							'sendSticker',
						],
						resource: [
							'message',
						],
						binaryData: [
							true,
						],
					},
				},
				placeholder: '',
				description: 'Name of the binary property that contains the data to upload',
			},

			{
				displayName: 'Message ID',
				name: 'messageId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						messageType: [
							'message',
						],
						operation: [
							'editMessageText',
						],
						resource: [
							'message',
						],
					},
				},
				required: true,
				description: 'Unique identifier of the message to edit.',
			},
			{
				displayName: 'Inline Message ID',
				name: 'inlineMessageId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						messageType: [
							'inlineMessage',
						],
						operation: [
							'editMessageText',
						],
						resource: [
							'message',
						],
					},
				},
				required: true,
				description: 'Unique identifier of the inline message to edit.',
			},
			{
				displayName: 'Reply Markup',
				name: 'replyMarkup',
				displayOptions: {
					show: {
						operation: [
							'editMessageText',
						],
						resource: [
							'message',
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Inline Keyboard',
						value: 'inlineKeyboard',
					},
				],
				default: 'none',
				description: 'Additional interface options.',
			},



			// ----------------------------------
			//         message:sendAnimation
			// ----------------------------------
			{
				displayName: 'Animation',
				name: 'file',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'sendAnimation',
						],
						resource: [
							'message',
						],
						binaryData: [
							false,
						],
					},
				},
				description: 'Animation to send. Pass a file_id to send an animation that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get an animation from the Internet',
			},



			// ----------------------------------
			//         message:sendAudio
			// ----------------------------------
			{
				displayName: 'Audio',
				name: 'file',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'sendAudio',
						],
						resource: [
							'message',
						],
						binaryData: [
							false,
						],
					},
				},
				description: 'Audio file to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet',
			},



			// ----------------------------------
			//         message:sendChatAction
			// ----------------------------------
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				displayOptions: {
					show: {
						operation: [
							'sendChatAction',
						],
						resource: [
							'message',
						],
					},
				},
				options: [
					{
						name: 'Find Location',
						value: 'find_location',
					},
					{
						name: 'Record Audio',
						value: 'record_audio',
					},
					{
						name: 'Record Video',
						value: 'record_video',
					},
					{
						name: 'Record Video Note',
						value: 'record_video_note',
					},
					{
						name: 'Typing',
						value: 'typing',
					},
					{
						name: 'Upload Audio',
						value: 'upload_audio',
					},
					{
						name: 'Upload Document',
						value: 'upload_document',
					},
					{
						name: 'Upload Photo',
						value: 'upload_photo',
					},
					{
						name: 'Upload Video',
						value: 'upload_video',
					},
					{
						name: 'Upload Video Note',
						value: 'upload_video_note',
					},
				],
				default: 'typing',
				description: 'Type of action to broadcast. Choose one, depending on what the user is about to receive. The status is set for 5 seconds or less (when a message arrives from your bot).',
			},



			// ----------------------------------
			//         message:sendDocument
			// ----------------------------------
			{
				displayName: 'Document',
				name: 'file',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'sendDocument',
						],
						resource: [
							'message',
						],
						binaryData: [
							false,
						],
					},
				},
				description: 'Document to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet',
			},


			// ----------------------------------
			//         message:sendLocation
			// ----------------------------------
			{
				displayName: 'Latitude',
				name: 'latitude',
				type: 'number',
				default: 0.0,
				typeOptions: {
					numberPrecision: 10,
					minValue: -90,
					maxValue: 90,
				},
				displayOptions: {
					show: {
						operation: [
							'sendLocation',
						],
						resource: [
							'message',
						],
					},
				},
				description: 'Location latitude',
			},

			{
				displayName: 'Longitude',
				name: 'longitude',
				type: 'number',
				typeOptions: {
					numberPrecision: 10,
					minValue: -180,
					maxValue: 180,
				},
				default: 0.0,
				displayOptions: {
					show: {
						operation: [
							'sendLocation',
						],
						resource: [
							'message',
						],
					},
				},
				description: 'Location longitude',
			},

			// ----------------------------------
			//         message:sendMediaGroup
			// ----------------------------------
			{
				displayName: 'Media',
				name: 'media',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						operation: [
							'sendMediaGroup',
						],
						resource: [
							'message',
						],
					},
				},
				description: 'The media to add.',
				placeholder: 'Add Media',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Media',
						name: 'media',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Photo',
										value: 'photo',
									},
									{
										name: 'Video',
										value: 'video',
									},
								],
								default: 'photo',
								description: 'The type of the media to add.',
							},
							{
								displayName: 'Media File',
								name: 'media',
								type: 'string',
								default: '',
								description: 'Media to send. Pass a file_id to send a file that exists on the Telegram servers (recommended) or pass an HTTP URL for Telegram to get a file from the Internet.',
							},
							{
								displayName: 'Additional Fields',
								name: 'additionalFields',
								type: 'collection',
								placeholder: 'Add Field',
								default: {},
								options: [
									{
										displayName: 'Caption',
										name: 'caption',
										type: 'string',
										typeOptions: {
											alwaysOpenEditWindow: true,
										},
										default: '',
										description: 'Caption text to set, 0-1024 characters.',
									},
									{
										displayName: 'Parse Mode',
										name: 'parse_mode',
										type: 'options',
										options: [
											{
												name: 'Markdown',
												value: 'Markdown',
											},
											{
												name: 'HTML',
												value: 'HTML',
											},
										],
										default: 'HTML',
										description: 'How to parse the text.',
									},
								],
							},
						],
					},
				],
			},


			// ----------------------------------
			//         message:sendMessage
			// ----------------------------------
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				displayOptions: {
					show: {
						operation: [
							'editMessageText',
							'sendMessage',
						],
						resource: [
							'message',
						],
					},
				},
				description: 'Text of the message to be sent.',
			},


			// ----------------------------------
			//         message:sendPhoto
			// ----------------------------------
			{
				displayName: 'Photo',
				name: 'file',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'sendPhoto',
						],
						resource: [
							'message',
						],
						binaryData: [
							false,
						],
					},
				},
				description: 'Photo to send. Pass a file_id to send a photo that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a photo from the Internet',
			},


			// ----------------------------------
			//         message:sendSticker
			// ----------------------------------
			{
				displayName: 'Sticker',
				name: 'file',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'sendSticker',
						],
						resource: [
							'message',
						],
						binaryData: [
							false,
						],
					},
				},
				description: 'Sticker to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a .webp file from the Internet',
			},


			// ----------------------------------
			//         message:sendVideo
			// ----------------------------------
			{
				displayName: 'Video',
				name: 'file',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: [
							'sendVideo',
						],
						resource: [
							'message',
						],
						binaryData: [
							false,
						],
					},
				},
				description: 'Video file to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet',
			},

			// ----------------------------------
			//         message:editMessageText/sendAnimation/sendAudio/sendLocation/sendMessage/sendPhoto/sendSticker/sendVideo
			// ----------------------------------

			{
				displayName: 'Reply Markup',
				name: 'replyMarkup',
				displayOptions: {
					show: {
						operation: [
							'sendAnimation',
							'sendDocument',
							'sendMessage',
							'sendPhoto',
							'sendSticker',
							'sendVideo',
							'sendAudio',
							'sendLocation',
						],
						resource: [
							'message',
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Force Reply',
						value: 'forceReply',
					},
					{
						name: 'Inline Keyboard',
						value: 'inlineKeyboard',
					},
					{
						name: 'Reply Keyboard',
						value: 'replyKeyboard',
					},
					{
						name: 'Reply Keyboard Remove',
						value: 'replyKeyboardRemove',
					},
				],
				default: 'none',
				description: 'Additional interface options.',
			},

			{
				displayName: 'Force Reply',
				name: 'forceReply',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						replyMarkup: [
							'forceReply',
						],
						resource: [
							'message',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Force Reply',
						name: 'force_reply',
						type: 'boolean',
						default: false,
						description: 'Shows reply interface to the user, as if they manually selected the bot‘s message and tapped ’Reply.',
					},
					{
						displayName: 'Selective',
						name: 'selective',
						type: 'boolean',
						default: false,
						description: ' Use this parameter if you want to force reply from specific users only.',
					},
				],
			},


			{
				displayName: 'Inline Keyboard',
				name: 'inlineKeyboard',
				placeholder: 'Add Keyboard Row',
				description: 'Adds an inline keyboard that appears right next to the message it belongs to.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						replyMarkup: [
							'inlineKeyboard',
						],
						resource: [
							'message',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Rows',
						name: 'rows',
						values: [
							{
								displayName: 'Row',
								name: 'row',
								type: 'fixedCollection',
								description: 'The value to set.',
								placeholder: 'Add Button',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										displayName: 'Buttons',
										name: 'buttons',
										values: [
											{
												displayName: 'Text',
												name: 'text',
												type: 'string',
												default: '',
												description: 'Label text on the button.',
											},
											{
												displayName: 'Additional Fields',
												name: 'additionalFields',
												type: 'collection',
												placeholder: 'Add Field',
												default: {},
												options: [
													{
														displayName: 'Callback Data',
														name: 'callback_data',
														type: 'string',
														default: '',
														description: 'Data to be sent in a callback query to the bot when button is pressed, 1-64 bytes.',
													},
													{
														displayName: 'Pay',
														name: 'pay',
														type: 'boolean',
														default: false,
														description: 'Specify True, to send a Pay button.',
													},
													{
														displayName: 'Switch Inline Query Current Chat',
														name: 'switch_inline_query_current_chat',
														type: 'string',
														default: '',
														description: 'If set, pressing the button will insert the bot‘s username and the specified inline query in the current chat\'s input field.Can be empty, in which case only the bot’s username will be inserted.',
													},
													{
														displayName: 'Switch Inline Query',
														name: 'switch_inline_query',
														type: 'string',
														default: '',
														description: 'If set, pressing the button will prompt the user to select one of their chats, open that chat and insert the bot‘s username and the specified inline query in the input field. Can be empty, in which case just the bot’s username will be inserted.',
													},
													{
														displayName: 'URL',
														name: 'url',
														type: 'string',
														default: '',
														description: 'HTTP or tg:// url to be opened when button is pressed.',
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
				displayName: 'Reply Keyboard',
				name: 'replyKeyboard',
				placeholder: 'Add Reply Keyboard Row',
				description: 'Adds a custom keyboard with reply options.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						replyMarkup: [
							'replyKeyboard',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Rows',
						name: 'rows',
						values: [
							{
								displayName: 'Row',
								name: 'row',
								type: 'fixedCollection',
								description: 'The value to set.',
								placeholder: 'Add Button',
								typeOptions: {
									multipleValues: true,
								},
								default: {},
								options: [
									{
										displayName: 'Buttons',
										name: 'buttons',
										values: [
											{
												displayName: 'Text',
												name: 'text',
												type: 'string',
												default: '',
												description: 'Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.',
											},
											{
												displayName: 'Additional Fields',
												name: 'additionalFields',
												type: 'collection',
												placeholder: 'Add Field',
												default: {},
												options: [
													{
														displayName: 'Request Contact',
														name: 'request_contact',
														type: 'boolean',
														default: false,
														description: 'If True, the user\'s phone number will be sent as a contact when the button is pressed.Available in private chats only.',
													},
													{
														displayName: 'Request Location',
														name: 'request_location',
														type: 'boolean',
														default: false,
														description: 'If True, the user\'s request_location.',
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
				displayName: 'Reply Keyboard Options',
				name: 'replyKeyboardOptions',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						replyMarkup: [
							'replyKeyboard',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Resize Keyboard',
						name: 'resize_keyboard',
						type: 'boolean',
						default: false,
						description: 'Requests clients to resize the keyboard vertically for optimal fit.',
					},
					{
						displayName: 'One Time Keyboard',
						name: 'one_time_keyboard',
						type: 'boolean',
						default: false,
						description: 'Requests clients to hide the keyboard as soon as it\'s been used.',
					},
					{
						displayName: 'Selective',
						name: 'selective',
						type: 'boolean',
						default: false,
						description: 'Use this parameter if you want to show the keyboard to specific users only.',
					},
				],
			},

			{
				displayName: 'Reply Keyboard Remove',
				name: 'replyKeyboardRemove',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						replyMarkup: [
							'replyKeyboardRemove',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Remove Keyboard',
						name: 'remove_keyboard',
						type: 'boolean',
						default: false,
						description: 'Requests clients to remove the custom keyboard.',
					},
					{
						displayName: 'Selective',
						name: 'selective',
						type: 'boolean',
						default: false,
						description: ' Use this parameter if you want to force reply from specific users only.',
					},
				],
			},

			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'editMessageText',
							'sendAnimation',
							'sendAudio',
							'sendDocument',
							'sendLocation',
							'sendMessage',
							'sendMediaGroup',
							'sendPhoto',
							'sendSticker',
							'sendVideo',
						],
						resource: [
							'message',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Caption',
						name: 'caption',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						displayOptions: {
							show: {
								'/operation': [
									'sendAnimation',
									'sendAudio',
									'sendDocument',
									'sendPhoto',
									'sendVideo',
								],
							},
						},
						default: '',
						description: 'Caption text to set, 0-1024 characters.',
					},
					{
						displayName: 'Disable Notification',
						name: 'disable_notification',
						type: 'boolean',
						default: false,
						displayOptions: {
							hide: {
								'/operation': [
									'editMessageText',
								],
							},
						},
						description: 'Sends the message silently. Users will receive a notification with no sound.',
					},
					{
						displayName: 'Disable WebPage Preview',
						name: 'disable_web_page_preview',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': [
									'editMessageText',
									'sendMessage',
								],
							},
						},
						default: false,
						description: 'Disables link previews for links in this message.',
					},
					{
						displayName: 'Duration',
						name: 'duration',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						displayOptions: {
							show: {
								'/operation': [
									'sendAnimation',
									'sendAudio',
									'sendVideo',
								],
							},
						},
						default: 0,
						description: 'Duration of clip in seconds.',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						displayOptions: {
							show: {
								'/operation': [
									'sendAnimation',
									'sendVideo',
								],
							},
						},
						default: 0,
						description: 'Height of the video.',
					},
					{
						displayName: 'Parse Mode',
						name: 'parse_mode',
						type: 'options',
						options: [
							{
								name: 'Markdown',
								value: 'Markdown',
							},
							{
								name: 'HTML',
								value: 'HTML',
							},
						],
						displayOptions: {
							show: {
								'/operation': [
									'editMessageText',
									'sendAnimation',
									'sendAudio',
									'sendMessage',
									'sendPhoto',
									'sendVideo',
								],
							},
						},
						default: 'HTML',
						description: 'How to parse the text.',
					},
					{
						displayName: 'Performer',
						name: 'performer',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'sendAudio',
								],
							},
						},
						default: '',
						description: 'Name of the performer.',
					},
					{
						displayName: 'Reply To Message ID',
						name: 'reply_to_message_id',
						type: 'number',
						displayOptions: {
							hide: {
								'/operation': [
									'editMessageText',
								],
							},
						},
						default: 0,
						description: 'If the message is a reply, ID of the original message.',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						displayOptions: {
							show: {
								'/operation': [
									'sendAudio',
								],
							},
						},
						default: '',
						description: 'Title of the track.',
					},
					{
						displayName: 'Thumbnail',
						name: 'thumb',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'sendAnimation',
									'sendAudio',
									'sendDocument',
									'sendVideo',
								],
							},
						},
						default: '',
						description: 'Thumbnail of the file sent; can be ignored if thumbnail generation for the file is supported server-side. The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail‘s width and height should not exceed 320.',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						displayOptions: {
							show: {
								'/operation': [
									'sendAnimation',
									'sendVideo',
								],
							},
						},
						default: 0,
						description: 'Width of the video.',
					},
				],
			},

		],
	};

	methods = {
		credentialTest: {
			async telegramBotTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;
				const options = {
					uri: `https://api.telegram.org/bot${credentials!.accessToken}/getMe`,
					json: true,
				};
				try {
					const response = await this.helpers.request(options);
					if (!response.ok) {
						return {
							status: 'Error',
							message: 'Token is not valid.',
						};
					}
				} catch (err) {
					return {
						status: 'Error',
						message: `Token is not valid; ${err.message}`,
					};
				}

				return {
					status: 'OK',
					message: 'Authentication successful!',
				};

			},
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const binaryData = this.getNodeParameter('binaryData', 0, false) as boolean;

		for (let i = 0; i < items.length; i++) {
			try {
				// Reset all values
				requestMethod = 'POST';
				endpoint = '';
				body = {};
				qs = {};

				if (resource === 'callback') {
					if (operation === 'answerQuery') {
						// ----------------------------------
						//         callback:answerQuery
						// ----------------------------------

						endpoint = 'answerCallbackQuery';

						body.callback_query_id = this.getNodeParameter('queryId', i) as string;

						// Add additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

					} else if (operation === 'answerInlineQuery') {
						// -----------------------------------------------
						//         callback:answerInlineQuery
						// -----------------------------------------------

						endpoint = 'answerInlineQuery';

						body.inline_query_id = this.getNodeParameter('queryId', i) as string;
						body.results = this.getNodeParameter('results', i) as string;

						// Add additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);
					}

				} else if (resource === 'chat') {
					if (operation === 'get') {
						// ----------------------------------
						//         chat:get
						// ----------------------------------

						endpoint = 'getChat';

						body.chat_id = this.getNodeParameter('chatId', i) as string;

					} else if (operation === 'leave') {
						// ----------------------------------
						//         chat:leave
						// ----------------------------------

						endpoint = 'leaveChat';

						body.chat_id = this.getNodeParameter('chatId', i) as string;

					} else if (operation === 'member') {
						// ----------------------------------
						//         chat:member
						// ----------------------------------

						endpoint = 'getChatMember';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.user_id = this.getNodeParameter('userId', i) as string;

					} else if (operation === 'setDescription') {
						// ----------------------------------
						//         chat:setDescription
						// ----------------------------------

						endpoint = 'setChatDescription';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.description = this.getNodeParameter('description', i) as string;

					} else if (operation === 'setTitle') {
						// ----------------------------------
						//         chat:setTitle
						// ----------------------------------

						endpoint = 'setChatTitle';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.title = this.getNodeParameter('title', i) as string;

					}
					// } else if (resource === 'bot') {
					// 	if (operation === 'info') {
					// 		endpoint = 'getUpdates';
					// 	}
				} else if (resource === 'file') {

					if (operation === 'get') {
						// ----------------------------------
						//         file:get
						// ----------------------------------

						endpoint = 'getFile';

						body.file_id = this.getNodeParameter('fileId', i) as string;
					}

				} else if (resource === 'message') {

					if (operation === 'editMessageText') {
						// ----------------------------------
						//         message:editMessageText
						// ----------------------------------

						endpoint = 'editMessageText';

						const messageType = this.getNodeParameter('messageType', i) as string;

						if (messageType === 'inlineMessage') {
							body.inline_message_id = this.getNodeParameter('inlineMessageId', i) as string;
						} else {
							body.chat_id = this.getNodeParameter('chatId', i) as string;
							body.message_id = this.getNodeParameter('messageId', i) as string;
						}

						body.text = this.getNodeParameter('text', i) as string;

						// Add additional fields and replyMarkup
						addAdditionalFields.call(this, body, i);

					} else if (operation === 'deleteMessage') {
						// ----------------------------------
						//       message:deleteMessage
						// ----------------------------------

						endpoint = 'deleteMessage';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.message_id = this.getNodeParameter('messageId', i) as string;

					} else if (operation === 'pinChatMessage') {
						// ----------------------------------
						//        message:pinChatMessage
						// ----------------------------------

						endpoint = 'pinChatMessage';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.message_id = this.getNodeParameter('messageId', i) as string;

						const { disable_notification } = this.getNodeParameter('additionalFields', i) as IDataObject;
						if (disable_notification) {
							body.disable_notification = true;
						}

					} else if (operation === 'unpinChatMessage') {
						// ----------------------------------
						//        message:unpinChatMessage
						// ----------------------------------

						endpoint = 'unpinChatMessage';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.message_id = this.getNodeParameter('messageId', i) as string;

					} else if (operation === 'sendAnimation') {
						// ----------------------------------
						//         message:sendAnimation
						// ----------------------------------

						endpoint = 'sendAnimation';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.animation = this.getNodeParameter('file', i, '') as string;

						// Add additional fields and replyMarkup
						addAdditionalFields.call(this, body, i);

					} else if (operation === 'sendAudio') {
						// ----------------------------------
						//         message:sendAudio
						// ----------------------------------

						endpoint = 'sendAudio';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.audio = this.getNodeParameter('file', i, '') as string;

						// Add additional fields and replyMarkup
						addAdditionalFields.call(this, body, i);

					} else if (operation === 'sendChatAction') {
						// ----------------------------------
						//         message:sendChatAction
						// ----------------------------------

						endpoint = 'sendChatAction';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.action = this.getNodeParameter('action', i) as string;

					} else if (operation === 'sendDocument') {
						// ----------------------------------
						//         message:sendDocument
						// ----------------------------------

						endpoint = 'sendDocument';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.document = this.getNodeParameter('file', i, '') as string;

						// Add additional fields and replyMarkup
						addAdditionalFields.call(this, body, i);

					} else if (operation === 'sendLocation') {
						// ----------------------------------
						//         message:sendLocation
						// ----------------------------------

						endpoint = 'sendLocation';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.latitude = this.getNodeParameter('latitude', i) as string;
						body.longitude = this.getNodeParameter('longitude', i) as string;

						// Add additional fields and replyMarkup
						addAdditionalFields.call(this, body, i);

					} else if (operation === 'sendMessage') {
						// ----------------------------------
						//         message:sendMessage
						// ----------------------------------

						endpoint = 'sendMessage';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.text = this.getNodeParameter('text', i) as string;

						// Add additional fields and replyMarkup
						addAdditionalFields.call(this, body, i);

					} else if (operation === 'sendMediaGroup') {
						// ----------------------------------
						//         message:sendMediaGroup
						// ----------------------------------

						endpoint = 'sendMediaGroup';

						body.chat_id = this.getNodeParameter('chatId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const mediaItems = this.getNodeParameter('media', i) as IDataObject;
						body.media = [];
						for (const mediaItem of mediaItems.media as IDataObject[]) {
							if (mediaItem.additionalFields !== undefined) {
								Object.assign(mediaItem, mediaItem.additionalFields);
								delete mediaItem.additionalFields;
							}
							(body.media as IDataObject[]).push(mediaItem);
						}

					} else if (operation === 'sendPhoto') {
						// ----------------------------------
						//         message:sendPhoto
						// ----------------------------------

						endpoint = 'sendPhoto';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.photo = this.getNodeParameter('file', i, '') as string;

						// Add additional fields and replyMarkup
						addAdditionalFields.call(this, body, i);

					} else if (operation === 'sendSticker') {
						// ----------------------------------
						//         message:sendSticker
						// ----------------------------------

						endpoint = 'sendSticker';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.sticker = this.getNodeParameter('file', i, '') as string;

						// Add additional fields and replyMarkup
						addAdditionalFields.call(this, body, i);

					} else if (operation === 'sendVideo') {
						// ----------------------------------
						//         message:sendVideo
						// ----------------------------------

						endpoint = 'sendVideo';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.video = this.getNodeParameter('file', i, '') as string;

						// Add additional fields and replyMarkup
						addAdditionalFields.call(this, body, i);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
				}

				let responseData;

				if (binaryData === true) {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;
					const binaryData = items[i].binary![binaryPropertyName] as IBinaryData;
					const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
					const propertyName = getPropertyName(operation);

					body.disable_notification = body.disable_notification?.toString() || 'false';

					const formData = {
						...body,
						[propertyName]: {
							value: dataBuffer,
							options: {
								filename: binaryData.fileName,
								contentType: binaryData.mimeType,
							},
						},
					};
					responseData = await apiRequest.call(this, requestMethod, endpoint, {}, qs, { formData });
				} else {
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
				}

				if (resource === 'file' && operation === 'get') {
					if (this.getNodeParameter('download', i, false) as boolean === true) {
						const filePath = responseData.result.file_path;

						const credentials = await this.getCredentials('telegramApi');

						if (credentials === undefined) {
							throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
						}
						const file = await apiRequest.call(this, 'GET', '', {}, {}, { json: false, encoding: null, uri: `https://api.telegram.org/file/bot${credentials.accessToken}/${filePath}`, resolveWithFullResponse: true });

						const fileName = filePath.split('/').pop();
						const binaryData = await this.helpers.prepareBinaryData(Buffer.from(file.body as string), fileName);

						returnData.push({
							json: responseData,
							binary: {
								data: binaryData,
							},
						});
						continue;
					}
				}

				// if (resource === 'bot' && operation === 'info') {
				// 	responseData = {
				// 		user: responseData.result[0].message.from,
				// 		chat: responseData.result[0].message.chat,
				// 	};
				// }

				returnData.push({ json: responseData });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
