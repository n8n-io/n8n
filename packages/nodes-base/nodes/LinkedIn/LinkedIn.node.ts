import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { linkedInApiRequest } from './GenericFunctions';
import { postFields, postOperations } from './PostDescription';

export class LinkedIn implements INodeType {
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
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'linkedInOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['standard'],
					},
				},
			},
			{
				name: 'linkedInCommunityManagementOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['communityManagement'],
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
						name: 'Standard',
						value: 'standard',
					},
					{
						name: 'Community Management',
						value: 'communityManagement',
					},
				],
				default: 'standard',
			},
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
				const authentication = this.getNodeParameter('authentication', 0);
				let endpoint = '/v2/me';
				if (authentication === 'standard') {
					const { legacy } = await this.getCredentials('linkedInOAuth2Api');
					if (!legacy) {
						endpoint = '/v2/userinfo';
					}
				}
				const person = await linkedInApiRequest.call(this, 'GET', endpoint, {});
				const firstName = person.localizedFirstName ?? person.given_name;
				const lastName = person.localizedLastName ?? person.family_name;
				const name = `${firstName} ${lastName}`;
				const returnData: INodePropertyOptions[] = [
					{
						name,
						value: person.id ?? person.sub,
					},
				];
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let body: any = {};

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'post') {
					if (operation === 'create') {
						let text = this.getNodeParameter('text', i) as string;
						const shareMediaCategory = this.getNodeParameter('shareMediaCategory', i) as string;
						const postAs = this.getNodeParameter('postAs', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						// LinkedIn uses "little text" https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format?view=li-lms-2024-06
						text = text.replace(/[\(*\)\[\]\{\}<>@|~_]/gm, (char) => '\\' + char);

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

						body = {
							author: authorUrn,
							lifecycleState: 'PUBLISHED',
							distribution: {
								feedDistribution: 'MAIN_FEED',
								thirdPartyDistributionChannels: [],
							},
							visibility,
						};

						if (shareMediaCategory === 'IMAGE') {
							if (additionalFields.title) {
								title = additionalFields.title as string;
							}
							// Send a REQUEST to prepare a register of a media image file
							const registerRequest = {
								initializeUploadRequest: {
									owner: authorUrn,
								},
							};

							const registerObject = await linkedInApiRequest.call(
								this,
								'POST',
								'/images?action=initializeUpload',
								registerRequest,
							);

							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
							const imageMetadata = this.helpers.assertBinaryData(i, binaryPropertyName);

							const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
							const { uploadUrl, image } = registerObject.value;

							const headers = {};
							Object.assign(headers, { 'Content-Type': imageMetadata.mimeType });

							await linkedInApiRequest.call(
								this,
								'POST',
								uploadUrl as string,
								buffer,
								true,
								headers,
							);

							const imageBody = {
								content: {
									media: {
										title,
										id: image,
									},
								},
								commentary: text,
							};
							Object.assign(body, imageBody);
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

							const articleBody = {
								content: {
									article: {
										title,
										description,
										source: originalUrl,
									},
								},
								commentary: text,
							};

							if (additionalFields.thumbnailBinaryPropertyName) {
								const registerRequest = {
									initializeUploadRequest: {
										owner: authorUrn,
									},
								};

								const registerObject = await linkedInApiRequest.call(
									this,
									'POST',
									'/images?action=initializeUpload',
									registerRequest,
								);

								const binaryPropertyName = additionalFields.thumbnailBinaryPropertyName as string;
								const imageMetadata = this.helpers.assertBinaryData(i, binaryPropertyName);

								const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
								const { uploadUrl, image } = registerObject.value;

								const headers = {};
								Object.assign(headers, { 'Content-Type': imageMetadata.mimeType });

								await linkedInApiRequest.call(
									this,
									'POST',
									uploadUrl as string,
									buffer,
									true,
									headers,
								);
								Object.assign(articleBody.content.article, { thumbnail: image });
							}

							Object.assign(body, articleBody);
							if (description === '') {
								delete body.description;
							}

							if (title === '') {
								delete body.title;
							}
						} else {
							Object.assign(body, {
								commentary: text,
							});
						}
						const endpoint = '/posts';
						responseData = await linkedInApiRequest.call(this, 'POST', endpoint, body);
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
