import { lookup } from 'mime-types';
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	JsonObject,
} from 'n8n-workflow';
import {
	BINARY_ENCODING,
	SEND_AND_WAIT_OPERATION,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import type { Readable } from 'stream';

import {
	addAdditionalFields,
	addReplyMarkup,
	apiRequest,
	createSendAndWaitMessageBody,
	getPropertyName,
} from './GenericFunctions';
import { telegramHitlProperties } from './hitl/descriptions';
import { prepareChatApproval } from './hitl/setup';
import { telegramSendAndWaitWebhook } from './hitl/webhook';
import { appendAttributionOption } from '../../utils/descriptions';
import { configureWaitTillDate } from '../../utils/sendAndWait/configureWaitTillDate.util';
import { sendAndWaitWebhooksDescription } from '../../utils/sendAndWait/descriptions';
import {
	getSendAndWaitProperties,
	SEND_AND_WAIT_WAITING_TOOLTIP,
} from '../../utils/sendAndWait/utils';

export class Telegram implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Telegram',
		name: 'telegram',
		icon: 'file:telegram.svg',
		group: ['output'],
		version: [1, 1.1, 1.2],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Telegram',
		defaults: {
			name: 'Telegram',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'telegramApi',
				required: true,
			},
		],
		waitingNodeTooltip: SEND_AND_WAIT_WAITING_TOOLTIP,
		webhooks: sendAndWaitWebhooksDescription,
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
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
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['chat'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get up to date information about a chat',
						action: 'Get a chat',
					},
					{
						name: 'Get administrators',
						value: 'administrators',
						description: 'Get the Administrators of a chat',
						action: 'Get all administrators in a chat',
					},
					{
						name: 'Get member',
						value: 'member',
						description: 'Get the member of a chat',
						action: 'Get a member in a chat',
					},
					{
						name: 'Leave',
						value: 'leave',
						description: 'Leave a group, supergroup or channel',
						action: 'Leave a chat',
					},
					{
						name: 'Set description',
						value: 'setDescription',
						description: 'Set the description of a chat',
						action: 'Set description on a chat',
					},
					{
						name: 'Set title',
						value: 'setTitle',
						description: 'Set the title of a chat',
						action: 'Set a title on a chat',
					},
				],
				default: 'get',
			},

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['callback'],
					},
				},
				options: [
					{
						name: 'Answer query',
						value: 'answerQuery',
						description: 'Send answer to callback query sent from inline keyboard',
						action: 'Answer query a callback',
					},
					{
						name: 'Answer inline query',
						value: 'answerInlineQuery',
						description: 'Send answer to callback query sent from inline bot',
						action: 'Answer an inline query callback',
					},
				],
				default: 'answerQuery',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a file',
						action: 'Get a file',
					},
				],
				default: 'get',
			},

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
						name: 'Delete chat message',
						value: 'deleteMessage',
						description: 'Delete a chat message',
						action: 'Delete a chat message',
					},
					{
						name: 'Edit message text',
						value: 'editMessageText',
						description: 'Edit a text message',
						action: 'Edit a text message',
					},
					{
						name: 'Pin chat message',
						value: 'pinChatMessage',
						description: 'Pin a chat message',
						action: 'Pin a chat message',
					},
					{
						name: 'Send animation',
						value: 'sendAnimation',
						description: 'Send an animated file',
						action: 'Send an animated file',
					},
					{
						name: 'Send audio',
						value: 'sendAudio',
						description: 'Send a audio file',
						action: 'Send an audio file',
					},
					{
						name: 'Send chat action',
						value: 'sendChatAction',
						description: 'Send a chat action',
						action: 'Send a chat action',
					},
					{
						name: 'Send document',
						value: 'sendDocument',
						description: 'Send a document',
						action: 'Send a document',
					},
					{
						name: 'Send location',
						value: 'sendLocation',
						description: 'Send a location',
						action: 'Send a location',
					},
					{
						name: 'Send media group',
						value: 'sendMediaGroup',
						description: 'Send group of photos or videos to album',
						action: 'Send a media group message',
					},
					{
						name: 'Send message',
						value: 'sendMessage',
						description: 'Send a text message',
						action: 'Send a text message',
					},
					{
						name: 'Send message draft',
						value: 'sendMessageDraft',
						description: 'Stream a partial message preview while it is being generated',
						action: 'Send a message draft',
					},
					{
						name: 'Send rich message',
						value: 'sendRichMessage',
						description:
							'Send a richly formatted message with headings, lists, tables, media and more',
						action: 'Send a rich message',
					},
					{
						name: 'Send rich message draft',
						value: 'sendRichMessageDraft',
						description: 'Stream a partial rich message preview while it is being generated',
						action: 'Send a rich message draft',
					},
					{
						name: 'Send and wait for response',
						value: SEND_AND_WAIT_OPERATION,
						description: 'Send a message and wait for response',
						action: 'Send message and wait for response',
					},
					{
						name: 'Send photo',
						value: 'sendPhoto',
						description: 'Send a photo',
						action: 'Send a photo message',
					},
					{
						name: 'Send sticker',
						value: 'sendSticker',
						description: 'Send a sticker',
						action: 'Send a sticker',
					},
					{
						name: 'Send video',
						value: 'sendVideo',
						description: 'Send a video',
						action: 'Send a video',
					},
					{
						name: 'Unpin chat message',
						value: 'unpinChatMessage',
						description: 'Unpin a chat message',
						action: 'Unpin a chat message',
					},
				],
				default: 'sendMessage',
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
							'administrators',
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
							'sendMessageDraft',
							'sendMediaGroup',
							'sendPhoto',
							'sendRichMessage',
							'sendRichMessageDraft',
							'sendSticker',
							'sendVideo',
							'unpinChatMessage',
						],
						resource: ['chat', 'message'],
					},
				},
				required: true,
				description:
					'Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot',
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
						operation: ['deleteMessage'],
						resource: ['message'],
					},
				},
				required: true,
				description: 'Unique identifier of the message to delete',
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
						operation: ['pinChatMessage', 'unpinChatMessage'],
						resource: ['message'],
					},
				},
				required: true,
				description: 'Unique identifier of the message to pin or unpin',
			},
			{
				displayName: 'Additional fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
				displayOptions: {
					show: {
						operation: ['pinChatMessage'],
						resource: ['message'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Disable notification',
						name: 'disable_notification',
						type: 'boolean',
						default: false,
						description:
							'Whether to send a notification to all chat members about the new pinned message',
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
						operation: ['member'],
						resource: ['chat'],
					},
				},
				required: true,
				description: 'Unique identifier of the target user',
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
						operation: ['setDescription'],
						resource: ['chat'],
					},
				},
				required: true,
				description: 'New chat description, 0-255 characters',
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
						operation: ['setTitle'],
						resource: ['chat'],
					},
				},
				required: true,
				description: 'New chat title, 1-255 characters',
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
						operation: ['answerQuery'],
						resource: ['callback'],
					},
				},
				required: true,
				description: 'Unique identifier for the query to be answered',
			},

			{
				displayName: 'Additional fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
				displayOptions: {
					show: {
						operation: ['answerQuery'],
						resource: ['callback'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Cache time',
						name: 'cache_time',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'The maximum amount of time in seconds that the result of the callback query may be cached client-side',
					},
					{
						displayName: 'Show alert',
						name: 'show_alert',
						type: 'boolean',
						default: false,
						description:
							'Whether an alert will be shown by the client instead of a notification at the top of the chat screen',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						description:
							'Text of the notification. If not specified, nothing will be shown to the user, 0-200 characters.',
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						description: "URL that will be opened by the user's client",
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
						operation: ['answerInlineQuery'],
						resource: ['callback'],
					},
				},
				required: true,
				description: 'Unique identifier for the answered query',
			},
			{
				displayName: 'Results',
				name: 'results',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['answerInlineQuery'],
						resource: ['callback'],
					},
				},
				required: true,
				description: 'A JSON-serialized array of results for the inline query',
			},
			{
				displayName: 'Additional fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
				displayOptions: {
					show: {
						operation: ['answerInlineQuery'],
						resource: ['callback'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Cache time',
						name: 'cache_time',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description:
							'The maximum amount of time in seconds that the result of the callback query may be cached client-side',
					},
					{
						displayName: 'Show alert',
						name: 'show_alert',
						type: 'boolean',
						default: false,
						description:
							'Whether an alert will be shown by the client instead of a notification at the top of the chat screen',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						description:
							'Text of the notification. If not specified, nothing will be shown to the user, 0-200 characters.',
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						description: "URL that will be opened by the user's client",
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
						operation: ['get'],
						resource: ['file'],
					},
				},
				required: true,
				description: 'The ID of the file',
			},
			{
				displayName: 'Download',
				name: 'download',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['get'],
						resource: ['file'],
					},
				},
				default: true,
				description: 'Whether to download the file',
			},
			{
				displayName: 'Additional fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
				displayOptions: {
					show: {
						operation: ['get'],
						resource: ['file'],
						download: [true],
					},
				},
				default: {},
				options: [
					{
						displayName: 'MIME type',
						name: 'mimeType',
						type: 'string',
						placeholder: 'image/jpeg',
						default: '',
						description:
							'The MIME type of the file. If not specified, the MIME type will be determined by the file extension.',
					},
				],
			},

			// ----------------------------------
			//         message
			// ----------------------------------

			// ----------------------------------
			//         message:editMessageText
			// ----------------------------------

			{
				displayName: 'Message type',
				name: 'messageType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['editMessageText'],
						resource: ['message'],
					},
				},
				options: [
					{
						name: 'Inline message',
						value: 'inlineMessage',
					},
					{
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
				description: 'The type of the message to edit',
			},

			{
				displayName: 'Chat ID',
				name: 'chatId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						messageType: ['message'],
						operation: ['editMessageText'],
						resource: ['message'],
					},
				},
				required: true,
				description:
					'Unique identifier for the target chat or username, To find your chat ID ask @get_id_bot',
			},
			// ----------------------------------
			//         message:sendAnimation/sendAudio/sendDocument/sendPhoto/sendSticker/sendVideo
			// ----------------------------------

			{
				displayName: 'Binary file',
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
						resource: ['message'],
					},
				},
				description: 'Whether the data to upload should be taken from binary field',
			},
			{
				displayName: 'Input binary field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				hint: 'The name of the input binary field containing the file to be written',
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
						resource: ['message'],
						binaryData: [true],
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
						messageType: ['message'],
						operation: ['editMessageText'],
						resource: ['message'],
					},
				},
				required: true,
				description: 'Unique identifier of the message to edit',
			},
			{
				displayName: 'Inline message ID',
				name: 'inlineMessageId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						messageType: ['inlineMessage'],
						operation: ['editMessageText'],
						resource: ['message'],
					},
				},
				required: true,
				description: 'Unique identifier of the inline message to edit',
			},
			{
				displayName: 'Reply markup',
				name: 'replyMarkup',
				displayOptions: {
					show: {
						operation: ['editMessageText'],
						resource: ['message'],
					},
				},
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Inline keyboard',
						value: 'inlineKeyboard',
					},
				],
				default: 'none',
				description: 'Additional interface options',
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
						operation: ['sendAnimation'],
						resource: ['message'],
						binaryData: [false],
					},
				},
				description:
					'Animation to send. Pass a file_id to send an animation that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get an animation from the Internet.',
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
						operation: ['sendAudio'],
						resource: ['message'],
						binaryData: [false],
					},
				},
				description:
					'Audio file to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet.',
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
						operation: ['sendChatAction'],
						resource: ['message'],
					},
				},
				options: [
					{
						name: 'Find location',
						value: 'find_location',
						action: 'Find location',
					},
					{
						name: 'Record audio',
						value: 'record_audio',
						action: 'Record audio',
					},
					{
						name: 'Record video',
						value: 'record_video',
						action: 'Record video',
					},
					{
						name: 'Record video note',
						value: 'record_video_note',
						action: 'Record video note',
					},
					{
						name: 'Typing',
						value: 'typing',
						action: 'Typing a message',
					},
					{
						name: 'Upload audio',
						value: 'upload_audio',
						action: 'Upload audio',
					},
					{
						name: 'Upload document',
						value: 'upload_document',
						action: 'Upload document',
					},
					{
						name: 'Upload photo',
						value: 'upload_photo',
						action: 'Upload photo',
					},
					{
						name: 'Upload video',
						value: 'upload_video',
						action: 'Upload video',
					},
					{
						name: 'Upload video note',
						value: 'upload_video_note',
						action: 'Upload video note',
					},
				],
				default: 'typing',
				description:
					'Type of action to broadcast. Choose one, depending on what the user is about to receive. The status is set for 5 seconds or less (when a message arrives from your bot).',
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
						operation: ['sendDocument'],
						resource: ['message'],
						binaryData: [false],
					},
				},
				description:
					'Document to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet.',
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
						operation: ['sendLocation'],
						resource: ['message'],
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
						operation: ['sendLocation'],
						resource: ['message'],
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
						operation: ['sendMediaGroup'],
						resource: ['message'],
					},
				},
				description: 'The media to add',
				placeholder: 'Add media',
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
								description: 'The type of the media to add',
							},
							{
								displayName: 'Media file',
								name: 'media',
								type: 'string',
								default: '',
								description:
									'Media to send. Pass a file_id to send a file that exists on the Telegram servers (recommended) or pass an HTTP URL for Telegram to get a file from the Internet.',
							},
							{
								displayName: 'Additional fields',
								name: 'additionalFields',
								type: 'collection',
								placeholder: 'Add field',
								default: {},
								options: [
									{
										displayName: 'Caption',
										name: 'caption',
										type: 'string',
										default: '',
										description: 'Caption text to set, 0-1024 characters',
									},
									{
										displayName: 'Parse mode',
										name: 'parse_mode',
										type: 'options',
										options: [
											{
												name: 'Markdown (legacy)',
												value: 'Markdown',
											},
											{
												name: 'MarkdownV2',
												value: 'MarkdownV2',
											},
											{
												name: 'HTML',
												value: 'HTML',
											},
										],
										default: 'HTML',
										description: 'How to parse the text',
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
				default: '',
				displayOptions: {
					show: {
						operation: ['editMessageText', 'sendMessage'],
						resource: ['message'],
					},
				},
				description: 'Text of the message to be sent',
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
						operation: ['sendPhoto'],
						resource: ['message'],
						binaryData: [false],
					},
				},
				description:
					'Photo to send. Pass a file_id to send a photo that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a photo from the Internet.',
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
						operation: ['sendSticker'],
						resource: ['message'],
						binaryData: [false],
					},
				},
				description:
					'Sticker to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a .webp file from the Internet.',
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
						operation: ['sendVideo'],
						resource: ['message'],
						binaryData: [false],
					},
				},
				description:
					'Video file to send. Pass a file_id to send a file that exists on the Telegram servers (recommended), an HTTP URL for Telegram to get a file from the Internet.',
			},

			// ----------------------------------
			//   message:sendRichMessage/sendRichMessageDraft
			// ----------------------------------
			{
				displayName: 'Format',
				name: 'richFormat',
				type: 'options',
				options: [
					{
						name: 'Markdown',
						value: 'markdown',
					},
					{
						name: 'HTML',
						value: 'html',
					},
				],
				default: 'html',
				displayOptions: {
					show: {
						operation: ['sendRichMessage', 'sendRichMessageDraft'],
						resource: ['message'],
					},
				},
				description: 'Which formatting syntax the rich message content uses',
			},
			{
				displayName: 'Rich message',
				name: 'richMessageText',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['sendRichMessage', 'sendRichMessageDraft'],
						resource: ['message'],
					},
				},
				description:
					'Content of the rich message, written in the selected Markdown or HTML syntax. Supports headings, lists, tables, block quotes, media, collapsible blocks and more.',
				hint: 'Limits: up to 32768 characters, 500 blocks and 50 media attachments',
			},

			// ----------------------------------
			//         message:editMessageText/sendAnimation/sendAudio/sendLocation/sendMessage/sendPhoto/sendSticker/sendVideo
			// ----------------------------------

			{
				displayName: 'Reply markup',
				name: 'replyMarkup',
				displayOptions: {
					show: {
						operation: [
							'sendAnimation',
							'sendDocument',
							'sendMessage',
							'sendPhoto',
							'sendRichMessage',
							'sendSticker',
							'sendVideo',
							'sendAudio',
							'sendLocation',
						],
						resource: ['message'],
					},
				},
				type: 'options',
				options: [
					{
						name: 'Force reply',
						value: 'forceReply',
					},
					{
						name: 'Inline keyboard',
						value: 'inlineKeyboard',
					},
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Reply keyboard',
						value: 'replyKeyboard',
					},
					{
						name: 'Reply keyboard remove',
						value: 'replyKeyboardRemove',
					},
				],
				default: 'none',
				description: 'Additional interface options',
			},

			{
				displayName: 'Force reply',
				name: 'forceReply',
				type: 'collection',
				placeholder: 'Add field',
				displayOptions: {
					show: {
						replyMarkup: ['forceReply'],
						resource: ['message'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Force reply',
						name: 'force_reply',
						type: 'boolean',
						default: false,
						description:
							'Whether to show reply interface to the user, as if they manually selected the bot‘s message and tapped ’Reply',
					},
					{
						displayName: 'Selective',
						name: 'selective',
						type: 'boolean',
						default: false,
						description: 'Whether to force reply from specific users only',
					},
				],
			},

			{
				displayName: 'Inline keyboard',
				name: 'inlineKeyboard',
				placeholder: 'Add keyboard row',
				description: 'Adds an inline keyboard that appears right next to the message it belongs to',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						replyMarkup: ['inlineKeyboard'],
						resource: ['message'],
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
								description: 'The value to set',
								placeholder: 'Add button',
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
												description: 'Label text on the button',
											},
											{
												displayName: 'Additional fields',
												name: 'additionalFields',
												type: 'collection',
												placeholder: 'Add field',
												default: {},
												options: [
													{
														displayName: 'Callback data',
														name: 'callback_data',
														type: 'string',
														default: '',
														description:
															'Data to be sent in a callback query to the bot when button is pressed, 1-64 bytes',
													},
													{
														displayName: 'Pay',
														name: 'pay',
														type: 'boolean',
														default: false,
														description: 'Whether to send a Pay button',
													},
													{
														displayName: 'Switch inline query current chat',
														name: 'switch_inline_query_current_chat',
														type: 'string',
														default: '',
														description:
															"If set, pressing the button will insert the bot‘s username and the specified inline query in the current chat's input field.Can be empty, in which case only the bot’s username will be inserted",
													},
													{
														displayName: 'Switch inline query',
														name: 'switch_inline_query',
														type: 'string',
														default: '',
														description:
															'If set, pressing the button will prompt the user to select one of their chats, open that chat and insert the bot‘s username and the specified inline query in the input field. Can be empty, in which case just the bot’s username will be inserted.',
													},
													{
														displayName: 'URL',
														name: 'url',
														type: 'string',
														default: '',
														description: 'HTTP or tg:// URL to be opened when button is pressed',
													},
													{
														displayName: 'Web app',
														name: 'web_app',
														type: 'collection',
														placeholder: 'Set Telegram Web App URL',
														typeOptions: {
															multipleValues: false,
														},
														default: {},
														options: [
															{
																displayName: 'URL',
																name: 'url',
																type: 'string',
																default: '',
																description: 'An HTTPS URL of a Web App to be opened',
															},
														],
														description: 'Launch the Telegram Web App',
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
				displayName: 'Reply keyboard',
				name: 'replyKeyboard',
				placeholder: 'Add reply keyboard row',
				description: 'Adds a custom keyboard with reply options',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						replyMarkup: ['replyKeyboard'],
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
								description: 'The value to set',
								placeholder: 'Add button',
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
												description:
													'Text of the button. If none of the optional fields are used, it will be sent as a message when the button is pressed.',
											},
											{
												displayName: 'Additional fields',
												name: 'additionalFields',
												type: 'collection',
												placeholder: 'Add field',
												default: {},
												options: [
													{
														displayName: 'Request contact',
														name: 'request_contact',
														type: 'boolean',
														default: false,
														description:
															"Whether the user's phone number will be sent as a contact when the button is pressed.Available in private chats only",
													},
													{
														displayName: 'Request location',
														name: 'request_location',
														type: 'boolean',
														default: false,
														description: "Whether the user's request_location",
													},
													{
														displayName: 'Web app',
														name: 'web_app',
														type: 'collection',
														placeholder: 'Set Telegram Web App URL',
														typeOptions: {
															multipleValues: false,
														},
														default: {},
														options: [
															{
																displayName: 'URL',
																name: 'url',
																type: 'string',
																default: '',
																description: 'An HTTPS URL of a Web App to be opened',
															},
														],
														description: 'Launch the Telegram Web App',
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
				displayName: 'Reply keyboard options',
				name: 'replyKeyboardOptions',
				type: 'collection',
				placeholder: 'Add option',
				displayOptions: {
					show: {
						replyMarkup: ['replyKeyboard'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Resize keyboard',
						name: 'resize_keyboard',
						type: 'boolean',
						default: false,
						description:
							'Whether to request clients to resize the keyboard vertically for optimal fit',
					},
					{
						displayName: 'One time keyboard',
						name: 'one_time_keyboard',
						type: 'boolean',
						default: false,
						description:
							"Whether to request clients to hide the keyboard as soon as it's been used",
					},
					{
						displayName: 'Selective',
						name: 'selective',
						type: 'boolean',
						default: false,
						description: 'Whether to show the keyboard to specific users only',
					},
				],
			},

			{
				displayName: 'Reply keyboard remove',
				name: 'replyKeyboardRemove',
				type: 'collection',
				placeholder: 'Add field',
				displayOptions: {
					show: {
						replyMarkup: ['replyKeyboardRemove'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Remove keyboard',
						name: 'remove_keyboard',
						type: 'boolean',
						default: false,
						description: 'Whether to request clients to remove the custom keyboard',
					},
					{
						displayName: 'Selective',
						name: 'selective',
						type: 'boolean',
						default: false,
						description: 'Whether to force reply from specific users only',
					},
				],
			},

			{
				displayName: 'Additional fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
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
						resource: ['message'],
					},
				},
				default: {},
				options: [
					{
						...appendAttributionOption,
						description:
							'Whether to include the phrase “This message was sent automatically with n8n” to the end of the message',
						displayOptions: {
							show: {
								'/operation': ['sendMessage'],
							},
						},
					},
					{
						displayName: 'Caption',
						name: 'caption',
						type: 'string',
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
						description: 'Caption text to set, 0-1024 characters',
					},
					{
						displayName: 'Disable notification',
						name: 'disable_notification',
						type: 'boolean',
						default: false,
						displayOptions: {
							hide: {
								'/operation': ['editMessageText'],
							},
						},
						description:
							'Whether to send the message silently. Users will receive a notification with no sound.',
					},
					{
						displayName: 'Disable WebPage preview',
						name: 'disable_web_page_preview',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': ['editMessageText', 'sendMessage'],
							},
						},
						default: false,
						description: 'Whether to disable link previews for links in this message',
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
								'/operation': ['sendAnimation', 'sendAudio', 'sendVideo'],
							},
						},
						default: 0,
						description: 'Duration of clip in seconds',
					},
					{
						displayName: 'File name',
						name: 'fileName',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								'/operation': [
									'sendAnimation',
									'sendAudio',
									'sendDocument',
									'sendPhoto',
									'sendVideo',
									'sendSticker',
								],
								'/resource': ['message'],
								'/binaryData': [true],
							},
						},
						placeholder: 'image.jpeg',
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
								'/operation': ['sendAnimation', 'sendVideo'],
							},
						},
						default: 0,
						description: 'Height of the video',
					},
					{
						displayName: 'Parse mode',
						name: 'parse_mode',
						type: 'options',
						options: [
							{
								name: 'Markdown (legacy)',
								value: 'Markdown',
							},
							{
								name: 'MarkdownV2',
								value: 'MarkdownV2',
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
									'sendDocument',
								],
							},
						},
						default: 'HTML',
						description: 'How to parse the text',
					},
					{
						displayName: 'Performer',
						name: 'performer',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['sendAudio'],
							},
						},
						default: '',
						description: 'Name of the performer',
					},
					{
						displayName: 'Reply to message ID',
						name: 'reply_to_message_id',
						type: 'number',
						displayOptions: {
							hide: {
								'/operation': ['editMessageText'],
							},
						},
						default: 0,
						description: 'If the message is a reply, ID of the original message',
					},
					{
						displayName: 'Message thread ID',
						name: 'message_thread_id',
						type: 'number',
						displayOptions: {
							show: {
								'/operation': [
									'sendAnimation',
									'sendAudio',
									'sendChatAction',
									'sendDocument',
									'sendLocation',
									'sendMediaGroup',
									'sendMessage',
									'sendPhoto',
									'sendSticker',
									'sendVideo',
								],
							},
						},
						default: 0,
						description: 'The unique identifier of the forum topic',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['sendAudio'],
							},
						},
						default: '',
						description: 'Title of the track',
					},
					{
						displayName: 'Thumbnail',
						name: 'thumb',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['sendAnimation', 'sendAudio', 'sendDocument', 'sendVideo'],
							},
						},
						default: '',
						description:
							'Thumbnail of the file sent; can be ignored if thumbnail generation for the file is supported server-side. The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail‘s width and height should not exceed 320.',
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
								'/operation': ['sendAnimation', 'sendVideo'],
							},
						},
						default: 0,
						description: 'Width of the video',
					},
				],
			},

			// ----------------------------------
			//   message:sendMessageDraft/sendRichMessageDraft
			// ----------------------------------
			{
				displayName: 'Draft ID',
				name: 'draftId',
				type: 'number',
				default: 1,
				displayOptions: {
					show: {
						operation: ['sendMessageDraft', 'sendRichMessageDraft'],
						resource: ['message'],
					},
				},
				required: true,
				description:
					'Unique identifier of the message draft; must be non-zero. Updates streamed with the same draft ID are animated.',
			},

			// ----------------------------------
			//         message:sendMessageDraft
			// ----------------------------------
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				displayOptions: {
					show: {
						operation: ['sendMessageDraft'],
						resource: ['message'],
					},
				},
				description: 'Text of the message draft, 0-4096 characters',
			},
			{
				displayName: 'Additional fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
				displayOptions: {
					show: {
						operation: ['sendMessageDraft'],
						resource: ['message'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Message thread ID',
						name: 'message_thread_id',
						type: 'number',
						default: 0,
						description: 'The unique identifier of the forum topic',
					},
					{
						displayName: 'Parse mode',
						name: 'parse_mode',
						type: 'options',
						options: [
							{
								name: 'Markdown (legacy)',
								value: 'Markdown',
							},
							{
								name: 'MarkdownV2',
								value: 'MarkdownV2',
							},
							{
								name: 'HTML',
								value: 'HTML',
							},
						],
						default: 'HTML',
						description: 'How to parse the text',
					},
				],
			},

			// ----------------------------------
			//   message:sendRichMessage/sendRichMessageDraft additional fields
			// ----------------------------------
			{
				displayName: 'Additional fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add field',
				displayOptions: {
					show: {
						operation: ['sendRichMessage', 'sendRichMessageDraft'],
						resource: ['message'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Disable notification',
						name: 'disable_notification',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								'/operation': ['sendRichMessage'],
							},
						},
						description:
							'Whether to send the message silently. Users will receive a notification with no sound.',
					},
					{
						displayName: 'Message effect ID',
						name: 'message_effect_id',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								'/operation': ['sendRichMessage'],
							},
						},
						description:
							'Unique identifier of the message effect to be added to the message; for private chats only',
					},
					{
						displayName: 'Message thread ID',
						name: 'message_thread_id',
						type: 'number',
						default: 0,
						description: 'The unique identifier of the forum topic',
					},
					{
						displayName: 'Protect content',
						name: 'protect_content',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								'/operation': ['sendRichMessage'],
							},
						},
						description:
							'Whether to protect the contents of the sent message from forwarding and saving',
					},
					{
						displayName: 'Right-to-left',
						name: 'is_rtl',
						type: 'boolean',
						default: false,
						description: 'Whether the rich message must be shown right-to-left',
					},
					{
						displayName: 'Skip entity detection',
						name: 'skip_entity_detection',
						type: 'boolean',
						default: false,
						description:
							'Whether to skip automatic detection of entities such as URLs, emails, mentions, hashtags and phone numbers',
					},
				],
			},
			...getSendAndWaitProperties(
				[
					{
						displayName: 'Chat ID',
						name: 'chatId',
						type: 'string',
						default: '',
						required: true,
						description:
							'Unique identifier for the target chat or username of the target channel (in the format @channelusername). To find your chat ID ask @get_id_bot.',
					},
				],
				'message',
				telegramHitlProperties,
				{
					noButtonStyle: true,
					defaultApproveLabel: '✅ Approve',
					defaultDisapproveLabel: '❌ Decline',
				},
			).filter((p) => p.name !== 'subject'),
		],
	};

	webhook = telegramSendAndWaitWebhook;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: IHttpRequestMethods;
		let endpoint: string;

		const operation = this.getNodeParameter('operation', 0);
		const resource = this.getNodeParameter('resource', 0);
		const binaryData = this.getNodeParameter('binaryData', 0, false);

		const nodeVersion = this.getNode().typeVersion;
		const instanceId = this.getInstanceId();

		if (resource === 'message' && operation === SEND_AND_WAIT_OPERATION) {
			const chatApproval = await prepareChatApproval(this);
			body = createSendAndWaitMessageBody(this, chatApproval);

			try {
				await apiRequest.call(this, 'POST', 'sendMessage', body);
			} catch (error) {
				if (this.continueOnFail()) {
					return [[{ json: { error: (error as JsonObject).message } }]];
				}
				throw error;
			}

			const waitTill = configureWaitTillDate(this);

			await this.putExecutionToWait(waitTill);
			return [this.getInputData()];
		}

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
						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(body, additionalFields);
					} else if (operation === 'answerInlineQuery') {
						// -----------------------------------------------
						//         callback:answerInlineQuery
						// -----------------------------------------------

						endpoint = 'answerInlineQuery';

						body.inline_query_id = this.getNodeParameter('queryId', i) as string;
						body.results = this.getNodeParameter('results', i) as string;

						// Add additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(body, additionalFields);
					}
				} else if (resource === 'chat') {
					if (operation === 'get') {
						// ----------------------------------
						//         chat:get
						// ----------------------------------

						endpoint = 'getChat';

						body.chat_id = this.getNodeParameter('chatId', i) as string;
					} else if (operation === 'administrators') {
						// ----------------------------------
						//         chat:administrators
						// ----------------------------------

						endpoint = 'getChatAdministrators';

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

						const { disable_notification } = this.getNodeParameter('additionalFields', i);
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
						addAdditionalFields.call(this, body, i, nodeVersion, instanceId);
					} else if (operation === 'sendMediaGroup') {
						// ----------------------------------
						//         message:sendMediaGroup
						// ----------------------------------

						endpoint = 'sendMediaGroup';

						body.chat_id = this.getNodeParameter('chatId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);
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
					} else if (operation === 'sendMessageDraft') {
						// ----------------------------------
						//        message:sendMessageDraft
						// ----------------------------------

						endpoint = 'sendMessageDraft';

						const draftId = this.getNodeParameter('draftId', i) as number;
						if (!draftId) {
							throw new NodeOperationError(this.getNode(), 'Draft ID must be non-zero', {
								itemIndex: i,
							});
						}

						body.chat_id = this.getNodeParameter('chatId', i) as string;
						body.draft_id = draftId;
						body.text = this.getNodeParameter('text', i, '') as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(body, additionalFields);
					} else if (operation === 'sendRichMessage' || operation === 'sendRichMessageDraft') {
						// ----------------------------------------------
						//   message:sendRichMessage/sendRichMessageDraft
						// ----------------------------------------------

						endpoint = operation;

						body.chat_id = this.getNodeParameter('chatId', i) as string;

						if (operation === 'sendRichMessageDraft') {
							const draftId = this.getNodeParameter('draftId', i) as number;
							if (!draftId) {
								throw new NodeOperationError(this.getNode(), 'Draft ID must be non-zero', {
									itemIndex: i,
								});
							}
							body.draft_id = draftId;
						}

						const format = this.getNodeParameter('richFormat', i) as string;
						const content = this.getNodeParameter('richMessageText', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const { is_rtl, skip_entity_detection } = additionalFields;

						// InputRichMessage requires exactly one of `html` or `markdown`
						const richMessage: IDataObject =
							format === 'html' ? { html: content } : { markdown: content };
						if (is_rtl !== undefined) {
							richMessage.is_rtl = is_rtl;
						}
						if (skip_entity_detection !== undefined) {
							richMessage.skip_entity_detection = skip_entity_detection;
						}

						body.rich_message = richMessage;

						// Assign only the fields consumed by the sendRichMessage API
						if (additionalFields.disable_notification !== undefined) {
							body.disable_notification = additionalFields.disable_notification;
						}
						if (additionalFields.protect_content !== undefined) {
							body.protect_content = additionalFields.protect_content;
						}
						if (additionalFields.message_thread_id !== undefined) {
							body.message_thread_id = additionalFields.message_thread_id;
						}
						if (additionalFields.message_effect_id !== undefined) {
							body.message_effect_id = additionalFields.message_effect_id;
						}

						// sendRichMessage supports reply_markup; the draft endpoints do not
						if (operation === 'sendRichMessage') {
							addReplyMarkup.call(this, body, i);
						}
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}

				let responseData;

				if (binaryData) {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
					const itemBinaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					const propertyName = getPropertyName(operation);
					const fileName = this.getNodeParameter('additionalFields.fileName', i, '') as string;

					const filename = fileName || itemBinaryData.fileName?.toString();

					if (!fileName && !itemBinaryData.fileName) {
						throw new NodeOperationError(
							this.getNode(),
							`File name is needed to ${operation}. Make sure the property that holds the binary data
						has the file name property set or set it manually in the node using the File Name parameter under
						Additional Fields.`,
						);
					}

					body.disable_notification = body.disable_notification?.toString() || 'false';

					let uploadData: Buffer | Readable;
					if (itemBinaryData.id) {
						uploadData = await this.helpers.getBinaryStream(itemBinaryData.id);
					} else {
						uploadData = Buffer.from(itemBinaryData.data, BINARY_ENCODING);
					}

					const formData = {
						...body,
						[propertyName]: {
							value: uploadData,
							options: {
								filename,
								contentType: itemBinaryData.mimeType,
							},
						},
					};

					if (formData.reply_markup) {
						formData.reply_markup = JSON.stringify(formData.reply_markup);
					}

					responseData = await apiRequest.call(this, requestMethod, endpoint, {}, qs, {
						formData,
					});
				} else {
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
				}

				if (resource === 'file' && operation === 'get') {
					if (this.getNodeParameter('download', i, false)) {
						const filePath = responseData.result.file_path;

						const credentials = await this.getCredentials('telegramApi');
						const file = await apiRequest.call(
							this,
							'GET',
							'',
							{},
							{},
							{
								json: false,
								encoding: null,
								uri: `${credentials.baseUrl}/file/bot${credentials.accessToken}/${filePath}`,
								resolveWithFullResponse: true,
								useStream: true,
							},
						);

						const fileName = filePath.split('/').pop() as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const providedMimeType = additionalFields?.mimeType as string | undefined;
						const mimeType = providedMimeType ?? (lookup(fileName) || 'application/octet-stream');

						const data = await this.helpers.prepareBinaryData(
							file.body as Buffer,
							fileName,
							mimeType,
						);

						returnData.push({
							json: responseData,
							binary: { data },
							pairedItem: { item: i },
						});
						continue;
					}
				} else if (resource === 'chat' && operation === 'administrators') {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData.result as IDataObject[]),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.description ?? error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
