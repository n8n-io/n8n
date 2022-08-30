import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { directMessageFields, directMessageOperations } from './DirectMessageDescription';

import { tweetFields, tweetOperations } from './TweetDescription';

import {
	twitterApiRequest,
	twitterApiRequestAllItems,
	uploadAttachments,
} from './GenericFunctions';

import { ITweet } from './TweetInterface';

const ISO6391 = require('iso-639-1');

export class Twitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twitter',
		name: 'twitter',
		icon: 'file:twitter.svg',
		group: ['input', 'output'],
		version: 1,
		description: 'Consume Twitter API',
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		defaults: {
			name: 'Twitter',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'twitterOAuth1Api',
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
					},
					{
						name: 'Tweet',
						value: 'tweet',
					},
				],
				default: 'tweet',
			},
			// DIRECT MESSAGE
			...directMessageOperations,
			...directMessageFields,
			// TWEET
			...tweetOperations,
			...tweetFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available languages to display them to user so that he can
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
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'directMessage') {
					//https://developer.twitter.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/new-event
					if (operation === 'create') {
						const userId = this.getNodeParameter('userId', i) as string;
						const text = this.getNodeParameter('text', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {
							type: 'message_create',
							message_create: {
								target: {
									recipient_id: userId,
								},
								message_data: {
									text,
									attachment: {},
								},
							},
						};

						if (additionalFields.attachment) {
							const attachment = additionalFields.attachment as string;

							const attachmentProperties: string[] = attachment.split(',').map((propertyName) => {
								return propertyName.trim();
							});

							const medias = await uploadAttachments.call(this, attachmentProperties, items, i);
							//@ts-ignore
							body.message_create.message_data.attachment = {
								type: 'media',
								//@ts-ignore
								media: { id: medias[0].media_id_string },
							};
						} else {
							//@ts-ignore
							delete body.message_create.message_data.attachment;
						}

						responseData = await twitterApiRequest.call(
							this,
							'POST',
							'/direct_messages/events/new.json',
							{ event: body },
						);

						responseData = responseData.event;
					}
				}
				if (resource === 'tweet') {
					// https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/post-statuses-update
					if (operation === 'create') {
						const text = this.getNodeParameter('text', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: ITweet = {
							status: text,
						};

						if (additionalFields.inReplyToStatusId) {
							body.in_reply_to_status_id = additionalFields.inReplyToStatusId as string;
							body.auto_populate_reply_metadata = true;
						}

						if (additionalFields.attachments) {
							const attachments = additionalFields.attachments as string;

							const attachmentProperties: string[] = attachments.split(',').map((propertyName) => {
								return propertyName.trim();
							});

							const medias = await uploadAttachments.call(this, attachmentProperties, items, i);

							body.media_ids = (medias as IDataObject[])
								.map((media: IDataObject) => media.media_id_string)
								.join(',');
						}

						if (additionalFields.possiblySensitive) {
							body.possibly_sensitive = additionalFields.possiblySensitive as boolean;
						}

						if (additionalFields.displayCoordinates) {
							body.display_coordinates = additionalFields.displayCoordinates as boolean;
						}

						if (additionalFields.locationFieldsUi) {
							const locationUi = additionalFields.locationFieldsUi as IDataObject;
							if (locationUi.locationFieldsValues) {
								const values = locationUi.locationFieldsValues as IDataObject;
								body.lat = parseFloat(values.latitude as string);
								body.long = parseFloat(values.longitude as string);
							}
						}

						responseData = await twitterApiRequest.call(
							this,
							'POST',
							'/statuses/update.json',
							{},
							body as unknown as IDataObject,
						);
					}
					// https://developer.twitter.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-destroy-id
					if (operation === 'delete') {
						const tweetId = this.getNodeParameter('tweetId', i) as string;

						responseData = await twitterApiRequest.call(
							this,
							'POST',
							`/statuses/destroy/${tweetId}.json`,
							{},
							{},
						);
					}
					// https://developer.twitter.com/en/docs/tweets/search/api-reference/get-search-tweets
					if (operation === 'search') {
						const q = this.getNodeParameter('searchText', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const qs: IDataObject = {
							q,
						};

						if (additionalFields.includeEntities) {
							qs.include_entities = additionalFields.includeEntities as boolean;
						}

						if (additionalFields.resultType) {
							qs.response_type = additionalFields.resultType as string;
						}

						if (additionalFields.until) {
							qs.until = additionalFields.until as string;
						}

						if (additionalFields.lang) {
							qs.lang = additionalFields.lang as string;
						}

						if (additionalFields.locationFieldsUi) {
							const locationUi = additionalFields.locationFieldsUi as IDataObject;
							if (locationUi.locationFieldsValues) {
								const values = locationUi.locationFieldsValues as IDataObject;
								qs.geocode = `${values.latitude as string},${values.longitude as string},${
									values.distance
								}${values.radius}`;
							}
						}

						qs.tweet_mode = additionalFields.tweetMode || 'compat';

						if (returnAll) {
							responseData = await twitterApiRequestAllItems.call(
								this,
								'statuses',
								'GET',
								'/search/tweets.json',
								{},
								qs,
							);
						} else {
							qs.count = this.getNodeParameter('limit', 0) as number;
							responseData = await twitterApiRequest.call(
								this,
								'GET',
								'/search/tweets.json',
								{},
								qs,
							);
							responseData = responseData.statuses;
						}
					}
					//https://developer.twitter.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-favorites-create
					if (operation === 'like') {
						const tweetId = this.getNodeParameter('tweetId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const qs: IDataObject = {
							id: tweetId,
						};

						if (additionalFields.includeEntities) {
							qs.include_entities = additionalFields.includeEntities as boolean;
						}

						responseData = await twitterApiRequest.call(
							this,
							'POST',
							'/favorites/create.json',
							{},
							qs,
						);
					}
					//https://developer.twitter.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-retweet-id
					if (operation === 'retweet') {
						const tweetId = this.getNodeParameter('tweetId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const qs: IDataObject = {
							id: tweetId,
						};

						if (additionalFields.trimUser) {
							qs.trim_user = additionalFields.trimUser as boolean;
						}

						responseData = await twitterApiRequest.call(
							this,
							'POST',
							`/statuses/retweet/${tweetId}.json`,
							{},
							qs,
						);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
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
