import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	IBinaryKeyData,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	twistApiRequest,
} from './GenericFunctions';

import {
	channelFields,
	channelOperations,
} from './ChannelDescription';

import {
	messageConversationFields,
	messageConversationOperations,
} from './MessageConversationDescription';

import uuid = require('uuid');

export class Twist implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twist',
		name: 'twist',
		icon: 'file:twist.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Twist API',
		defaults: {
			name: 'Twist',
			color: '#316fea',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'twistOAuth2Api',
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
						name: 'Message Conversation',
						value: 'messageConversation',
					},
				],
				default: 'messageConversation',
				description: 'The resource to operate on.',
			},
			...channelOperations,
			...channelFields,
			...messageConversationOperations,
			...messageConversationFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available workspaces to display them to user so that he can
			// select them easily
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaces = await twistApiRequest.call(this, 'GET', '/workspaces/get');
				for (const workspace of workspaces) {
					returnData.push({
						name: workspace.name,
						value: workspace.id,
					});
				}

				return returnData;
			},
			// Get all the available conversations to display them to user so that he can
			// select them easily
			async getConversations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {
					workspace_id: this.getCurrentNodeParameter('workspaceId') as string,
				};
				const conversations = await twistApiRequest.call(this, 'GET', '/conversations/get', {}, qs);
				for (const conversation of conversations) {
					returnData.push({
						name: conversation.title || conversation.id,
						value: conversation.id,
					});
				}
				return returnData;
			},

			// Get all the available users to display them to user so that he can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {
					id: this.getCurrentNodeParameter('workspaceId') as string,
				};
				const users = await twistApiRequest.call(this, 'GET', '/workspaces/get_users', {}, qs);
				for (const user of users) {
					returnData.push({
						name: user.name,
						value: user.id,
					});
				}
				return returnData;
			},

			// Get all the available groups to display them to user so that he can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {
					workspace_id: this.getCurrentNodeParameter('workspaceId') as string,
				};
				const groups = await twistApiRequest.call(this, 'GET', '/groups/get', {}, qs);
				for (const group of groups) {
					returnData.push({
						name: group.name,
						value: group.id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'channel') {
				//https://developer.twist.com/v3/#add-channel
				if (operation === 'create') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const name = this.getNodeParameter('name', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						workspace_id: workspaceId,
						name,
					};
					Object.assign(body, additionalFields);

					responseData = await twistApiRequest.call(this, 'POST', '/channels/add', body);
				}
				//https://developer.twist.com/v3/#get-channel
				if (operation === 'get') {
					const channelId = this.getNodeParameter('channelId', i) as string;
					qs.id = channelId;

					responseData = await twistApiRequest.call(this, 'GET', '/channels/getone', {}, qs);
				}
				//https://developer.twist.com/v3/#get-all-channels
				if (operation === 'getAll') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					qs.workspace_id = workspaceId;
					Object.assign(qs, filters);

					responseData = await twistApiRequest.call(this, 'GET', '/channels/get', {}, qs);

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.splice(0, limit);
					}
				}
				//https://developer.twist.com/v3/#update-channel
				if (operation === 'update') {
					const channelId = this.getNodeParameter('channelId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: IDataObject = {
						id: channelId,
					};
					Object.assign(body, updateFields);

					responseData = await twistApiRequest.call(this, 'POST', '/channels/update', body);
				}
			}
			if (resource === 'messageConversation') {
				//https://developer.twist.com/v3/#add-message-to-conversation
				if (operation === 'create') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const conversationId = this.getNodeParameter('conversationId', i) as string;
					const content = this.getNodeParameter('content', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						conversation_id: conversationId,
						workspace_id: workspaceId,
						content,
					};
					Object.assign(body, additionalFields);

					if (body.actionsUi) {
						const actions = (body.actionsUi as IDataObject).actionValues as IDataObject[];

						if (actions) {
							body.actions = actions;
							delete body.actionsUi;
						}
					}

					if (body.binaryProperties) {
						const binaryProperties = (body.binaryProperties as string).split(',') as string[];

						const attachments: IDataObject[] = [];

						for (const binaryProperty of binaryProperties) {

							const item = items[i].binary as IBinaryKeyData;

							const binaryData = item[binaryProperty] as IBinaryData;

							if (binaryData === undefined) {
								throw new Error(`No binary data property "${binaryProperty}" does not exists on item!`);
							}

							attachments.push(await twistApiRequest.call(
								this,
								'POST',
								`/attachments/upload`,
								{},
								{},
								{
									formData: {
										file_name: {
											value: Buffer.from(binaryData.data, BINARY_ENCODING),
											options: {
												filename: binaryData.fileName,
											},
										},
										attachment_id: uuid(),
									},
								},
							));
						}

						body.attachments = attachments;
					}

					if (body.direct_mentions) {
						const direcMentions: string[] = [];
						for (const directMention of body.direct_mentions as number[]) {
							direcMentions.push(`[name](twist-mention://${directMention})`);
						}
						body.content = `${direcMentions.join(' ')} ${body.content}`;
					}

					// if (body.direct_group_mentions) {
					// 	const directGroupMentions: string[] = [];
					// 	for (const directGroupMention of body.direct_group_mentions as number[]) {
					// 		directGroupMentions.push(`[Group name](twist-group-mention://${directGroupMention})`);
					// 	}
					// 	body.content = `${directGroupMentions.join(' ')} ${body.content}`;
					// }

					responseData = await twistApiRequest.call(this, 'POST', '/conversation_messages/add', body);
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
