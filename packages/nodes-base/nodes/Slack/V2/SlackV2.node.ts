import type { Readable } from 'stream';

import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeParameterResourceLocator,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';

import { channelFields, channelOperations } from './ChannelDescription';
import { messageFields, messageOperations } from './MessageDescription';
import { starFields, starOperations } from './StarDescription';
import { fileFields, fileOperations } from './FileDescription';
import { reactionFields, reactionOperations } from './ReactionDescription';
import { userGroupFields, userGroupOperations } from './UserGroupDescription';
import { userFields, userOperations } from './UserDescription';
import { slackApiRequest, slackApiRequestAllItems, validateJSON } from './GenericFunctions';

import moment from 'moment';

export class SlackV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
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
			],
		};
	}

	methods = {
		listSearch: {
			async getChannels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const qs = { types: 'public_channel,private_channel', limit: 1000 };
				const channels = (await slackApiRequestAllItems.call(
					this,
					'channels',
					'GET',
					'/conversations.list',
					{},
					qs,
				)) as Array<{ id: string; name: string }>;
				const results: INodeListSearchItems[] = channels
					.map((c) => ({
						name: c.name,
						value: c.id,
					}))
					.filter(
						(c) =>
							!filter ||
							c.name.toLowerCase().includes(filter.toLowerCase()) ||
							c.value?.toString() === filter,
					)
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});
				return { results };
			},
			async getUsers(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				const users = (await slackApiRequestAllItems.call(
					this,
					'members',
					'GET',
					'/users.list',
				)) as Array<{ id: string; name: string }>;
				const results: INodeListSearchItems[] = users
					.map((c) => ({
						name: c.name,
						value: c.id,
					}))
					.filter(
						(c) =>
							!filter ||
							c.name.toLowerCase().includes(filter.toLowerCase()) ||
							c.value?.toString() === filter,
					)
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});
				return { results };
			},
		},
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
			// Get all the users to display them to user so that he can
			// select them easily
			async getChannelsName(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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
					returnData.push({
						name: channelName,
						value: channelName,
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
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let qs: IDataObject;
		let responseData;
		const authentication = this.getNodeParameter('authentication', 0) as string;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				responseData = {
					error: 'Resource ' + resource + ' / operation ' + operation + ' not found!',
				};
				qs = {};
				if (resource === 'channel') {
					//https://api.slack.com/methods/conversations.archive
					if (operation === 'archive') {
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
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
						let channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
						channel = channel[0] === '#' ? channel.slice(1) : channel;
						const channelVisibility = this.getNodeParameter('channelVisibility', i) as string;
						const body: IDataObject = {
							name: channel,
							is_private: channelVisibility === 'private' ? true : false,
						};
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
						qs.channel = channel;
						responseData = await slackApiRequest.call(this, 'POST', '/conversations.info', {}, qs);
						responseData = responseData.channel;
					}
					//https://api.slack.com/methods/conversations.list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						if (filters.types) {
							qs.types = (filters.types as string[]).join(',');
						}
						if (filters.excludeArchived) {
							qs.exclude_archived = filters.excludeArchived as boolean;
						}
						if (returnAll) {
							responseData = await slackApiRequestAllItems.call(
								this,
								'channels',
								'GET',
								'/conversations.list',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await slackApiRequest.call(this, 'GET', '/conversations.list', {}, qs);
							responseData = responseData.channels;
						}
					}
					//https://api.slack.com/methods/conversations.history
					if (operation === 'history') {
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
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
						if (returnAll) {
							responseData = await slackApiRequestAllItems.call(
								this,
								'messages',
								'GET',
								'/conversations.history',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
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
						const returnAll = this.getNodeParameter('returnAll', 0);
						const resolveData = this.getNodeParameter('resolveData', 0);
						qs.channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
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
							qs.limit = this.getNodeParameter('limit', i);
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
								data.push(user as IDataObject);
							}
							responseData = data;
						}
					}
					//https://api.slack.com/methods/conversations.open
					if (operation === 'open') {
						const options = this.getNodeParameter('options', i);
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as IDataObject;
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
						const ts = this.getNodeParameter('ts', i)?.toString() as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
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
						if (returnAll) {
							responseData = await slackApiRequestAllItems.call(
								this,
								'messages',
								'GET',
								'/conversations.replies',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as IDataObject;
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as IDataObject;
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
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
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
					if (operation === 'post') {
						const select = this.getNodeParameter('select', i) as string;
						const messageType = this.getNodeParameter('messageType', i) as string;
						let target =
							select === 'channel'
								? (this.getNodeParameter('channelId', i, undefined, {
										extractValue: true,
								  }) as string)
								: (this.getNodeParameter('user', i, undefined, {
										extractValue: true,
								  }) as string);
						// @ts-ignore
						if (select === 'user' && this.getNodeParameter('user', i).mode === 'username') {
							target = target.slice(0, 1) === '@' ? target : `@${target}`;
						}
						const { sendAsUser } = this.getNodeParameter('otherOptions', i) as IDataObject;
						let content: IDataObject = {};
						switch (messageType) {
							case 'text':
								content = { text: this.getNodeParameter('text', i) as string };
								break;
							case 'block':
								content = JSON.parse(this.getNodeParameter('blocksUi', i) as string);
								break;
							case 'attachment':
								content = { attachments: this.getNodeParameter('attachments', i) } as IDataObject;
								break;
							default:
								throw new NodeOperationError(
									this.getNode(),
									`The message type "${messageType}" is not known!`,
								);
						}
						const body: IDataObject = {
							channel: target,
							...content,
						};
						if (authentication === 'accessToken' && sendAsUser !== '' && sendAsUser !== undefined) {
							body.username = sendAsUser;
						}
						// Add all the other options to the request
						const otherOptions = this.getNodeParameter('otherOptions', i) as IDataObject;
						let action = 'postMessage';
						if (otherOptions.ephemeral) {
							const ephemeral = otherOptions.ephemeral as IDataObject;
							if (select === 'channel') {
								const ephemeralValues = ephemeral.ephemeralValues as IDataObject;
								const userRlc = ephemeralValues.user as INodeParameterResourceLocator;
								body.user =
									userRlc.value?.toString().slice(0, 1) !== '@' && userRlc.mode === 'username'
										? `@${userRlc.value}`
										: userRlc.value;
								action = 'postEphemeral';
							} else if (select === 'user') {
								body.user = target;
								action = 'postEphemeral';
							}
						}
						//@ts-ignore
						const replyValues = otherOptions.thread_ts?.replyValues as IDataObject;
						Object.assign(body, replyValues);
						delete otherOptions.thread_ts;
						delete otherOptions.ephemeral;
						if (otherOptions.botProfile) {
							const botProfile = otherOptions.botProfile as IDataObject;
							const botProfileValues = botProfile.imageValues as IDataObject;
							Object.assign(
								body,
								botProfileValues.profilePhotoType === 'image'
									? { icon_url: botProfileValues.icon_url }
									: { icon_emoji: botProfileValues.icon_emoji },
							);
						}
						delete otherOptions.botProfile;
						Object.assign(body, otherOptions);
						if (
							select === 'user' &&
							action === 'postEphemeral' &&
							(this.getNodeParameter('user', i) as INodeParameterResourceLocator)?.mode ===
								'username'
						) {
							throw new NodeOperationError(
								this.getNode(),
								'You cannot send ephemeral messages using User type "By username". Please use "From List" or "By ID".',
							);
						} else {
							responseData = await slackApiRequest.call(this, 'POST', `/chat.${action}`, body, qs);
						}
					}
					//https://api.slack.com/methods/chat.update
					if (operation === 'update') {
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
						const text = this.getNodeParameter('text', i) as string;
						const ts = this.getNodeParameter('ts', i)?.toString() as string;
						const body: IDataObject = {
							channel,
							text,
							ts,
						};

						const jsonParameters = this.getNodeParameter('jsonParameters', i, false);
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
						}
						// Add all the other options to the request
						const updateFields = this.getNodeParameter('updateFields', i);
						Object.assign(body, updateFields);
						responseData = await slackApiRequest.call(this, 'POST', '/chat.update', body, qs);
					}
					//https://api.slack.com/methods/chat.delete
					if (operation === 'delete') {
						const select = this.getNodeParameter('select', i) as string;
						let target =
							select === 'channel'
								? (this.getNodeParameter('channelId', i, undefined, {
										extractValue: true,
								  }) as string)
								: (this.getNodeParameter('user', i, undefined, {
										extractValue: true,
								  }) as string);
						// @ts-ignore
						if (select === 'user' && this.getNodeParameter('user', i).mode === 'username') {
							target = target.slice(0, 1) === '@' ? target : `@${target}`;
						}
						const timestamp = this.getNodeParameter('timestamp', i)?.toString() as string;
						const body: IDataObject = {
							channel: target,
							ts: timestamp,
						};
						// Add all the other options to the request
						responseData = await slackApiRequest.call(this, 'POST', '/chat.delete', body, qs);
					}
					//https://api.slack.com/methods/chat.getPermalink
					if (operation === 'getPermalink') {
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
						const timestamp = this.getNodeParameter('timestamp', i)?.toString() as string;
						qs = {
							channel,
							message_ts: timestamp,
						};
						responseData = await slackApiRequest.call(this, 'GET', '/chat.getPermalink', {}, qs);
					}
					//https://api.slack.com/methods/search.messages
					if (operation === 'search') {
						let query = this.getNodeParameter('query', i) as string;
						const sort = this.getNodeParameter('sort', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						if (options.searchChannel) {
							const channel = options.searchChannel as IDataObject[];
							for (const channelItem of channel) {
								query += ` in:${channelItem}`;
							}
						}
						qs = {
							query,
							sort: sort === 'relevance' ? 'score' : 'timestamp',
							sort_dir: sort === 'asc' ? 'asc' : 'desc',
						};
						if (returnAll) {
							responseData = await slackApiRequestAllItems.call(
								this,
								'messages',
								'GET',
								'/search.messages',
								{},
								qs,
							);
						} else {
							qs.count = this.getNodeParameter('limit', i);
							responseData = await slackApiRequest.call(this, 'POST', '/search.messages', {}, qs);
							responseData = responseData.messages.matches;
						}
					}
				}
				if (resource === 'reaction') {
					const channel = this.getNodeParameter(
						'channelId',
						i,
						{},
						{ extractValue: true },
					) as string;
					const timestamp = this.getNodeParameter('timestamp', i)?.toString() as string;
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
						const options = this.getNodeParameter('options', i);
						const target = this.getNodeParameter('target', i) as string;
						const channel = this.getNodeParameter(
							'channelId',
							i,
							{},
							{ extractValue: true },
						) as string;
						const body: IDataObject = {};
						body.channel = channel;

						if (target === 'message') {
							const timestamp = this.getNodeParameter('timestamp', i)?.toString() as string;
							body.timestamp = timestamp;
						}
						if (target === 'file') {
							const file = this.getNodeParameter('fileId', i) as string;
							body.file = file;
						}
						if (options.fileComment) {
							body.file_comment = options.fileComment as string;
						}
						responseData = await slackApiRequest.call(this, 'POST', '/stars.add', body, qs);
					}
					//https://api.slack.com/methods/stars.remove
					if (operation === 'delete') {
						const options = this.getNodeParameter('options', i);
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
						const returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll) {
							responseData = await slackApiRequestAllItems.call(
								this,
								'items',
								'GET',
								'/stars.list',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await slackApiRequest.call(this, 'GET', '/stars.list', {}, qs);
							responseData = responseData.items;
						}
					}
				}
				if (resource === 'file') {
					//https://api.slack.com/methods/files.upload
					if (operation === 'upload') {
						const options = this.getNodeParameter('options', i);
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
						if (this.getNodeParameter('binaryData', i)) {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
							const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

							let uploadData: Buffer | Readable;
							if (binaryData.id) {
								uploadData = this.helpers.getBinaryStream(binaryData.id);
							} else {
								uploadData = Buffer.from(binaryData.data, BINARY_ENCODING);
							}
							body.file = {
								value: uploadData,
								options: {
									filename: binaryData.fileName,
									contentType: binaryData.mimeType,
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
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
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
							qs.types = (filters.types as string[]).join(',');
						}
						if (filters.userId) {
							qs.user = filters.userId as string;
						}
						if (returnAll) {
							responseData = await slackApiRequestAllItems.call(
								this,
								'files',
								'GET',
								'/files.list',
								{},
								qs,
							);
						} else {
							qs.count = this.getNodeParameter('limit', i);
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
						qs.user = this.getNodeParameter('user', i, undefined, { extractValue: true }) as string;
						responseData = await slackApiRequest.call(this, 'GET', '/users.info', {}, qs);
						responseData = responseData.user;
					}
					//https://api.slack.com/methods/users.list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll) {
							responseData = await slackApiRequestAllItems.call(
								this,
								'members',
								'GET',
								'/users.list',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await slackApiRequest.call(this, 'GET', '/users.list', {}, qs);
							responseData = responseData.members;
						}
					}
					//https://api.slack.com/methods/users.getPresence
					if (operation === 'getPresence') {
						qs.user = this.getNodeParameter('user', i, undefined, { extractValue: true }) as string;
						responseData = await slackApiRequest.call(this, 'GET', '/users.getPresence', {}, qs);
					}
					if (operation === 'updateProfile') {
						const options = this.getNodeParameter('options', i);
						const timezone = this.getTimezone();

						const body: IDataObject = {};
						let status;
						if (options.status) {
							// @ts-ignore
							status = options.status?.set_status[0] as IDataObject;
							if (status.status_expiration === undefined) {
								status.status_expiration = 0;
							} else {
								status.status_expiration = moment
									.tz(status.status_expiration as string, timezone)
									.unix();
							}
							Object.assign(body, status);
							delete options.status;
						}

						if (options.customFieldUi) {
							const customFields = (options.customFieldUi as IDataObject)
								.customFieldValues as IDataObject[];

							options.fields = {};

							for (const customField of customFields) {
								//@ts-ignore
								options.fields[customField.id] = {
									value: customField.value,
									alt: customField.alt,
								};
							}
						}
						Object.assign(body, options);
						responseData = await slackApiRequest.call(
							this,
							'POST',
							'/users.profile.set',
							{ profile: body },
							qs,
						);

						responseData = responseData.profile;
					}
				}
				if (resource === 'userGroup') {
					//https://api.slack.com/methods/usergroups.create
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;

						const options = this.getNodeParameter('options', i);

						const body: IDataObject = {
							name,
						};

						Object.assign(body, options);

						responseData = await slackApiRequest.call(this, 'POST', '/usergroups.create', body, qs);

						responseData = responseData.usergroup;
					}
					//https://api.slack.com/methods/usergroups.enable
					if (operation === 'enable') {
						const userGroupId = this.getNodeParameter('userGroupId', i) as string;

						const options = this.getNodeParameter('options', i);

						const body: IDataObject = {
							usergroup: userGroupId,
						};

						Object.assign(body, options);

						responseData = await slackApiRequest.call(this, 'POST', '/usergroups.enable', body, qs);

						responseData = responseData.usergroup;
					}
					//https://api.slack.com/methods/usergroups.disable
					if (operation === 'disable') {
						const userGroupId = this.getNodeParameter('userGroupId', i) as string;

						const options = this.getNodeParameter('options', i);

						const body: IDataObject = {
							usergroup: userGroupId,
						};

						Object.assign(body, options);

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
						const returnAll = this.getNodeParameter('returnAll', i);

						const options = this.getNodeParameter('options', i);

						Object.assign(qs, options);

						responseData = await slackApiRequest.call(this, 'GET', '/usergroups.list', {}, qs);

						responseData = responseData.usergroups;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);

							responseData = responseData.slice(0, limit);
						}
					}

					//https://api.slack.com/methods/usergroups.update
					if (operation === 'update') {
						const userGroupId = this.getNodeParameter('userGroupId', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {
							usergroup: userGroupId,
						};

						Object.assign(body, updateFields);

						responseData = await slackApiRequest.call(this, 'POST', '/usergroups.update', body, qs);

						responseData = responseData.usergroup;
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as JsonObject).message } });
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
