import {
	IExecuteFunctions,
	BINARY_ENCODING,
 } from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	channelFields,
	channelOperations,
} from './ChannelDescription';
import {
	messageFields,
	messageOperations,
} from './MessageDescription';
import {
	starFields,
	starOperations,
} from './StarDescription';
import {
	fileFields,
	fileOperations,
} from './FileDescription';
import {
	slackApiRequest,
	slackApiRequestAllItems,
} from './GenericFunctions';
import {
	IAttachment,
} from './MessageInterface';

export class Slack implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Slack',
		name: 'slack',
		icon: 'file:slack.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Slack API',
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
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'slackOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oauth2',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oauth2',
					},
				],
				default: 'accessToken',
				description: 'The resource to operate on.',
			},
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
						name: 'File',
						value: 'file',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Star',
						value: 'star',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},
			...channelOperations,
			...channelFields,
			...messageOperations,
			...messageFields,
			...starOperations,
			...starFields,
			...fileOperations,
			...fileFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the users to display them to user so that he can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await slackApiRequestAllItems.call(this, 'members', 'GET', '/users.list');
				for (const user of users) {
					const userName = user.name;
					const userId = user.id;
					returnData.push({
						name: userName,
						value: userId,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});

				return returnData;
			},
			// Get all the users to display them to user so that he can
			// select them easily
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const channels = await slackApiRequestAllItems.call(this, 'channels', 'GET', '/conversations.list');
				for (const channel of channels) {
					const channelName = channel.name;
					const channelId = channel.id;
					returnData.push({
						name: channelName,
						value: channelId,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});

				return returnData;
			},
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let qs: IDataObject;
		let responseData;
		const authentication = this.getNodeParameter('authentication', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			qs = {};
			if (resource === 'channel') {
				//https://api.slack.com/methods/conversations.archive
				if (operation === 'archive') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const body: IDataObject = {
						channel,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.archive', body, qs);
				}
				//https://api.slack.com/methods/conversations.close
				if (operation === 'close') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const body: IDataObject = {
						channel,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.close', body, qs);
				}
				//https://api.slack.com/methods/conversations.create
				if (operation === 'create') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						name: channel,
					};
					if (additionalFields.isPrivate) {
						body.is_private = additionalFields.isPrivate as boolean;
					}
					if (additionalFields.users) {
						body.user_ids = (additionalFields.users as string[]).join(',');
					}
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.create', body, qs);
					responseData = responseData.channel;
				}
				//https://api.slack.com/methods/conversations.kick
				if (operation === 'kick') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const userId = this.getNodeParameter('userId', i) as string;
					const body: IDataObject = {
						name: channel,
						user: userId,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.kick', body, qs);
				}
				//https://api.slack.com/methods/conversations.join
				if (operation === 'join') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const body: IDataObject = {
						channel,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.join', body, qs);
					responseData = responseData.channel;
				}
				//https://api.slack.com/methods/conversations.info
				if (operation === 'get') {
					const channel = this.getNodeParameter('channelId', i) as string;
					qs.channel = channel,
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.info', {}, qs);
					responseData = responseData.channel;
				}
				//https://api.slack.com/methods/conversations.list
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					if (filters.types) {
						qs.types = (filters.types as string[]).join(',');
					}
					if (filters.excludeArchived) {
						qs.exclude_archived = filters.excludeArchived as boolean;
					}
					if (returnAll === true) {
						responseData = await slackApiRequestAllItems.call(this, 'channels', 'GET', '/conversations.list', {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await slackApiRequest.call(this, 'GET', '/conversations.list', {}, qs);
						responseData = responseData.channels;
					}
				}
				//https://api.slack.com/methods/conversations.history
				if (operation === 'history') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					qs.channel = channel;
					if (filters.inclusive) {
						qs.inclusive = filters.inclusive as boolean;
					}
					if (filters.latest) {
						qs.latest = filters.latest as string;
					}
					if (filters.oldest) {
						qs.oldest = filters.oldest as string;
					}
					if (returnAll === true) {
						responseData = await slackApiRequestAllItems.call(this, 'messages', 'GET', '/conversations.history', {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await slackApiRequest.call(this, 'GET', '/conversations.history', {}, qs);
						responseData = responseData.messages;
					}
				}
				//https://api.slack.com/methods/conversations.invite
				if (operation === 'invite') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const userId = this.getNodeParameter('userId', i) as string;
					const body: IDataObject = {
						channel,
						user: userId,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.invite', body, qs);
					responseData = responseData.channel;
				}
				//https://api.slack.com/methods/conversations.leave
				if (operation === 'leave') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const body: IDataObject = {
						channel,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.leave', body, qs);
				}
				//https://api.slack.com/methods/conversations.open
				if (operation === 'open') {
					const options = this.getNodeParameter('options', i) as IDataObject;
					const body: IDataObject = {};
					if (options.channelId) {
						body.channel = options.channelId as string;
					}
					if (options.returnIm) {
						body.return_im = options.returnIm as boolean;
					}
					if (options.users) {
						body.users = (options.users as string[]).join(',');
					}
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.open', body, qs);
					responseData = responseData.channel;
				}
				//https://api.slack.com/methods/conversations.rename
				if (operation === 'rename') {
					const channel = this.getNodeParameter('channelId', i) as IDataObject;
					const name = this.getNodeParameter('name', i) as IDataObject;
					const body: IDataObject = {
						channel,
						name,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.rename', body, qs);
					responseData = responseData.channel;
				}
				//https://api.slack.com/methods/conversations.replies
				if (operation === 'replies') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const ts = this.getNodeParameter('ts', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					qs.channel = channel;
					qs.ts = ts;
					if (filters.inclusive) {
						qs.inclusive = filters.inclusive as boolean;
					}
					if (filters.latest) {
						qs.latest = filters.latest as string;
					}
					if (filters.oldest) {
						qs.oldest = filters.oldest as string;
					}
					if (returnAll === true) {
						responseData = await slackApiRequestAllItems.call(this, 'messages', 'GET', '/conversations.replies', {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await slackApiRequest.call(this, 'GET', '/conversations.replies', {}, qs);
						responseData = responseData.messages;
					}
				}
				//https://api.slack.com/methods/conversations.setPurpose
				if (operation === 'setPurpose') {
					const channel = this.getNodeParameter('channelId', i) as IDataObject;
					const purpose = this.getNodeParameter('purpose', i) as IDataObject;
					const body: IDataObject = {
						channel,
						purpose,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.setPurpose', body, qs);
					responseData = responseData.channel;
				}
				//https://api.slack.com/methods/conversations.setTopic
				if (operation === 'setTopic') {
					const channel = this.getNodeParameter('channelId', i) as IDataObject;
					const topic = this.getNodeParameter('topic', i) as IDataObject;
					const body: IDataObject = {
						channel,
						topic,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.setTopic', body, qs);
					responseData = responseData.channel;
				}
				//https://api.slack.com/methods/conversations.unarchive
				if (operation === 'unarchive') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const body: IDataObject = {
						channel,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/conversations.unarchive', body, qs);
				}
			}
			if (resource === 'message') {
				//https://api.slack.com/methods/chat.postMessage
				if (operation === 'post') {
					const channel = this.getNodeParameter('channel', i) as string;
					const text = this.getNodeParameter('text', i) as string;
					const attachments = this.getNodeParameter('attachments', i, []) as unknown as IAttachment[];
					const body: IDataObject = {
						channel,
						text,
					};

					if (authentication === 'accessToken') {
						body.as_user = this.getNodeParameter('as_user', i) as boolean;
					}
					if (body.as_user === false) {
						body.username = this.getNodeParameter('username', i) as string;
					}

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
					responseData = await slackApiRequest.call(this, 'POST', '/chat.postMessage', body, qs);
				}
				//https://api.slack.com/methods/chat.update
				if (operation === 'update') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const text = this.getNodeParameter('text', i) as string;
					const ts = this.getNodeParameter('ts', i) as string;
					const attachments = this.getNodeParameter('attachments', i, []) as unknown as IAttachment[];
					const body: IDataObject = {
						channel,
						text,
						ts,
					};

					if (authentication === 'accessToken') {
						body.as_user = this.getNodeParameter('as_user', i) as boolean;
					}

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
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					Object.assign(body, updateFields);
					responseData = await slackApiRequest.call(this, 'POST', '/chat.update', body, qs);
				}
			}
			if (resource === 'star') {
				//https://api.slack.com/methods/stars.add
				if (operation === 'add') {
					const options = this.getNodeParameter('options', i) as IDataObject;
					const body: IDataObject = {};
					if (options.channelId) {
						body.channel = options.channelId as string;
					}
					if (options.fileId) {
						body.file = options.fileId as string;
					}
					if (options.fileComment) {
						body.file_comment = options.fileComment as string;
					}
					if (options.timestamp) {
						body.timestamp = options.timestamp as string;
					}
					responseData = await slackApiRequest.call(this, 'POST', '/stars.add', body, qs);
				}
				//https://api.slack.com/methods/stars.remove
				if (operation === 'delete') {
					const options = this.getNodeParameter('options', i) as IDataObject;
					const body: IDataObject = {};
					if (options.channelId) {
						body.channel = options.channelId as string;
					}
					if (options.fileId) {
						body.file = options.fileId as string;
					}
					if (options.fileComment) {
						body.file_comment = options.fileComment as string;
					}
					if (options.timestamp) {
						body.timestamp = options.timestamp as string;
					}
					responseData = await slackApiRequest.call(this, 'POST', '/stars.remove', body, qs);
				}
				//https://api.slack.com/methods/stars.list
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === true) {
						responseData = await slackApiRequestAllItems.call(this, 'items', 'GET', '/stars.list', {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await slackApiRequest.call(this, 'GET', '/stars.list', {}, qs);
						responseData = responseData.items;
					}
				}
			}
			if (resource === 'file') {
				//https://api.slack.com/methods/files.upload
				if (operation === 'upload') {
					const options = this.getNodeParameter('options', i) as IDataObject;
					const binaryData = this.getNodeParameter('binaryData', i) as boolean;
					const body: IDataObject = {};
					if (options.channelIds) {
						body.channels = (options.channelIds as string[]).join(',');
					}
					if (options.fileName) {
						body.filename = options.fileName as string;
					}
					if (options.initialComment) {
						body.initial_comment = options.initialComment as string;
					}
					if (options.threadTs) {
						body.thread_ts = options.threadTs as string;
					}
					if (options.title) {
						body.title = options.title as string;
					}
					if (binaryData) {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						if (items[i].binary === undefined
						//@ts-ignore
						|| items[i].binary[binaryPropertyName] === undefined) {
							throw new Error(`No binary data property "${binaryPropertyName}" does not exists on item!`);
						}
						body.file = {
							//@ts-ignore
							value: Buffer.from(items[i].binary[binaryPropertyName].data, BINARY_ENCODING),
							options: {
								//@ts-ignore
								filename: items[i].binary[binaryPropertyName].fileName,
								//@ts-ignore
								contentType: items[i].binary[binaryPropertyName].mimeType,
							}
						};
						responseData = await slackApiRequest.call(this, 'POST', '/files.upload', {}, qs, { 'Content-Type': 'multipart/form-data' }, {  formData: body });
						responseData = responseData.file;
					} else {
						const fileContent = this.getNodeParameter('fileContent', i) as string;
						body.content = fileContent;
						responseData = await slackApiRequest.call(this, 'POST', '/files.upload', body, qs, { 'Content-Type': 'application/x-www-form-urlencoded' }, { form: body });
						responseData = responseData.file;
					}
				}
				//https://api.slack.com/methods/files.list
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					if (filters.channelId) {
						qs.channel = filters.channelId as string;
					}
					if (filters.showFilesHidden) {
						qs.show_files_hidden_by_limit = filters.showFilesHidden as boolean;
					}
					if (filters.tsFrom) {
						qs.ts_from = filters.tsFrom as string;
					}
					if (filters.tsTo) {
						qs.ts_to = filters.tsTo as string;
					}
					if (filters.types) {
						qs.types = (filters.types as string[]).join(',') as string;
					}
					if (filters.userId) {
						qs.user = filters.userId as string;
					}
					if (returnAll === true) {
						responseData = await slackApiRequestAllItems.call(this, 'files', 'GET', '/files.list', {}, qs);
					} else {
						qs.count = this.getNodeParameter('limit', i) as number;
						responseData = await slackApiRequest.call(this, 'GET', '/files.list', {}, qs);
						responseData = responseData.files;
					}
				}
				//https://api.slack.com/methods/files.info
				if (operation === 'get') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					qs.file = fileId;
					responseData = await slackApiRequest.call(this, 'GET', '/files.info', {}, qs);
					responseData = responseData.file;
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
