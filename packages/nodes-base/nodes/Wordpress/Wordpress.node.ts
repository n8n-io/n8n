import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { wordpressApiRequest, wordpressApiRequestAllItems } from './GenericFunctions';
import { postFields, postOperations } from './PostDescription';
import { userFields, userOperations } from './UserDescription';
import type { IPost } from './PostInterface';
import type { IUser } from './UserInterface';

export class Wordpress implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wordpress',
		name: 'wordpress',
		icon: 'file:wordpress.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Wordpress API',
		defaults: {
			name: 'Wordpress',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'wordpressApi',
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
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'post',
			},
			...postOperations,
			...postFields,
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available categories to display them to user so that they can
			// select them easily
			async getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const categories = await wordpressApiRequestAllItems.call(this, 'GET', '/categories', {});
				for (const category of categories) {
					const categoryName = category.name;
					const categoryId = category.id;

					returnData.push({
						name: categoryName,
						value: categoryId,
					});
				}
				return returnData;
			},
			// Get all the available tags to display them to user so that they can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tags = await wordpressApiRequestAllItems.call(this, 'GET', '/tags', {});
				for (const tag of tags) {
					const tagName = tag.name;
					const tagId = tag.id;

					returnData.push({
						name: tagName,
						value: tagId,
					});
				}
				return returnData;
			},
			// Get all the available authors to display them to user so that they can
			// select them easily
			async getAuthors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const authors = await wordpressApiRequestAllItems.call(
					this,
					'GET',
					'/users',
					{},
					{ who: 'authors' },
				);
				for (const author of authors) {
					const authorName = author.name;
					const authorId = author.id;

					returnData.push({
						name: authorName,
						value: authorId,
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
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'post') {
					//https://developer.wordpress.org/rest-api/reference/posts/#create-a-post
					if (operation === 'create') {
						const title = this.getNodeParameter('title', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IPost = {
							title,
						};
						if (additionalFields.authorId) {
							body.author = additionalFields.authorId as number;
						}
						if (additionalFields.content) {
							body.content = additionalFields.content as string;
						}
						if (additionalFields.slug) {
							body.slug = additionalFields.slug as string;
						}
						if (additionalFields.password) {
							body.password = additionalFields.password as string;
						}
						if (additionalFields.status) {
							body.status = additionalFields.status as string;
						}
						if (additionalFields.commentStatus) {
							body.comment_status = additionalFields.commentStatus as string;
						}
						if (additionalFields.pingStatus) {
							body.ping_status = additionalFields.pingStatus as string;
						}
						if (additionalFields.sticky) {
							body.sticky = additionalFields.sticky as boolean;
						}
						if (additionalFields.postTemplate) {
							body.template = this.getNodeParameter(
								'additionalFields.postTemplate.values.template',
								i,
								'',
							) as string;
						}
						if (additionalFields.categories) {
							body.categories = additionalFields.categories as number[];
						}
						if (additionalFields.tags) {
							body.tags = additionalFields.tags as number[];
						}
						if (additionalFields.format) {
							body.format = additionalFields.format as string;
						}
						responseData = await wordpressApiRequest.call(this, 'POST', '/posts', body);
					}
					//https://developer.wordpress.org/rest-api/reference/posts/#update-a-post
					if (operation === 'update') {
						const postId = this.getNodeParameter('postId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IPost = {
							id: parseInt(postId, 10),
						};
						if (updateFields.authorId) {
							body.author = updateFields.authorId as number;
						}
						if (updateFields.title) {
							body.title = updateFields.title as string;
						}
						if (updateFields.content) {
							body.content = updateFields.content as string;
						}
						if (updateFields.slug) {
							body.slug = updateFields.slug as string;
						}
						if (updateFields.password) {
							body.password = updateFields.password as string;
						}
						if (updateFields.status) {
							body.status = updateFields.status as string;
						}
						if (updateFields.commentStatus) {
							body.comment_status = updateFields.commentStatus as string;
						}
						if (updateFields.pingStatus) {
							body.ping_status = updateFields.pingStatus as string;
						}
						if (updateFields.sticky) {
							body.sticky = updateFields.sticky as boolean;
						}
						if (updateFields.postTemplate) {
							body.template = this.getNodeParameter(
								'updateFields.postTemplate.values.template',
								i,
								'',
							) as string;
						}
						if (updateFields.categories) {
							body.categories = updateFields.categories as number[];
						}
						if (updateFields.tags) {
							body.tags = updateFields.tags as number[];
						}
						if (updateFields.format) {
							body.format = updateFields.format as string;
						}
						responseData = await wordpressApiRequest.call(this, 'POST', `/posts/${postId}`, body);
					}
					//https://developer.wordpress.org/rest-api/reference/posts/#retrieve-a-post
					if (operation === 'get') {
						const postId = this.getNodeParameter('postId', i) as string;
						const options = this.getNodeParameter('options', i);
						if (options.password) {
							qs.password = options.password as string;
						}
						if (options.context) {
							qs.context = options.context as string;
						}
						responseData = await wordpressApiRequest.call(this, 'GET', `/posts/${postId}`, {}, qs);
					}
					//https://developer.wordpress.org/rest-api/reference/posts/#list-posts
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						if (options.context) {
							qs.context = options.context as string;
						}
						if (options.orderBy) {
							qs.orderby = options.orderBy as string;
						}
						if (options.order) {
							qs.order = options.order as string;
						}
						if (options.search) {
							qs.search = options.search as string;
						}
						if (options.after) {
							qs.after = options.after as string;
						}
						if (options.author) {
							qs.author = options.author as number[];
						}
						if (options.categories) {
							qs.categories = options.categories as number[];
						}
						if (options.excludedCategories) {
							qs.categories_exclude = options.excludedCategories as number[];
						}
						if (options.tags) {
							qs.tags = options.tags as number[];
						}
						if (options.excludedTags) {
							qs.tags_exclude = options.excludedTags as number[];
						}
						if (options.sticky) {
							qs.sticky = options.sticky as boolean;
						}
						if (options.status) {
							qs.status = options.status as string;
						}
						if (returnAll) {
							responseData = await wordpressApiRequestAllItems.call(this, 'GET', '/posts', {}, qs);
						} else {
							qs.per_page = this.getNodeParameter('limit', i);
							responseData = await wordpressApiRequest.call(this, 'GET', '/posts', {}, qs);
						}
					}
					//https://developer.wordpress.org/rest-api/reference/posts/#delete-a-post
					if (operation === 'delete') {
						const postId = this.getNodeParameter('postId', i) as string;
						const options = this.getNodeParameter('options', i);
						if (options.force) {
							qs.force = options.force as boolean;
						}
						responseData = await wordpressApiRequest.call(
							this,
							'DELETE',
							`/posts/${postId}`,
							{},
							qs,
						);
					}
				}
				if (resource === 'user') {
					//https://developer.wordpress.org/rest-api/reference/users/#create-a-user
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const username = this.getNodeParameter('username', i) as string;
						const firstName = this.getNodeParameter('firstName', i) as string;
						const lastName = this.getNodeParameter('lastName', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const password = this.getNodeParameter('password', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IUser = {
							name,
							username,
							first_name: firstName,
							last_name: lastName,
							email,
							password,
						};
						if (additionalFields.url) {
							body.url = additionalFields.url as string;
						}
						if (additionalFields.description) {
							body.description = additionalFields.description as string;
						}
						if (additionalFields.nickname) {
							body.nickname = additionalFields.nickname as string;
						}
						if (additionalFields.slug) {
							body.slug = additionalFields.slug as string;
						}
						responseData = await wordpressApiRequest.call(this, 'POST', '/users', body);
					}
					//https://developer.wordpress.org/rest-api/reference/users/#update-a-user
					if (operation === 'update') {
						const userId = this.getNodeParameter('userId', i) as number;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IUser = {
							id: userId,
						};
						if (updateFields.name) {
							body.name = updateFields.name as string;
						}
						if (updateFields.firstName) {
							body.first_name = updateFields.firstName as string;
						}
						if (updateFields.lastName) {
							body.last_name = updateFields.lastName as string;
						}
						if (updateFields.email) {
							body.email = updateFields.email as string;
						}
						if (updateFields.password) {
							body.password = updateFields.password as string;
						}
						if (updateFields.username) {
							body.username = updateFields.username as string;
						}
						if (updateFields.url) {
							body.url = updateFields.url as string;
						}
						if (updateFields.description) {
							body.description = updateFields.description as string;
						}
						if (updateFields.nickname) {
							body.nickname = updateFields.nickname as string;
						}
						if (updateFields.slug) {
							body.slug = updateFields.slug as string;
						}
						responseData = await wordpressApiRequest.call(this, 'POST', `/users/${userId}`, body);
					}
					//https://developer.wordpress.org/rest-api/reference/users/#retrieve-a-user
					if (operation === 'get') {
						const userId = this.getNodeParameter('userId', i) as string;
						const options = this.getNodeParameter('options', i);
						if (options.context) {
							qs.context = options.context as string;
						}
						responseData = await wordpressApiRequest.call(this, 'GET', `/users/${userId}`, {}, qs);
					}
					//https://developer.wordpress.org/rest-api/reference/users/#list-users
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						if (options.context) {
							qs.context = options.context as string;
						}
						if (options.orderBy) {
							qs.orderby = options.orderBy as string;
						}
						if (options.order) {
							qs.order = options.order as string;
						}
						if (options.search) {
							qs.search = options.search as string;
						}
						if (options.who) {
							qs.who = options.who as string;
						}
						if (returnAll) {
							responseData = await wordpressApiRequestAllItems.call(this, 'GET', '/users', {}, qs);
						} else {
							qs.per_page = this.getNodeParameter('limit', i);
							responseData = await wordpressApiRequest.call(this, 'GET', '/users', {}, qs);
						}
					}
					//https://developer.wordpress.org/rest-api/reference/users/#delete-a-user
					if (operation === 'delete') {
						const reassign = this.getNodeParameter('reassign', i) as string;
						qs.reassign = reassign;
						qs.force = true;
						responseData = await wordpressApiRequest.call(this, 'DELETE', '/users/me', {}, qs);
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
