import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	mediumApiRequest,
} from './GenericFunctions';

export class Medium implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Medium',
		name: 'medium',
		group: ['output'],
		icon: 'file:medium.png',
		version: 1,
		description: 'Consume Medium API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Medium',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mediumApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'mediumOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',

						],
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
						name: 'OAuth2',
						value: 'oAuth2',
					},
					{
						name: 'Access Token',
						value: 'accessToken',
					},
				],
				default: '',
				description: 'The method of authentication.',
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
				description: 'Resource to consume.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'post',
						],
					},
				},
				options: [
					{
						name: 'Create a post',
						value: 'create',
						description: 'Create a post on the user authenticated profile',
					},
					{
						name: 'Create a post under a publication',
						value: 'createPublication',
						description: 'Create a post under a publication',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			// ----------------------------------
			//         post under publication:create
			// ----------------------------------
			{
				displayName: 'Publication ID',
				name: 'publicationId',
				type: 'string',
				default: '',
				placeholder: '@n8n',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'createPublication',
						],
						resource: [
							'post',
						],
					},
				},
				description: 'The user ID.',
			},
			// ----------------------------------
			//         post:create
			// ----------------------------------

			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'My open source contribution',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
							'createPublication',
						],
						resource: [
							'post',
						],
					},
				},
				description: 'Title of the post. It should be less than 100 characters',
			},
			{
				displayName: 'Content format',
				name: 'contentFormat',
				default: '',
				placeholder: 'My open source contribution',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
							'createPublication',
						],
						resource: [
							'post',
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Markdown',
						value: 'markdown',
					},

				],

				description: 'The format of the content to be posted.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				placeholder: 'My open source contribution',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
							'createPublication',
						],
						resource: [
							'post',
						],
					},
				},
				description: 'The body of the post, in a valid, semantic, HTML fragment, or Markdown.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Fields',
				displayOptions: {
					show: {
						operation: [
							'create',
							'createPublication',
						],
						resource: [
							'post',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: 'open-source,mlh,fellowship',
						description: 'Tags separated by comma to classify the post. Only the first three will be used. Tags longer than 25 characters will be ignored.',
					},
					{
						displayName: 'Publish Status',
						name: 'publishStatus',
						default: 'public',
						type: 'options',
						options: [
							{
								name: 'Public',
								value: 'public',
							},
							{
								name: 'Draft',
								value: 'draft',
							},
							{
								name: 'Unlisted',
								value: 'unlisted',
							},

						],

						description: 'The status of the post.',
					},
					{
						displayName: 'Notify Followers',
						name: 'notifyFollowers',
						type: 'boolean',
						default: false,
						description: `Whether to notify followers that the user has published.`,
					},
					{
						displayName: 'License',
						name: 'license',
						type: 'string',
						default: 'all-rights-reserved',
						options: [
							{
								name: 'all-rights-reserved',
								value: 'all-rights-reserved',
							},
							{
								name: '“cc-40-by',
								value: '“cc-40-by',
							},
							{
								name: 'cc-40-by-sa',
								value: 'cc-40-by-sa',
							},
							{
								name: 'cc-40-by-nd',
								value: 'cc-40-by-nd',
							},
							{
								name: 'cc-40-by-nc',
								value: 'cc-40-by-nc',
							},
							{
								name: '“cc-40-by-nc-nd',
								value: '“cc-40-by-nc-nd',
							},
							{
								name: 'cc-40-by-nc-sa',
								value: 'cc-40-by-nc-sa',
							},
							{
								name: 'cc-40-zero',
								value: 'cc-40-zero',
							},
							{
								name: 'public-domain',
								value: 'public-domain',
							},


						],
						description: 'Tags separated by comma to classify the post. Only the first three will be used. Tags longer than 25 characters will be ignored.',
					},
				],
			},

		]

	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let operation: string;
		let resource: string;

		// For POST
		let bodyRequest: IDataObject;
		// For Query string
		let qs: IDataObject;
		let requestMethod;
		let responseData;

		for (let i = 0; i < items.length; i++) {
			qs = {};

			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;

			if (resource === 'post') {
				//https://github.com/Medium/medium-api-docs
				if (operation === 'create') {
					// ----------------------------------
					//         post:create
					// ----------------------------------

					requestMethod = 'POST';
					// get authorId
					let responseAuthorId = await mediumApiRequest.call(
						this,
						'GET',
						'/me',
						{},
						qs
					);

					const authorId = responseAuthorId.data.id;
					const title = this.getNodeParameter('title', i) as string;
					const contentFormat = this.getNodeParameter('contentFormat', i) as string;
					const content = this.getNodeParameter('content', i) as string;

					bodyRequest = {
						tags: [],
						title,
						contentFormat,
						content,

					};
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						i
					) as IDataObject;
					if (additionalFields.tags) {
						const tags = additionalFields.tags as string;
						bodyRequest.tags = tags.split(',').map(item => {
							return parseInt(item, 10);
						});
					}



					if (additionalFields.publishStatus) {
						bodyRequest.publishStatus = additionalFields.publishStatus as string;
					}
					if (additionalFields.license) {
						bodyRequest.license = additionalFields.license as string;
					}
					if (additionalFields.notifyFollowers) {
						bodyRequest.notifyFollowers = additionalFields.notifyFollowers as string;
					}
					responseData = await mediumApiRequest.call(
						this,
						'POST',
						`/users/${authorId}/posts`,
						bodyRequest,
						qs
					);

				}
				//https://github.com/Medium/medium-api-docs
				if (operation === 'createPublication') {
					// ----------------------------------
					//         post:create
					// ----------------------------------

					requestMethod = 'POST';
					const publicationId = this.getNodeParameter('publicationId', i) as string;
					const title = this.getNodeParameter('title', i) as string;
					const contentFormat = this.getNodeParameter('contentFormat', i) as string;
					const content = this.getNodeParameter('content', i) as string;

					bodyRequest = {
						tags: [],
						title,
						contentFormat,
						content,

					};
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						i
					) as IDataObject;
					if (additionalFields.tags) {
						const tags = additionalFields.tags as string;
						bodyRequest.tags = tags.split(',').map(item => {
							return parseInt(item, 10);
						});
					}



					if (additionalFields.publishStatus) {
						bodyRequest.publishStatus = additionalFields.publishStatus as string;
					}
					if (additionalFields.license) {
						bodyRequest.license = additionalFields.license as string;
					}
					if (additionalFields.notifyFollowers) {
						bodyRequest.notifyFollowers = additionalFields.notifyFollowers as string;
					}
					responseData = await mediumApiRequest.call(
						this,
						'POST',
						`/publications/${publicationId}/posts`,
						bodyRequest,
						qs
					);

				}

			}
			if (Array.isArray(responseData.data)) {
				returnData.push.apply(returnData, responseData.data as IDataObject[]);
			} else {
				returnData.push(responseData.data as IDataObject);
			}




		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
