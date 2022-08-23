import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeOperationError,
} from 'n8n-workflow';

import { channelFields, channelOperations } from './ChannelDescription';

import { messageFields, messageOperations } from './MessageDescription';

import { starFields, starOperations } from './StarDescription';

import { fileFields, fileOperations } from './FileDescription';

import { reactionFields, reactionOperations } from './ReactionDescription';

import { userGroupFields, userGroupOperations } from './UserGroupDescription';

import { userFields, userOperations } from './UserDescription';

import { userProfileFields, userProfileOperations } from './UserProfileDescription';

import { slackApiRequest, slackApiRequestAllItems, validateJSON } from './GenericFunctions';

import { IAttachment } from './MessageInterface';

import moment from 'moment';

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
		icon: 'file:slack.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Slack API',
		defaults: {
			name: 'Slack',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'slackApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'slackOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
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
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},

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
						name: 'File',
						value: 'file',
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
						name: 'Star',
						value: 'star',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'User Group',
						value: 'userGroup',
					},
					{
						name: 'User Profile',
						value: 'userProfile',
					},
				],
				default: 'message',
			},

			...channelOperations,
			...channelFields,
			...messageOperations,
			...messageFields,
			...starOperations,
			...starFields,
			...fileOperations,
			...fileFields,
			...reactionOperations,
			...reactionFields,
			...userOperations,
			...userFields,
			...userGroupOperations,
			...userGroupFields,
			...userProfileOperations,
			...userProfileFields,
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
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
			// Get all the users to display them to user so that he can
			// select them easily
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = { types: 'public_channel,private_channel', limit: 1000 };
				const channels = await slackApiRequestAllItems.call(
					this,
					'channels',
					'GET',
					'/conversations.list',
					{},
					qs,
				);
				for (const channel of channels) {
					const channelName = channel.name;
					const channelId = channel.id;
					returnData.push({
						name: channelName,
						value: channelId,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
			// Get all the team fields to display them to user so that he can
			// select them easily
			async getTeamFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const {
					profile: { fields },
				} = await slackApiRequest.call(this, 'GET', '/team.profile.get');
				for (const field of fields) {
					const fieldName = field.label;
					const fieldId = field.id;
					returnData.push({
						name: fieldName,
						value: fieldId,
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
		let qs: IDataObject;
		let responseData;
		const authentication = this.getNodeParameter('authentication', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				responseData = {
					error: 'Resource ' + resource + ' / operation ' + operation + ' not found!',
				};
				qs = {};
				if (resource === 'channel') {
					//https://api.slack.com/methods/conversations.archive
					if (operation === 'archive') {
						const channel = this.getNodeParameter('channelId', i) as string;
						const body: IDataObject = {
							channel,
						};
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.archive',
							body,
							qs,
						);
					}
					//https://api.slack.com/methods/conversations.close
					if (operation === 'close') {
						const channel = this.getNodeParameter('channelId', i) as string;
						const body: IDataObject = {
							channel,
						};
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.close',
							body,
							qs,
						);
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
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.create',
							body,
							qs,
						);
						responseData = responseData.channel;
					}
					//https://api.slack.com/methods/conversations.kick
					if (operation === 'kick') {
						const channel = this.getNodeParameter('channelId', i) as string;
						const userId = this.getNodeParameter('userId', i) as string;
						const body: IDataObject = {
							channel,
							user: userId,
						};
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.kick',
							body,
							qs,
						);
					}
					//https://api.slack.com/methods/conversations.join
					if (operation === 'join') {
						const channel = this.getNodeParameter('channelId', i) as string;
						const body: IDataObject = {
							channel,
						};
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.join',
							body,
							qs,
						);
						responseData = responseData.channel;
					}
					//https://api.slack.com/methods/conversations.info
					if (operation === 'get') {
						const channel = this.getNodeParameter('channelId', i) as string;
						qs.channel = channel;
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
							responseData = await slackApiRequestAllItems.call(
								this,
								'channels',
								'GET',
								'/conversations.list',
								{},
								qs,
							);
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
							qs.latest = new Date(filters.latest as string).getTime() / 1000;
						}
						if (filters.oldest) {
							qs.oldest = new Date(filters.oldest as string).getTime() / 1000;
						}
						if (returnAll === true) {
							responseData = await slackApiRequestAllItems.call(
								this,
								'messages',
								'GET',
								'/conversations.history',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await slackApiRequest.call(
								this,
								'GET',
								'/conversations.history',
								{},
								qs,
							);
							responseData = responseData.messages;
						}
					}
					//https://api.slack.com/methods/conversations.invite
					if (operation === 'invite') {
						const channel = this.getNodeParameter('channelId', i) as string;
						const userIds = (this.getNodeParameter('userIds', i) as string[]).join(',');
						const body: IDataObject = {
							channel,
							users: userIds,
						};
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.invite',
							body,
							qs,
						);
						responseData = responseData.channel;
					}
					//https://api.slack.com/methods/conversations.leave
					if (operation === 'leave') {
						const channel = this.getNodeParameter('channelId', i) as string;
						const body: IDataObject = {
							channel,
						};
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.leave',
							body,
							qs,
						);
					}
					//https://api.slack.com/methods/conversations.members
					if (operation === 'member') {
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const resolveData = this.getNodeParameter('resolveData', 0) as boolean;
						qs.channel = this.getNodeParameter('channelId', i) as string;
						if (returnAll) {
							responseData = await slackApiRequestAllItems.call(
								this,
								'members',
								'GET',
								'/conversations.members',
								{},
								qs,
							);
							responseData = responseData.map((member: string) => ({ member }));
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await slackApiRequest.call(
								this,
								'GET',
								'/conversations.members',
								{},
								qs,
							);
							responseData = responseData.members.map((member: string) => ({ member }));
						}

						if (resolveData) {
							const data: IDataObject[] = [];
							for (const { member } of responseData) {
								const { user } = await slackApiRequest.call(
									this,
									'GET',
									'/users.info',
									{},
									{ user: member },
								);
								data.push(user);
							}
							responseData = data;
						}
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
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.open',
							body,
							qs,
						);
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
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.rename',
							body,
							qs,
						);
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
							qs.latest = new Date(filters.latest as string).getTime() / 1000;
						}
						if (filters.oldest) {
							qs.oldest = new Date(filters.oldest as string).getTime() / 1000;
						}
						if (returnAll === true) {
							responseData = await slackApiRequestAllItems.call(
								this,
								'messages',
								'GET',
								'/conversations.replies',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await slackApiRequest.call(
								this,
								'GET',
								'/conversations.replies',
								{},
								qs,
							);
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
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.setPurpose',
							body,
							qs,
						);
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
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.setTopic',
							body,
							qs,
						);
						responseData = responseData.channel;
					}
					//https://api.slack.com/methods/conversations.unarchive
					if (operation === 'unarchive') {
						const channel = this.getNodeParameter('channelId', i) as string;
						const body: IDataObject = {
							channel,
						};
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/conversations.unarchive',
							body,
							qs,
						);
					}
				}
				if (resource === 'message') {
					//https://api.slack.com/methods/chat.postMessage
					if (['post', 'postEphemeral'].includes(operation)) {
						const channel = this.getNodeParameter('channel', i) as string;
						const { sendAsUser } = this.getNodeParameter('otherOptions', i) as IDataObject;
						const text = this.getNodeParameter('text', i) as string;
						const body: IDataObject = {
							channel,
							text,
						};

						let action = 'postMessage';

						if (operation === 'postEphemeral') {
							body.user = this.getNodeParameter('user', i) as string;
							action = 'postEphemeral';
						}

						const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

						if (authentication === 'accessToken' && sendAsUser !== '') {
							body.username = sendAsUser;
						}

						if (!jsonParameters) {
							const attachments = this.getNodeParameter(
								'attachments',
								i,
								[],
							) as unknown as Attachment[];
							const blocksUi = (this.getNodeParameter('blocksUi', i, []) as IDataObject)
								.blocksValues as IDataObject[];

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
							body['attachments'] = attachments;

							if (blocksUi) {
								const blocks: Block[] = [];
								for (const blockUi of blocksUi) {
									const block: Block = {};
									const elements: Element[] = [];
									block.block_id = blockUi.blockId as string;
									block.type = blockUi.type as string;
									if (block.type === 'actions') {
										const elementsUi = (blockUi.elementsUi as IDataObject)
											.elementsValues as IDataObject[];
										if (elementsUi) {
											for (const elementUi of elementsUi) {
												const element: Element = {};
												if (elementUi.actionId === '') {
													throw new NodeOperationError(this.getNode(), 'Action ID must be set', {
														itemIndex: i,
													});
												}
												if (elementUi.text === '') {
													throw new NodeOperationError(this.getNode(), 'Text must be set', {
														itemIndex: i,
													});
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
												const confirmUi = (elementUi.confirmUi as IDataObject)
													.confirmValue as IDataObject;
												if (confirmUi) {
													const confirm: Confirm = {};
													const titleUi = (confirmUi.titleUi as IDataObject)
														.titleValue as IDataObject;
													const textUi = (confirmUi.textUi as IDataObject).textValue as IDataObject;
													const confirmTextUi = (confirmUi.confirmTextUi as IDataObject)
														.confirmValue as IDataObject;
													const denyUi = (confirmUi.denyUi as IDataObject).denyValue as IDataObject;
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
										const textUi = (blockUi.textUi as IDataObject).textValue as IDataObject;
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
											throw new NodeOperationError(
												this.getNode(),
												'Property text must be defined',
												{ itemIndex: i },
											);
										}
										const fieldsUi = (blockUi.fieldsUi as IDataObject)
											.fieldsValues as IDataObject[];
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
										const accessoryUi = (blockUi.accessoryUi as IDataObject)
											.accessoriesValues as IDataObject;
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
												const confirmUi = (accessoryUi.confirmUi as IDataObject)
													.confirmValue as IDataObject;
												if (confirmUi) {
													const confirm: Confirm = {};
													const titleUi = (confirmUi.titleUi as IDataObject)
														.titleValue as IDataObject;
													const textUi = (confirmUi.textUi as IDataObject).textValue as IDataObject;
													const confirmTextUi = (confirmUi.confirmTextUi as IDataObject)
														.confirmValue as IDataObject;
													const denyUi = (confirmUi.denyUi as IDataObject).denyValue as IDataObject;
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
							const attachmentsJson = this.getNodeParameter('attachmentsJson', i, '') as string;
							const blocksJson = this.getNodeParameter('blocksJson', i, []) as string;
							if (attachmentsJson !== '' && validateJSON(attachmentsJson) === undefined) {
								throw new NodeOperationError(this.getNode(), 'Attachments it is not a valid json', {
									itemIndex: i,
								});
							}
							if (blocksJson !== '' && validateJSON(blocksJson) === undefined) {
								throw new NodeOperationError(this.getNode(), 'Blocks it is not a valid json', {
									itemIndex: i,
								});
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
						responseData = await slackApiRequest.call(this, 'POST', `/chat.${action}`, body, qs);
					}
					//https://api.slack.com/methods/chat.update
					if (operation === 'update') {
						const channel = this.getNodeParameter('channelId', i) as string;
						const text = this.getNodeParameter('text', i) as string;
						const ts = this.getNodeParameter('ts', i) as string;
						const attachments = this.getNodeParameter(
							'attachments',
							i,
							[],
						) as unknown as IAttachment[];
						const body: IDataObject = {
							channel,
							text,
							ts,
						};

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
						body['attachments'] = attachments;

						const jsonParameters = this.getNodeParameter('jsonParameters', i, false) as boolean;
						if (jsonParameters) {
							const blocksJson = this.getNodeParameter('blocksJson', i, []) as string;

							if (blocksJson !== '' && validateJSON(blocksJson) === undefined) {
								throw new NodeOperationError(this.getNode(), 'Blocks it is not a valid json', {
									itemIndex: i,
								});
							}
							if (blocksJson !== '') {
								body.blocks = blocksJson;
							}

							const attachmentsJson = this.getNodeParameter('attachmentsJson', i, '') as string;

							if (attachmentsJson !== '' && validateJSON(attachmentsJson) === undefined) {
								throw new NodeOperationError(this.getNode(), 'Attachments it is not a valid json', {
									itemIndex: i,
								});
							}

							if (attachmentsJson !== '') {
								body.attachments = attachmentsJson;
							}
						}

						// Add all the other options to the request
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						Object.assign(body, updateFields);
						responseData = await slackApiRequest.call(this, 'POST', '/chat.update', body, qs);
					}
					//https://api.slack.com/methods/chat.delete
					if (operation === 'delete') {
						const channel = this.getNodeParameter('channelId', i) as string;
						const timestamp = this.getNodeParameter('timestamp', i) as string;
						const body: IDataObject = {
							channel,
							ts: timestamp,
						};
						// Add all the other options to the request
						responseData = await slackApiRequest.call(this, 'POST', '/chat.delete', body, qs);
					}
					//https://api.slack.com/methods/chat.getPermalink
					if (operation === 'getPermalink') {
						const channel = this.getNodeParameter('channelId', i) as string;
						const timestamp = this.getNodeParameter('timestamp', i) as string;
						const qs = {
							channel,
							message_ts: timestamp,
						};
						responseData = await slackApiRequest.call(this, 'GET', '/chat.getPermalink', {}, qs);
					}
				}
				if (resource === 'reaction') {
					const channel = this.getNodeParameter('channelId', i) as string;
					const timestamp = this.getNodeParameter('timestamp', i) as string;
					//https://api.slack.com/methods/reactions.add
					if (operation === 'add') {
						const name = this.getNodeParameter('name', i) as string;
						const body: IDataObject = {
							channel,
							name,
							timestamp,
						};
						responseData = await slackApiRequest.call(this, 'POST', '/reactions.add', body, qs);
					}
					//https://api.slack.com/methods/reactions.remove
					if (operation === 'remove') {
						const name = this.getNodeParameter('name', i) as string;
						const body: IDataObject = {
							channel,
							name,
							timestamp,
						};
						responseData = await slackApiRequest.call(this, 'POST', '/reactions.remove', body, qs);
					}
					//https://api.slack.com/methods/reactions.get
					if (operation === 'get') {
						qs.channel = channel;
						qs.timestamp = timestamp;
						responseData = await slackApiRequest.call(this, 'GET', '/reactions.get', {}, qs);
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
							responseData = await slackApiRequestAllItems.call(
								this,
								'items',
								'GET',
								'/stars.list',
								{},
								qs,
							);
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
							if (
								items[i].binary === undefined ||
								//@ts-ignore
								items[i].binary[binaryPropertyName] === undefined
							) {
								throw new NodeOperationError(
									this.getNode(),
									`No binary data property "${binaryPropertyName}" does not exists on item!`,
									{ itemIndex: i },
								);
							}
							const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
								i,
								binaryPropertyName,
							);
							body.file = {
								//@ts-ignore
								value: binaryDataBuffer,
								options: {
									//@ts-ignore
									filename: items[i].binary[binaryPropertyName].fileName,
									//@ts-ignore
									contentType: items[i].binary[binaryPropertyName].mimeType,
								},
							};
							responseData = await slackApiRequest.call(
								this,
								'POST',
								'/files.upload',
								{},
								qs,
								{ 'Content-Type': 'multipart/form-data' },
								{ formData: body },
							);
							responseData = responseData.file;
						} else {
							const fileContent = this.getNodeParameter('fileContent', i) as string;
							body.content = fileContent;
							responseData = await slackApiRequest.call(
								this,
								'POST',
								'/files.upload',
								body,
								qs,
								{ 'Content-Type': 'application/x-www-form-urlencoded' },
								{ form: body },
							);
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
							responseData = await slackApiRequestAllItems.call(
								this,
								'files',
								'GET',
								'/files.list',
								{},
								qs,
							);
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
				if (resource === 'user') {
					//https://api.slack.com/methods/users.info
					if (operation === 'info') {
						qs.user = this.getNodeParameter('user', i) as string;
						responseData = await slackApiRequest.call(this, 'GET', '/users.info', {}, qs);
						responseData = responseData.user;
					}
					//https://api.slack.com/methods/users.getPresence
					if (operation === 'getPresence') {
						qs.user = this.getNodeParameter('user', i) as string;
						responseData = await slackApiRequest.call(this, 'GET', '/users.getPresence', {}, qs);
					}
				}
				if (resource === 'userGroup') {
					//https://api.slack.com/methods/usergroups.create
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							name,
						};

						Object.assign(body, additionalFields);

						responseData = await slackApiRequest.call(this, 'POST', '/usergroups.create', body, qs);

						responseData = responseData.usergroup;
					}
					//https://api.slack.com/methods/usergroups.enable
					if (operation === 'enable') {
						const userGroupId = this.getNodeParameter('userGroupId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							usergroup: userGroupId,
						};

						Object.assign(body, additionalFields);

						responseData = await slackApiRequest.call(this, 'POST', '/usergroups.enable', body, qs);

						responseData = responseData.usergroup;
					}
					//https://api.slack.com/methods/usergroups.disable
					if (operation === 'disable') {
						const userGroupId = this.getNodeParameter('userGroupId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							usergroup: userGroupId,
						};

						Object.assign(body, additionalFields);

						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/usergroups.disable',
							body,
							qs,
						);

						responseData = responseData.usergroup;
					}

					//https://api.slack.com/methods/usergroups.list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const qs: IDataObject = {};

						Object.assign(qs, additionalFields);

						responseData = await slackApiRequest.call(this, 'GET', '/usergroups.list', {}, qs);

						responseData = responseData.usergroups;

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;

							responseData = responseData.slice(0, limit);
						}
					}

					//https://api.slack.com/methods/usergroups.update
					if (operation === 'update') {
						const userGroupId = this.getNodeParameter('userGroupId', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {
							usergroup: userGroupId,
						};

						Object.assign(body, updateFields);

						responseData = await slackApiRequest.call(this, 'POST', '/usergroups.update', body, qs);

						responseData = responseData.usergroup;
					}
				}
				if (resource === 'userProfile') {
					//https://api.slack.com/methods/users.profile.set
					if (operation === 'update') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const timezone = this.getTimezone();

						const body: IDataObject = {};

						Object.assign(body, additionalFields);

						if (body.status_expiration === undefined) {
							body.status_expiration = 0;
						} else {
							body.status_expiration = moment.tz(body.status_expiration as string, timezone).unix();
						}

						if (body.customFieldUi) {
							const customFields = (body.customFieldUi as IDataObject)
								.customFieldValues as IDataObject[];

							body.fields = {};

							for (const customField of customFields) {
								//@ts-ignore
								body.fields[customField.id] = {
									value: customField.value,
									alt: customField.alt,
								};
							}
						}

						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/users.profile.set',
							{ profile: body },
							qs,
						);

						responseData = responseData.profile;
					}
					//https://api.slack.com/methods/users.profile.get
					if (operation === 'get') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const qs: IDataObject = {};

						Object.assign(qs, additionalFields);

						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/users.profile.get',
							undefined,
							qs,
						);

						responseData = responseData.profile;
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
