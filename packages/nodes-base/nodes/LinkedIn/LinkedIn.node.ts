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
import { postOperations, postFields } from './PostDescription';

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
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPersonUrn',
				},
				default: '',
				required: true,
				description: 'Person account belongs to',
				displayOptions: {
					show: {
						postAs: [
							'person'
						]
					}
				}
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
				],
				default: 'post',
				description: 'The resource to consume',
			},
			//POST
			...postOperations,
			...postFields,
		],


	};

	methods = {
		loadOptions: {
			// Get Person URN which has to be used with other LinkedIn API Requests
			// https://docs.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin
			async getPersonUrn(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const person = await linkedInApiRequest.call(this, 'GET', '/me', {});
				returnData.push({name: `${person.localizedFirstName} ${person.localizedLastName}`, value: person.id});
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
					const postAs = this.getNodeParameter('postAs', i) as string;

					let authorUrn = '';

					if (postAs === 'person') {
						const personUrn = this.getNodeParameter('person', i) as string;
						authorUrn = `urn:li:person:${personUrn}`;
					} else {
						const organizationUrn = this.getNodeParameter('organizationUrn', i) as string;
						authorUrn = `urn:li:organization:${organizationUrn}`;
					}

					let description = '';
					let title = '';
					let originalUrl = '';



					if (shareMediaCategory === 'IMAGE') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.description) {
							description = additionalFields.description as string;
						}
						if (additionalFields.title) {
							title = additionalFields.title as string;
						}
						// Send a REQUEST to prepare a register of a media image file
						const registerRequest = {
							"registerUploadRequest": {
								"recipes": [
									"urn:li:digitalmediaRecipe:feedshare-image"
								],
								"owner": `${authorUrn}`,
								"serviceRelationships": [
									{
										"relationshipType": "OWNER",
										"identifier": "urn:li:userGeneratedContent"
									}
								]
							}
						};

						try {
							const registerObject = await linkedInApiRequest.call(this, 'POST', '/assets?action=registerUpload', registerRequest);

							// Response provides a specific upload URL that is used to upload the binary image file
							const uploadUrl = registerObject.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl as string;
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
							await linkedInApiRequest.call(this, 'POST', uploadUrl, buffer, true);

							body = {
								"author": `${authorUrn}`,
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
												"media": `${asset}`,
												"title": {
													"text": title
												}
											}
										]
									}
								},
								"visibility": {
									"com.linkedin.ugc.MemberNetworkVisibility": visibility
								}
							};
						} catch (error) {
							throw new Error(error);
						}

					} else if (shareMediaCategory === 'ARTICLE') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.description) {
							description = additionalFields.description as string;
						}
						if (additionalFields.title) {
							title = additionalFields.title as string;
						}
						if (additionalFields.originalUrl) {
							originalUrl = additionalFields.originalUrl as string;
						}

						body = {
							"author": `${authorUrn}`,
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
								"com.linkedin.ugc.MemberNetworkVisibility": visibility
							}
						};
					} else {
						body = {
								"author": `${authorUrn}`,
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

					const endpoint = '/ugcPosts';
					responseData = await linkedInApiRequest.call(this, 'POST', endpoint, body);
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
