import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

interface Attachment {
	fields: {
		item?: object[];
	};
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
					if (body.as_user === false) {
						body.username = this.getNodeParameter('username', i) as string;
					}

					const attachments = this.getNodeParameter('attachments', i, []) as unknown as Attachment[];

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
