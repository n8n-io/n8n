
import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	BINARY_ENCODING,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	tweetFields,
	tweetOperations,
} from './TweetDescription';

import {
	chunks,
	twitterApiRequest,
	twitterApiRequestAllItems,
} from './GenericFunctions';

import {
	ITweet,
} from './TweetInterface';

const ISO6391 = require('iso-639-1');

export class Twitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twitter ',
		name: 'twitter',
		icon: 'file:twitter.png',
		group: ['input', 'output'],
		version: 1,
		description: 'Consume Twitter API',
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		defaults: {
			name: 'Twitter',
			color: '#1DA1F2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'twitterOAuth1Api',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Tweet',
						value: 'tweet',
					},
				],
				default: 'tweet',
				description: 'The resource to operate on.',
			},
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
		const length = items.length as unknown as number;
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'tweet') {
				// https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/post-statuses-update
				if (operation === 'create') {
					const text = this.getNodeParameter('text', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: ITweet = {
						status: text,
					};

					if (additionalFields.attachments) {
						const mediaIds = [];
						const attachments = additionalFields.attachments as string;
						const uploadUri = 'https://upload.twitter.com/1.1/media/upload.json';

						const attachmentProperties: string[] = attachments.split(',').map((propertyName) => {
							return propertyName.trim();
						});

						for (const binaryPropertyName of attachmentProperties) {

							const binaryData = items[i].binary as IBinaryKeyData;

							if (binaryData === undefined) {
								throw new Error('No binary data set. So file can not be written!');
							}

							if (!binaryData[binaryPropertyName]) {
								continue;
							}

							let attachmentBody = {};
							let response: IDataObject = {};

							const isAnimatedWebp = (Buffer.from(binaryData[binaryPropertyName].data, 'base64').toString().indexOf('ANMF') !== -1);

							const isImage = binaryData[binaryPropertyName].mimeType.includes('image');

							if (isImage && isAnimatedWebp) {
								throw new Error('Animated .webp images are not supported use .gif instead');
							}

							if (isImage) {

								const attachmentBody = {
									media_data: binaryData[binaryPropertyName].data,
								};

								response = await twitterApiRequest.call(this, 'POST', '', attachmentBody, {}, uploadUri);

							} else {

								// https://developer.twitter.com/en/docs/media/upload-media/api-reference/post-media-upload-init

								attachmentBody = {
									command: 'INIT',
									total_bytes: Buffer.from(binaryData[binaryPropertyName].data, BINARY_ENCODING).byteLength,
									media_type: binaryData[binaryPropertyName].mimeType,
								};

								response = await twitterApiRequest.call(this, 'POST', '', attachmentBody, {}, uploadUri);

								const mediaId = response.media_id_string;

								// break the data on 5mb chunks (max size that can be uploaded at once)

								const binaryParts = chunks(Buffer.from(binaryData[binaryPropertyName].data, BINARY_ENCODING), 5242880);

								let index = 0;

								for (const binaryPart of binaryParts) {

									//https://developer.twitter.com/en/docs/media/upload-media/api-reference/post-media-upload-append

									attachmentBody = {
										name: binaryData[binaryPropertyName].fileName,
										command: 'APPEND',
										media_id: mediaId,
										media_data: Buffer.from(binaryPart).toString('base64'),
										segment_index: index,
									};

									response = await twitterApiRequest.call(this, 'POST', '', attachmentBody, {}, uploadUri);

									index++;
								}

								//https://developer.twitter.com/en/docs/media/upload-media/api-reference/post-media-upload-finalize

								attachmentBody = {
									command: 'FINALIZE',
									media_id: mediaId,
								};

								response = await twitterApiRequest.call(this, 'POST', '', attachmentBody, {}, uploadUri);

								// data has not been uploaded yet, so wait for it to be ready
								if (response.processing_info) {
									const { check_after_secs } = (response.processing_info as IDataObject);
									await new Promise((resolve, reject) => {
										setTimeout(() => {
											resolve();
										}, (check_after_secs as number) * 1000);
									});
								}
							}

							mediaIds.push(response.media_id_string);
						}

						body.media_ids = mediaIds.join(',');
					}

					if (additionalFields.possiblySensitive) {
						body.possibly_sensitive = additionalFields.possibly_sensitive as boolean;
					}

					if (additionalFields.locationFieldsUi) {
						const locationUi = additionalFields.locationFieldsUi as IDataObject;
						if (locationUi.locationFieldsValues) {
							const values = locationUi.locationFieldsValues as IDataObject;
							body.lat = parseFloat(values.lalatitude as string);
							body.long = parseFloat(values.lalatitude as string);
						}
					}

					responseData = await twitterApiRequest.call(this, 'POST', '/statuses/update.json', body);
				}
				// https://developer.twitter.com/en/docs/tweets/search/api-reference/get-search-tweets
				if (operation === 'search') {
					const q = this.getNodeParameter('searchText', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const qs: IDataObject = {
						q
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
							qs.geocode = `${values.latitude as string},${values.longitude as string},${values.distance}${values.radius}`;
						}
					}

					if (returnAll) {
						responseData = await twitterApiRequestAllItems.call(this, 'statuses', 'GET', '/search/tweets.json', {}, qs);
					} else {
						qs.count = this.getNodeParameter('limit', 0) as number;
						responseData = await twitterApiRequest.call(this, 'GET', '/search/tweets.json', {}, qs);
						responseData = responseData.statuses;
					}
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else if (responseData !== undefined) {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
