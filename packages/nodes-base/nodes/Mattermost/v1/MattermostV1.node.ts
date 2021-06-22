import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
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

import { description } from './description';
import { methods } from './methods';


export class MattermostV1 implements INodeType {
	
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...description,
		};
	}

	methods = methods;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = this.getCredentials('mattermostApi');

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
