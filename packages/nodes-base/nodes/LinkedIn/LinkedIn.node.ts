import { IExecuteFunctions, BINARY_ENCODING } from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { linkedInApiRequest } from './GenericFunctions';

export class LinkedIn implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LinkedIn',
		name: 'linkedin',
		icon: 'file:linkedin.png',
		group: ['input'],
		version: 1,
		description: 'Consume LinkedIn Api',
		defaults: {
			name: 'linkedin',
			color: '#0075b4',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'linkedInOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Person',
				name: 'person',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getPersonUrn',
				},
				default: [],
				required: true,
				description: 'Person account belongs to.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Post',
						value: 'post',
					},
					{
						name: 'Media',
						value: 'media',
					},
				],
				default: 'post',
				description: 'The resource to consume.',
			},
		],
		
		
	};
	
	methods = {
		loadOptions: {
			// Get Person URN which has to be used with other LinkedIn API Requests
			// https://docs.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin
			async getPersonUrn(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const events = await linkedInApiRequest.call(this, 'GET', '/me', {});
				for (const event of events) {
					const eventName = `${event.firstName} ${event.lastName}`;
					const eventId = event.ID;
					returnData.push({
						name: eventName,
						value: eventId,
					});
				}
				return returnData;
			},
		}
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		let body = {};

		for (let i = 0; i < items.length; i++) {

			if (resource === 'post') {
				if (operation === 'create') {
					const visibility = this.getNodeParameter('visibility', i) as string;
					const shareCommentary = this.getNodeParameter('shareCommentary', i) as string;
					const shareMediaCategory = this.getNodeParameter('shareMediaCategory', i) as string;
					const personUrn = this.getNodeParameter('person', i) as string;

					if (shareMediaCategory === 'IMAGE') {
						const description = this.getNodeParameter('description', i) as string;
						const originalUrl = this.getNodeParameter('originalUrl', i) as string;
						const title = this.getNodeParameter('title', i) as string;

						const item = items[i];

						if (item.data === undefined) {
							throw new Error('No binary data exists on item!');
						}

						body = {
							"author": `urn:li:person:${personUrn}`,
							"lifecycleState": "PUBLISHED",
							"specificContent": {
								"com.linkedin.ugc.ShareContent": {
									"shareCommentary": {
										"text": shareCommentary
									},
									"shareMediaCategory": "IMAGE",
									"media": [
										{
											"status": "READY",
											"description": {
												"text": description
											},
											"media": `urn:li:digitalmediaAsset:${item.data}`,
											"title": {
												"text": title
											}
										}
									]
								}
							},
							"visibility": {
								"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
							}
						};
					} else if (shareMediaCategory === 'ARTICLE') {
						const description = this.getNodeParameter('description', i) as string;
						const originalUrl = this.getNodeParameter('originalUrl', i) as string;
						const title = this.getNodeParameter('title', i) as string;

						body = {
							"author": `urn:li:person:${personUrn}`,
							"lifecycleState": "PUBLISHED",
							"specificContent": {
								"com.linkedin.ugc.ShareContent": {
									"shareCommentary": {
										"text": shareCommentary
									},
									"shareMediaCategory": shareMediaCategory,
									"media": [
										{
											"status": "READY",
											"description": {
												"text": description
											},
											"originalUrl": originalUrl,
											"title": {
												"text": title
											}
										}
									]
								}
							},
							"visibility": {
								"com.linkedin.ugc.MemberNetworkVisibility": "CONNECTIONS"
							}
						};
					} else {
						body = {
								"author": `urn:li:person:${personUrn}`,
								"lifecycleState": "PUBLISHED",
								"specificContent": {
									"com.linkedin.ugc.ShareContent": {
										"shareCommentary": {
											"text": shareCommentary
										},
										"shareMediaCategory": shareMediaCategory
									}
								},
								"visibility": {
									"com.linkedin.ugc.MemberNetworkVisibility": visibility
								}
						};
					}

					const endpoint = 'https://api.linkedin.com/v2/ugcPosts';
					responseData = await linkedInApiRequest.call(this, endpoint, 'POST', JSON.stringify(body));
				}
			}

			if (resource === 'media') {
				if (operation === 'register') {
					// Send a REQUEST to prepare a register of a media image file
					const personUrn = this.getNodeParameter('person', i) as string;
					const registerRequest = {
						"registerUploadRequest": {
							"recipes": [
								"urn:li:digitalmediaRecipe:feedshare-image"
							],
							"owner": personUrn,
							"serviceRelationships": [
								{
									"relationshipType": "OWNER",
									"identifier": "urn:li:userGeneratedContent"
								}
							]
						}
					};

					try {
						const registerObject = JSON.parse(await linkedInApiRequest.call(this, 'https://api.linkedin.com/v2/assets?action=registerUpload', 'POST', {}));

						// Response provides a specific upload URL that is used to upload the binary image file
						const uploadUrl = registerObject.value.uploadMechanismcom.linkedin.digitalmedia.uploading.MediaUploadHttpRequest.uploadUrl as string;
						const asset = registerObject.value.asset as string;
						
						// Prepare binary file upload
						const item = items[i];
	
						if (item.binary === undefined) {
							throw new Error('No binary data exists on item!');
						}
	
						const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;
	
						if (item.binary[propertyNameUpload] === undefined) {
							throw new Error(`No binary data property "${propertyNameUpload}" does not exists on item!`);
						}
	
						// Buffer binary data
						const buffer = Buffer.from(item.binary[propertyNameUpload].data, BINARY_ENCODING) as Buffer;
						// Upload image
						await linkedInApiRequest.call(this, uploadUrl, 'POST', buffer, true);
	
						// Return the asset string which is used to refer to media file when making posts
						responseData = {data: asset};
					} catch (error) {
						throw new Error(error);
					}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
	}
	return [this.helpers.returnJsonArray(returnData)];
	}
}
