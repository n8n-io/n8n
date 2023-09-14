import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { twistApiRequest } from './GenericFunctions';

import { channelFields, channelOperations } from './ChannelDescription';

import {
	messageConversationFields,
	messageConversationOperations,
} from './MessageConversationDescription';

import { threadFields, threadOperations } from './ThreadDescription';
import { commentFields, commentOperations } from './CommentDescription';
import { v4 as uuid } from 'uuid';
import moment from 'moment';

export class Twist implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twist',
		name: 'twist',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:twist.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Twist API',
		defaults: {
			name: 'Twist',
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
				noDataExpression: true,
				options: [
					{
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Comment',
						value: 'comment',
					},
					{
						name: 'Message Conversation',
						value: 'messageConversation',
					},
					{
						name: 'Thread',
						value: 'thread',
					},
				],
				default: 'messageConversation',
			},
			...channelOperations,
			...channelFields,
			...commentOperations,
			...commentFields,
			...messageConversationOperations,
			...messageConversationFields,
			...threadOperations,
			...threadFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available workspaces to display them to user so that they can
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
			// Get all the available conversations to display them to user so that they can
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

			// Get all the available users to display them to user so that they can
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

			// Get all the available groups to display them to user so that they can
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
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'channel') {
					//https://developer.twist.com/v3/#add-channel
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {
							workspace_id: workspaceId,
							name,
						};
						Object.assign(body, additionalFields);

						responseData = await twistApiRequest.call(this, 'POST', '/channels/add', body);
					}
					//https://developer.twist.com/v3/#remove-channel
					if (operation === 'delete') {
						qs.id = this.getNodeParameter('channelId', i) as string;

						responseData = await twistApiRequest.call(this, 'POST', '/channels/remove', {}, qs);
					}
					//https://developer.twist.com/v3/#get-channel
					if (operation === 'get') {
						qs.id = this.getNodeParameter('channelId', i) as string;

						responseData = await twistApiRequest.call(this, 'GET', '/channels/getone', {}, qs);
					}
					//https://developer.twist.com/v3/#get-all-channels
					if (operation === 'getAll') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						qs.workspace_id = workspaceId;
						Object.assign(qs, filters);

						responseData = await twistApiRequest.call(this, 'GET', '/channels/get', {}, qs);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
					//https://developer.twist.com/v3/#update-channel
					if (operation === 'update') {
						const channelId = this.getNodeParameter('channelId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {
							id: channelId,
						};
						Object.assign(body, updateFields);

						responseData = await twistApiRequest.call(this, 'POST', '/channels/update', body);
					}
					//https://developer.twist.com/v3/#archive-channel
					if (operation === 'archive') {
						qs.id = this.getNodeParameter('channelId', i) as string;

						responseData = await twistApiRequest.call(this, 'POST', '/channels/archive', {}, qs);
					}
					//https://developer.twist.com/v3/#unarchive-channel
					if (operation === 'unarchive') {
						qs.id = this.getNodeParameter('channelId', i) as string;

						responseData = await twistApiRequest.call(this, 'POST', '/channels/unarchive', {}, qs);
					}
				}
				if (resource === 'comment') {
					//https://developer.twist.com/v3/#add-comment
					if (operation === 'create') {
						const threadId = this.getNodeParameter('threadId', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {
							thread_id: threadId,
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
							const binaryProperties = (body.binaryProperties as string).split(',');

							const attachments: IDataObject[] = [];

							for (const binaryProperty of binaryProperties) {
								const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
								const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);

								attachments.push(
									(await twistApiRequest.call(
										this,
										'POST',
										'/attachments/upload',
										{},
										{},
										{
											formData: {
												file_name: {
													value: dataBuffer,
													options: {
														filename: binaryData.fileName,
													},
												},
												attachment_id: uuid(),
											},
										},
									)) as IDataObject,
								);
							}

							body.attachments = attachments;
						}

						if (body.direct_mentions) {
							const directMentions: string[] = [];
							for (const directMention of body.direct_mentions as number[]) {
								directMentions.push(`[name](twist-mention://${directMention})`);
							}
							body.content = `${directMentions.join(' ')} ${body.content}`;
						}

						responseData = await twistApiRequest.call(this, 'POST', '/comments/add', body);
					}
					//https://developer.twist.com/v3/#remove-comment
					if (operation === 'delete') {
						qs.id = this.getNodeParameter('commentId', i) as string;

						responseData = await twistApiRequest.call(this, 'POST', '/comments/remove', {}, qs);
					}
					//https://developer.twist.com/v3/#get-comment
					if (operation === 'get') {
						qs.id = this.getNodeParameter('commentId', i) as string;

						responseData = await twistApiRequest.call(this, 'GET', '/comments/getone', {}, qs);
						responseData = responseData?.comment;
					}
					//https://developer.twist.com/v3/#get-all-comments
					if (operation === 'getAll') {
						const threadId = this.getNodeParameter('threadId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						qs.thread_id = threadId;

						Object.assign(qs, filters);
						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', i);
						}
						if (qs.older_than_ts) {
							qs.older_than_ts = moment(qs.older_than_ts as string).unix();
						}
						if (qs.newer_than_ts) {
							qs.newer_than_ts = moment(qs.newer_than_ts as string).unix();
						}

						responseData = await twistApiRequest.call(this, 'GET', '/comments/get', {}, qs);
						if (qs.as_ids) {
							responseData = (responseData as number[]).map((id) => ({ ID: id }));
						}
					}
					//https://developer.twist.com/v3/#update-comment
					if (operation === 'update') {
						const commentId = this.getNodeParameter('commentId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {
							id: commentId,
						};
						Object.assign(body, updateFields);

						if (body.actionsUi) {
							const actions = (body.actionsUi as IDataObject).actionValues as IDataObject[];

							if (actions) {
								body.actions = actions;
								delete body.actionsUi;
							}
						}

						if (body.binaryProperties) {
							const binaryProperties = (body.binaryProperties as string).split(',');

							const attachments: IDataObject[] = [];

							for (const binaryProperty of binaryProperties) {
								const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
								const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);

								attachments.push(
									(await twistApiRequest.call(
										this,
										'POST',
										'/attachments/upload',
										{},
										{},
										{
											formData: {
												file_name: {
													value: dataBuffer,
													options: {
														filename: binaryData.fileName,
													},
												},
												attachment_id: uuid(),
											},
										},
									)) as IDataObject,
								);
							}

							body.attachments = attachments;
						}

						if (body.direct_mentions) {
							const directMentions: string[] = [];
							for (const directMention of body.direct_mentions as number[]) {
								directMentions.push(`[name](twist-mention://${directMention})`);
							}
							body.content = `${directMentions.join(' ')} ${body.content}`;
						}

						responseData = await twistApiRequest.call(this, 'POST', '/comments/update', body);
					}
				}
				if (resource === 'messageConversation') {
					//https://developer.twist.com/v3/#add-message-to-conversation
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
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
							const binaryProperties = (body.binaryProperties as string).split(',');

							const attachments: IDataObject[] = [];

							for (const binaryProperty of binaryProperties) {
								const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
								const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);

								attachments.push(
									(await twistApiRequest.call(
										this,
										'POST',
										'/attachments/upload',
										{},
										{},
										{
											formData: {
												file_name: {
													value: dataBuffer,
													options: {
														filename: binaryData.fileName,
													},
												},
												attachment_id: uuid(),
											},
										},
									)) as IDataObject,
								);
							}

							body.attachments = attachments;
						}

						if (body.direct_mentions) {
							const directMentions: string[] = [];
							for (const directMention of body.direct_mentions as number[]) {
								directMentions.push(`[name](twist-mention://${directMention})`);
							}
							body.content = `${directMentions.join(' ')} ${body.content}`;
						}

						// if (body.direct_group_mentions) {
						// 	const directGroupMentions: string[] = [];
						// 	for (const directGroupMention of body.direct_group_mentions as number[]) {
						// 		directGroupMentions.push(`[Group name](twist-group-mention://${directGroupMention})`);
						// 	}
						// 	body.content = `${directGroupMentions.join(' ')} ${body.content}`;
						// }

						responseData = await twistApiRequest.call(
							this,
							'POST',
							'/conversation_messages/add',
							body,
						);
					}
					//https://developer.twist.com/v3/#get-message
					if (operation === 'get') {
						qs.id = this.getNodeParameter('id', i) as string;

						responseData = await twistApiRequest.call(
							this,
							'GET',
							'/conversation_messages/getone',
							{},
							qs,
						);
					}
					//https://developer.twist.com/v3/#get-all-messages
					if (operation === 'getAll') {
						const conversationId = this.getNodeParameter('conversationId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						qs.conversation_id = conversationId;
						Object.assign(qs, additionalFields);

						responseData = await twistApiRequest.call(
							this,
							'GET',
							'/conversation_messages/get',
							{},
							qs,
						);
					}
					//https://developer.twist.com/v3/#remove-message-from-conversation
					if (operation === 'delete') {
						qs.id = this.getNodeParameter('id', i) as string;

						responseData = await twistApiRequest.call(
							this,
							'POST',
							'/conversation_messages/remove',
							{},
							qs,
						);
					}
					//https://developer.twist.com/v3/#update-message-in-conversation
					if (operation === 'update') {
						const id = this.getNodeParameter('id', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {
							id,
						};
						Object.assign(body, updateFields);

						if (body.actionsUi) {
							const actions = (body.actionsUi as IDataObject).actionValues as IDataObject[];

							if (actions) {
								body.actions = actions;
								delete body.actionsUi;
							}
						}

						if (body.binaryProperties) {
							const binaryProperties = (body.binaryProperties as string).split(',');

							const attachments: IDataObject[] = [];

							for (const binaryProperty of binaryProperties) {
								const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
								const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);

								attachments.push(
									(await twistApiRequest.call(
										this,
										'POST',
										'/attachments/upload',
										{},
										{},
										{
											formData: {
												file_name: {
													value: dataBuffer,
													options: {
														filename: binaryData.fileName,
													},
												},
												attachment_id: uuid(),
											},
										},
									)) as IDataObject,
								);
							}

							body.attachments = attachments;
						}

						if (body.direct_mentions) {
							const directMentions: string[] = [];
							for (const directMention of body.direct_mentions as number[]) {
								directMentions.push(`[name](twist-mention://${directMention})`);
							}
							body.content = `${directMentions.join(' ')} ${body.content}`;
						}

						responseData = await twistApiRequest.call(
							this,
							'POST',
							'/conversation_messages/update',
							body,
						);
					}
				}
				if (resource === 'thread') {
					//https://developer.twist.com/v3/#add-thread
					if (operation === 'create') {
						const channelId = this.getNodeParameter('channelId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {
							channel_id: channelId,
							content,
							title,
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
							const binaryProperties = (body.binaryProperties as string).split(',');

							const attachments: IDataObject[] = [];

							for (const binaryProperty of binaryProperties) {
								const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
								const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);

								attachments.push(
									(await twistApiRequest.call(
										this,
										'POST',
										'/attachments/upload',
										{},
										{},
										{
											formData: {
												file_name: {
													value: dataBuffer,
													options: {
														filename: binaryData.fileName,
													},
												},
												attachment_id: uuid(),
											},
										},
									)) as IDataObject,
								);
							}

							body.attachments = attachments;
						}

						if (body.direct_mentions) {
							const directMentions: string[] = [];
							for (const directMention of body.direct_mentions as number[]) {
								directMentions.push(`[name](twist-mention://${directMention})`);
							}
							body.content = `${directMentions.join(' ')} ${body.content}`;
						}

						responseData = await twistApiRequest.call(this, 'POST', '/threads/add', body);
					}
					//https://developer.twist.com/v3/#remove-thread
					if (operation === 'delete') {
						qs.id = this.getNodeParameter('threadId', i) as string;

						responseData = await twistApiRequest.call(this, 'POST', '/threads/remove', {}, qs);
					}
					//https://developer.twist.com/v3/#get-thread
					if (operation === 'get') {
						qs.id = this.getNodeParameter('threadId', i) as string;

						responseData = await twistApiRequest.call(this, 'GET', '/threads/getone', {}, qs);
					}
					//https://developer.twist.com/v3/#get-all-threads
					if (operation === 'getAll') {
						const channelId = this.getNodeParameter('channelId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						qs.channel_id = channelId;

						Object.assign(qs, filters);
						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', i);
						}
						if (qs.older_than_ts) {
							qs.older_than_ts = moment(qs.older_than_ts as string).unix();
						}
						if (qs.newer_than_ts) {
							qs.newer_than_ts = moment(qs.newer_than_ts as string).unix();
						}

						responseData = await twistApiRequest.call(this, 'GET', '/threads/get', {}, qs);
						if (qs.as_ids) {
							responseData = (responseData as number[]).map((id) => ({ ID: id }));
						}
					}
					//https://developer.twist.com/v3/#update-thread
					if (operation === 'update') {
						const threadId = this.getNodeParameter('threadId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {
							id: threadId,
						};
						Object.assign(body, updateFields);

						if (body.actionsUi) {
							const actions = (body.actionsUi as IDataObject).actionValues as IDataObject[];

							if (actions) {
								body.actions = actions;
								delete body.actionsUi;
							}
						}

						if (body.binaryProperties) {
							const binaryProperties = (body.binaryProperties as string).split(',');

							const attachments: IDataObject[] = [];

							for (const binaryProperty of binaryProperties) {
								const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
								const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryProperty);

								attachments.push(
									(await twistApiRequest.call(
										this,
										'POST',
										'/attachments/upload',
										{},
										{},
										{
											formData: {
												file_name: {
													value: dataBuffer,
													options: {
														filename: binaryData.fileName,
													},
												},
												attachment_id: uuid(),
											},
										},
									)) as IDataObject,
								);
							}

							body.attachments = attachments;
						}

						if (body.direct_mentions) {
							const directMentions: string[] = [];
							for (const directMention of body.direct_mentions as number[]) {
								directMentions.push(`[name](twist-mention://${directMention})`);
							}
							body.content = `${directMentions.join(' ')} ${body.content}`;
						}

						responseData = await twistApiRequest.call(this, 'POST', '/threads/update', body);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
