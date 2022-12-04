import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { linkedInApiRequest } from './GenericFunctions';
import { postFields, postOperations } from './PostDescription';

export class LinkedIn implements INodeType {
	// eslint-disable-next-line n8n-nodes-base/node-class-description-missing-subtitle
	description: INodeTypeDescription = {
		displayName: 'LinkedIn',
		name: 'linkedIn',
		icon: 'file:linkedin.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume LinkedIn API',
		defaults: {
			name: 'LinkedIn',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Post',
						value: 'post',
					},
				],
				default: 'post',
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
				returnData.push({
					name: `${person.localizedFirstName} ${person.localizedLastName}`,
					value: person.id,
				});
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let body: any = {};

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'post') {
					if (operation === 'create') {
						const text = this.getNodeParameter('text', i) as string;
						const shareMediaCategory = this.getNodeParameter('shareMediaCategory', i) as string;
						const postAs = this.getNodeParameter('postAs', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						let authorUrn = '';
						let visibility = 'PUBLIC';

						if (postAs === 'person') {
							const personUrn = this.getNodeParameter('person', i) as string;
							// Only if posting as a person can user decide if post visible by public or connections
							visibility = (additionalFields.visibility as string) || 'PUBLIC';
							authorUrn = `urn:li:person:${personUrn}`;
						} else {
							const organizationUrn = this.getNodeParameter('organization', i) as string;
							authorUrn = `urn:li:organization:${organizationUrn}`;
						}

						let description = '';
						let title = '';
						let originalUrl = '';

						if (shareMediaCategory === 'IMAGE') {
							if (additionalFields.description) {
								description = additionalFields.description as string;
							}
							if (additionalFields.title) {
								title = additionalFields.title as string;
							}
							// Send a REQUEST to prepare a register of a media image file
							const registerRequest = {
								registerUploadRequest: {
									recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
									owner: authorUrn,
									serviceRelationships: [
										{
											relationshipType: 'OWNER',
											identifier: 'urn:li:userGeneratedContent',
										},
									],
								},
							};

							const registerObject = await linkedInApiRequest.call(
								this,
								'POST',
								'/assets?action=registerUpload',
								registerRequest,
							);

							// Response provides a specific upload URL that is used to upload the binary image file
							const uploadUrl = registerObject.value.uploadMechanism[
								'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
							].uploadUrl as string;
							const asset = registerObject.value.asset as string;

							// Prepare binary file upload
							const item = items[i];

							if (item.binary === undefined) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
									itemIndex: i,
								});
							}

							const propertyNameUpload = this.getNodeParameter('binaryPropertyName', i) as string;

							if (item.binary[propertyNameUpload] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No binary data property "${propertyNameUpload}" does not exists on item!`,
									{ itemIndex: i },
								);
							}

							// Buffer binary data
							const buffer = await this.helpers.getBinaryDataBuffer(i, propertyNameUpload);
							// Upload image
							await linkedInApiRequest.call(this, 'POST', uploadUrl, buffer, true);

							body = {
								author: authorUrn,
								lifecycleState: 'PUBLISHED',
								specificContent: {
									'com.linkedin.ugc.ShareContent': {
										shareCommentary: {
											text,
										},
										shareMediaCategory: 'IMAGE',
										media: [
											{
												status: 'READY',
												description: {
													text: description,
												},
												media: asset,
												title: {
													text: title,
												},
											},
										],
									},
								},
								visibility: {
									'com.linkedin.ugc.MemberNetworkVisibility': visibility,
								},
							};
						} else if (shareMediaCategory === 'ARTICLE') {
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
								author: `${authorUrn}`,
								lifecycleState: 'PUBLISHED',
								specificContent: {
									'com.linkedin.ugc.ShareContent': {
										shareCommentary: {
											text,
										},
										shareMediaCategory,
										media: [
											{
												status: 'READY',
												description: {
													text: description,
												},
												originalUrl,
												title: {
													text: title,
												},
											},
										],
									},
								},
								visibility: {
									'com.linkedin.ugc.MemberNetworkVisibility': visibility,
								},
							};

							if (description === '') {
								delete body.specificContent['com.linkedin.ugc.ShareContent'].media[0].description;
							}

							if (title === '') {
								delete body.specificContent['com.linkedin.ugc.ShareContent'].media[0].title;
							}
						} else {
							body = {
								author: authorUrn,
								lifecycleState: 'PUBLISHED',
								specificContent: {
									'com.linkedin.ugc.ShareContent': {
										shareCommentary: {
											text,
										},
										shareMediaCategory,
									},
								},
								visibility: {
									'com.linkedin.ugc.MemberNetworkVisibility': visibility,
								},
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
