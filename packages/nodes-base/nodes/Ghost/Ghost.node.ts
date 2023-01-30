import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { ghostApiRequest, ghostApiRequestAllItems, validateJSON } from './GenericFunctions';

import { postFields, postOperations } from './PostDescription';

import moment from 'moment-timezone';

export class Ghost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ghost',
		name: 'ghost',
		icon: 'file:ghost.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Ghost API',
		defaults: {
			name: 'Ghost',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ghostAdminApi',
				required: true,
				displayOptions: {
					show: {
						source: ['adminApi'],
					},
				},
			},
			{
				name: 'ghostContentApi',
				required: true,
				displayOptions: {
					show: {
						source: ['contentApi'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				description: 'Pick where your data comes from, Content or Admin API',
				options: [
					{
						name: 'Admin API',
						value: 'adminApi',
					},
					{
						name: 'Content API',
						value: 'contentApi',
					},
				],
				default: 'contentApi',
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
				noDataExpression: true,
				default: 'post',
			},
			...postOperations,
			...postFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the authors to display them to user so that he can
			// select them easily
			async getAuthors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await ghostApiRequestAllItems.call(this, 'users', 'GET', '/admin/users');
				for (const user of users) {
					returnData.push({
						name: user.name,
						value: user.id,
					});
				}
				return returnData;
			},
			// Get all the tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tags = await ghostApiRequestAllItems.call(this, 'tags', 'GET', '/admin/tags');
				for (const tag of tags) {
					returnData.push({
						name: tag.name,
						value: tag.name,
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
		const timezone = this.getTimezone();
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const source = this.getNodeParameter('source', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (source === 'contentApi') {
					if (resource === 'post') {
						if (operation === 'get') {
							const by = this.getNodeParameter('by', i) as string;

							const identifier = this.getNodeParameter('identifier', i) as string;

							const options = this.getNodeParameter('options', i);

							Object.assign(qs, options);

							let endpoint;

							if (by === 'slug') {
								endpoint = `/content/posts/slug/${identifier}`;
							} else {
								endpoint = `/content/posts/${identifier}`;
							}

							responseData = await ghostApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.posts;
						}

						if (operation === 'getAll') {
							const returnAll = this.getNodeParameter('returnAll', 0);

							const options = this.getNodeParameter('options', i);

							Object.assign(qs, options);

							if (returnAll) {
								responseData = await ghostApiRequestAllItems.call(
									this,
									'posts',
									'GET',
									'/content/posts',
									{},
									qs,
								);
							} else {
								qs.limit = this.getNodeParameter('limit', 0);
								responseData = await ghostApiRequest.call(this, 'GET', '/content/posts', {}, qs);
								responseData = responseData.posts;
							}
						}
					}
				}

				if (source === 'adminApi') {
					if (resource === 'post') {
						if (operation === 'create') {
							const title = this.getNodeParameter('title', i) as string;

							const contentFormat = this.getNodeParameter('contentFormat', i) as string;

							const content = this.getNodeParameter('content', i) as string;

							const additionalFields = this.getNodeParameter('additionalFields', i);

							const post: IDataObject = {
								title,
							};

							if (contentFormat === 'html') {
								post.html = content;
								qs.source = 'html';
							} else {
								const mobileDoc = validateJSON(content);
								if (mobileDoc === undefined) {
									throw new NodeOperationError(this.getNode(), 'Content must be a valid JSON', {
										itemIndex: i,
									});
								}
								post.mobiledoc = content;
							}

							delete post.content;

							Object.assign(post, additionalFields);

							if (post.published_at) {
								post.published_at = moment.tz(post.published_at, timezone).utc().format();
							}

							if (post.status === 'scheduled' && post.published_at === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									'Published at must be define when status is scheduled',
									{ itemIndex: i },
								);
							}

							responseData = await ghostApiRequest.call(
								this,
								'POST',
								'/admin/posts',
								{ posts: [post] },
								qs,
							);
							responseData = responseData.posts;
						}

						if (operation === 'delete') {
							const postId = this.getNodeParameter('postId', i) as string;

							responseData = await ghostApiRequest.call(this, 'DELETE', `/admin/posts/${postId}`);
						}

						if (operation === 'get') {
							const by = this.getNodeParameter('by', i) as string;

							const identifier = this.getNodeParameter('identifier', i) as string;

							const options = this.getNodeParameter('options', i);

							Object.assign(qs, options);

							let endpoint;

							if (by === 'slug') {
								endpoint = `/admin/posts/slug/${identifier}`;
							} else {
								endpoint = `/admin/posts/${identifier}`;
							}
							responseData = await ghostApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.posts;
						}

						if (operation === 'getAll') {
							const returnAll = this.getNodeParameter('returnAll', 0);

							const options = this.getNodeParameter('options', i);

							Object.assign(qs, options);

							if (returnAll) {
								responseData = await ghostApiRequestAllItems.call(
									this,
									'posts',
									'GET',
									'/admin/posts',
									{},
									qs,
								);
							} else {
								qs.limit = this.getNodeParameter('limit', 0);
								responseData = await ghostApiRequest.call(this, 'GET', '/admin/posts', {}, qs);
								responseData = responseData.posts;
							}
						}

						if (operation === 'update') {
							const postId = this.getNodeParameter('postId', i) as string;

							const contentFormat = this.getNodeParameter('contentFormat', i) as string;

							const updateFields = this.getNodeParameter('updateFields', i);

							const post: IDataObject = {};

							if (contentFormat === 'html') {
								post.html = updateFields.content || '';
								qs.source = 'html';
								delete updateFields.content;
							} else {
								const mobileDoc = validateJSON((updateFields.contentJson as string) || undefined);
								if (mobileDoc === undefined) {
									throw new NodeOperationError(this.getNode(), 'Content must be a valid JSON', {
										itemIndex: i,
									});
								}
								post.mobiledoc = updateFields.contentJson;
								delete updateFields.contentJson;
							}

							Object.assign(post, updateFields);

							const { posts } = await ghostApiRequest.call(
								this,
								'GET',
								`/admin/posts/${postId}`,
								{},
								{ fields: 'id, updated_at' },
							);

							if (post.published_at) {
								post.published_at = moment.tz(post.published_at, timezone).utc().format();
							}

							if (post.status === 'scheduled' && post.published_at === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									'Published at must be define when status is scheduled',
									{ itemIndex: i },
								);
							}

							post.updated_at = posts[0].updated_at;

							responseData = await ghostApiRequest.call(
								this,
								'PUT',
								`/admin/posts/${postId}`,
								{ posts: [post] },
								qs,
							);
							responseData = responseData.posts;
						}
					}
				}

				responseData = this.helpers.returnJsonArray(responseData);
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
