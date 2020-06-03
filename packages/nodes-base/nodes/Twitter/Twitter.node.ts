
import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	tweetFields,
	tweetOperations,
} from './TweetDescription';

import {
	twitterApiRequest,
} from './GenericFunctions';

import {
	ITweet,
} from './TweetInterface';

import {
	snakeCase,
} from 'change-case';

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

					if (additionalFields.attachmentsUi) {
						const mediaIds = [];
						const attachmentsUi = additionalFields.attachmentsUi as IDataObject;
						const uploadUri = 'https://upload.twitter.com/1.1/media/upload.json';

						if (attachmentsUi.attachment) {
							const attachtments = attachmentsUi.attachment as IDataObject[];
							for (const attachment of attachtments) {

								const binaryData = items[i].binary as IBinaryKeyData;
								const binaryPropertyName = attachment.binaryPropertyName as string;

								if (binaryData === undefined) {
									throw new Error('No binary data set. So file can not be written!');
								}

								if (!binaryData[binaryPropertyName]) {
									continue;
								}

								const attachmentBody = {
									media_data: binaryData[binaryPropertyName].data,
									media_category: snakeCase(attachment.category as string).toUpperCase(),
								};
								const response = await twitterApiRequest.call(this, 'POST', '', attachmentBody, {}, uploadUri);
								mediaIds.push(response.media_id_string);
							}
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
