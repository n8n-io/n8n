import {
	IExecuteFunctions,
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
	channelOperations,
	channelFields,
} from './ChannelDescription';
import {
	messageOperations,
	messageFields,
} from './MessageDescription';
import {
	conversationOperations,
	conversationFields,
} from './ConversationDescription';
import {
	slackApiRequest,
	salckApiRequestAllItems,
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
			}
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
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},
			...channelOperations,
			...channelFields,
			...messageOperations,
			...messageFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the users to display them to user so that he can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await salckApiRequestAllItems.call(this, 'members', 'GET', '/users.list');
				for (const user of users) {
					const userName = user.name;
					const userId = user.id;
					returnData.push({
						name: userName,
						value: userId,
					});
				}
				console.log(users)
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
		for (let i = 0; i < length; i++) {
			qs = {};
			const resource = this.getNodeParameter('resource', 0) as string;
			const operation = this.getNodeParameter('operation', 0) as string;
			if (resource === 'channel') {
				//https://api.slack.com/methods/conversations.create
				if (operation === 'create') {
					const channel = this.getNodeParameter('channel', i) as string;
					const body: IDataObject = {
						name: channel,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/channels.create', body, qs);
				}
				if (operation === 'invite') {
					const channel = this.getNodeParameter('channel', i) as string;
					const user = this.getNodeParameter('username', i) as string;
					const body: IDataObject = {
						channel,
						user,
					};
					responseData = await slackApiRequest.call(this, 'POST', '/channels.invite', body, qs);
				}
			}
			if (resource === 'message') {
				if (operation === 'post') {
					const channel = this.getNodeParameter('channel', i) as string;
					const text = this.getNodeParameter('text', i) as string;
					const attachments = this.getNodeParameter('attachments', i, []) as unknown as IAttachment[];
					const as_user = this.getNodeParameter('as_user', i) as boolean;
					const body: IDataObject = {
						channel: channel,
						text,
						as_user,
					};
					if (as_user === false) {
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
