import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeParameterResourceLocator,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

import { directMessageOperations, directMessageFields } from './DirectMessageDescription';
import { listOperations, listFields } from './ListDescription';
import { tweetFields, tweetOperations } from './TweetDescription';
import { userOperations, userFields } from './UserDescription';

import ISO6391 from 'iso-639-1';
import { returnId, twitterApiRequest } from './GenericFunctions';
import { DateTime } from 'luxon';

export class TwitterV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDecription: INodeTypeBaseDescription) {
		this.description = {
			...baseDecription,
			version: 2,
			description:
				'Post, like, and search tweets, send messages, search users, and add users to lists',
			subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
			defaults: {
				name: 'Twitter',
			},
			inputs: ['main'],
			outputs: ['main'],
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
							description: 'Create, like, search, or delete a Tweet',
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
						const limit = this.getNodeParameter('limit', i, 0, {});
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
							qs.end_time = endTime;
						}
						if (limit) {
							qs.max_results = limit;
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
						responseData = await twitterApiRequest.call(
							this,
							'GET',
							'/tweets/search/recent',
							{},
							qs,
						);
					}
					if (operation === 'create') {
						const text = this.getNodeParameter('text', i, '', {});
						const { location, media, inQuoteToStatusId, inReplyToStatusId } = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as {
							location: IDataObject;
							media: string;
							inQuoteToStatusId: INodeParameterResourceLocator;
							inReplyToStatusId: INodeParameterResourceLocator;
						};
						const body: IDataObject = {
							text,
						};
						if (location) {
						}
						if (media) {
						}
						if (inQuoteToStatusId) {
						}
						if (inReplyToStatusId) {
							const inReplyToStatusIdValue = {
								reply: { in_reply_to_tweet_id: '' },
							};
							if (inReplyToStatusId.mode === 'id') {
								inReplyToStatusIdValue.reply.in_reply_to_tweet_id =
									inReplyToStatusId.value as string;
							} else if (inReplyToStatusId.mode === 'url') {
							}
							body.reply = { ...inReplyToStatusIdValue.reply };
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
							data: { id: string };
						};
						responseData = await twitterApiRequest.call(
							this,
							'POST',
							`/users/${user.data.id}/liked_tweets`,
							body,
						);
					}
					if (operation === 'retweet') {
						const { trimUser } = this.getNodeParameter('additionalFields', i, '', {}) as {
							trimUser: boolean;
						};
						const tweetRLC = this.getNodeParameter(
							'tweetId',
							i,
							'',
							{},
						) as INodeParameterResourceLocator;
						const tweetId = returnId(tweetRLC);
						const body: IDataObject = {
							tweet_id: tweetId,
							trim_user: trimUser,
						};
						const user = (await twitterApiRequest.call(this, 'GET', '/users/me', {})) as {
							data: { id: string };
						};
						responseData = await twitterApiRequest.call(
							this,
							'POST',
							`/users/${user.data.id}/retweets`,
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

		return this.prepareOutputData(returnData);
	}
}
