import ISO6391 from 'iso-639-1';
import { DateTime } from 'luxon';
import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeParameterResourceLocator,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type JsonObject,
} from 'n8n-workflow';

import { directMessageFields, directMessageOperations } from './DirectMessageDescription';
import {
	returnId,
	returnIdFromUsername,
	twitterApiRequest,
	twitterApiRequestAllItems,
} from './GenericFunctions';
import { listFields, listOperations } from './ListDescription';
import { tweetFields, tweetOperations } from './TweetDescription';
import { userFields, userOperations } from './UserDescription';

export class TwitterV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			description:
				'Post, like, and search tweets, send messages, search users, and add users to lists',
			subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
			defaults: {
				name: 'X',
			},
			usableAsTool: true,
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'twitterOAuth2Api',
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
							name: 'Direct Message',
							value: 'directMessage',
							description: 'Send a direct message to a user',
						},
						{
							name: 'List',
							value: 'list',
							description: 'Add a user to a list',
						},
						{
							name: 'Tweet',
							value: 'tweet',
							description: 'Create, like, search, or delete a tweet',
						},
						{
							name: 'User',
							value: 'user',
							description: 'Search users by username',
						},
					],
					default: 'tweet',
				},
				// DIRECT MESSAGE
				...directMessageOperations,
				...directMessageFields,
				// LIST
				...listOperations,
				...listFields,
				// TWEET
				...tweetOperations,
				...tweetFields,
				// USER
				...userOperations,
				...userFields,
			],
		};
	}

	methods = {
		loadOptions: {
			// Get all the available languages to display them to user so that they can
			// select them easily
			async getLanguages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const languages = ISO6391.getAllNames();
				for (const language of languages) {
					const languageName = language;
					const languageId = ISO6391.getCode(language);
					returnData.push({
						name: languageName,
						value: languageId,
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
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'user') {
					if (operation === 'searchUser') {
						const me = this.getNodeParameter('me', i, false) as boolean;
						if (me) {
							responseData = await twitterApiRequest.call(this, 'GET', '/users/me', {});
						} else {
							const userRlc = this.getNodeParameter(
								'user',
								i,
								undefined,
								{},
							) as INodeParameterResourceLocator;
							if (userRlc.mode === 'username') {
								userRlc.value = (userRlc.value as string).includes('@')
									? (userRlc.value as string).replace('@', '')
									: userRlc.value;
								responseData = await twitterApiRequest.call(
									this,
									'GET',
									`/users/by/username/${userRlc.value}`,
									{},
								);
							} else if (userRlc.mode === 'id') {
								responseData = await twitterApiRequest.call(
									this,
									'GET',
									`/users/${userRlc.value}`,
									{},
								);
							}
						}
					}
				}
				if (resource === 'tweet') {
					if (operation === 'search') {
						const searchText = this.getNodeParameter('searchText', i, '', {});
						const returnAll = this.getNodeParameter('returnAll', i);
						const { sortOrder, startTime, endTime, tweetFieldsObject } = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as {
							sortOrder: string;
							startTime: string;
							endTime: string;
							tweetFieldsObject: string[];
						};
						const qs: IDataObject = {
							query: searchText,
						};
						if (endTime) {
							const endTimeISO = DateTime.fromISO(endTime).toISO();
							qs.end_time = endTimeISO;
						}
						if (sortOrder) {
							qs.sort_order = sortOrder;
						}
						if (startTime) {
							const startTimeISO8601 = DateTime.fromISO(startTime).toISO();
							qs.start_time = startTimeISO8601;
						}
						if (tweetFieldsObject) {
							if (tweetFieldsObject.length > 0) {
								qs['tweet.fields'] = tweetFieldsObject.join(',');
							}
						}
						if (returnAll) {
							responseData = await twitterApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/tweets/search/recent',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', i);
							qs.max_results = limit;
							responseData = await twitterApiRequest.call(
								this,
								'GET',
								'/tweets/search/recent',
								{},
								qs,
							);
						}
					}
					if (operation === 'create') {
						const text = this.getNodeParameter('text', i, '', {});
						const { location, attachments, inQuoteToStatusId, inReplyToStatusId } =
							this.getNodeParameter('additionalFields', i, {}) as {
								location: string;
								attachments: string;
								inQuoteToStatusId: INodeParameterResourceLocator;
								inReplyToStatusId: INodeParameterResourceLocator;
							};
						const body: IDataObject = {
							text,
						};
						if (location) {
							body.geo = { place_id: location };
						}
						if (attachments) {
							body.media = { media_ids: [attachments] };
						}
						if (inQuoteToStatusId) {
							body.quote_tweet_id = returnId(inQuoteToStatusId);
						}
						if (inReplyToStatusId) {
							const inReplyToStatusIdValue = { in_reply_to_tweet_id: returnId(inReplyToStatusId) };
							body.reply = inReplyToStatusIdValue;
						}
						responseData = await twitterApiRequest.call(this, 'POST', '/tweets', body);
					}
					if (operation === 'delete') {
						const tweetRLC = this.getNodeParameter(
							'tweetDeleteId',
							i,
							'',
							{},
						) as INodeParameterResourceLocator;
						const tweetId = returnId(tweetRLC);
						responseData = await twitterApiRequest.call(this, 'DELETE', `/tweets/${tweetId}`, {});
					}
					if (operation === 'like') {
						const tweetRLC = this.getNodeParameter(
							'tweetId',
							i,
							'',
							{},
						) as INodeParameterResourceLocator;
						const tweetId = returnId(tweetRLC);
						const body: IDataObject = {
							tweet_id: tweetId,
						};
						const user = (await twitterApiRequest.call(this, 'GET', '/users/me', {})) as {
							id: string;
						};
						responseData = await twitterApiRequest.call(
							this,
							'POST',
							`/users/${user.id}/likes`,
							body,
						);
					}
					if (operation === 'retweet') {
						const tweetRLC = this.getNodeParameter(
							'tweetId',
							i,
							'',
							{},
						) as INodeParameterResourceLocator;
						const tweetId = returnId(tweetRLC);
						const body: IDataObject = {
							tweet_id: tweetId,
						};
						const user = (await twitterApiRequest.call(this, 'GET', '/users/me', {})) as {
							id: string;
						};
						responseData = await twitterApiRequest.call(
							this,
							'POST',
							`/users/${user.id}/retweets`,
							body,
						);
					}
				}
				if (resource === 'list') {
					if (operation === 'add') {
						const userRlc = this.getNodeParameter(
							'user',
							i,
							'',
							{},
						) as INodeParameterResourceLocator;
						const userId =
							userRlc.mode !== 'username'
								? returnId(userRlc)
								: await returnIdFromUsername.call(this, userRlc);
						const listRlc = this.getNodeParameter(
							'list',
							i,
							'',
							{},
						) as INodeParameterResourceLocator;
						const listId = returnId(listRlc);
						responseData = await twitterApiRequest.call(this, 'POST', `/lists/${listId}/members`, {
							user_id: userId,
						});
					}
				}
				if (resource === 'directMessage') {
					if (operation === 'create') {
						const userRlc = this.getNodeParameter(
							'user',
							i,
							'',
							{},
						) as INodeParameterResourceLocator;
						const user = await returnIdFromUsername.call(this, userRlc);
						const text = this.getNodeParameter('text', i, '', {});
						const { attachments } = this.getNodeParameter('additionalFields', i, {}, {}) as {
							attachments: number;
						};
						const body: IDataObject = {
							text,
						};

						if (attachments) {
							body.attachments = [{ media_id: attachments }];
						}

						responseData = await twitterApiRequest.call(
							this,
							'POST',
							`/dm_conversations/with/${user}/messages`,
							body,
						);
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = {
						json: {
							error: (error as JsonObject).message,
						},
					};
					returnData.push(executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
