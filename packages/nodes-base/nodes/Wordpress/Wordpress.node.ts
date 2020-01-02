import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	wordpressApiRequest, wordpressApiRequestAllItems,
} from './GenericFunctions';
import {
	postOperations,
	postFields,
} from './PostDescription';
import {
	IPost,
} from './PostInterface';

export class Wordpress implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wordpress',
		name: 'Wordpress',
		icon: 'file:wordpress.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Wordpress API',
		defaults: {
			name: 'Wordpress',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'wordpressApi',
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
						name: 'Post',
						value: 'post',
						description: ``,
					},
				],
				default: 'post',
				description: 'Resource to consume.',
			},
			...postOperations,
			...postFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available categories to display them to user so that he can
			// select them easily
			async getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let categories;
				try {
					categories = await wordpressApiRequestAllItems.call(this, 'GET', '/categories', {});
				} catch (err) {
					throw new Error(`Wordpress Error: ${err}`);
				}
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
			// Get all the available tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let tags;
				try {
					tags = await wordpressApiRequestAllItems.call(this, 'GET', '/tags', {});
				} catch (err) {
					throw new Error(`Wordpress Error: ${err}`);
				}
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
			// Get all the available authors to display them to user so that he can
			// select them easily
			async getAuthors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let authors;
				try {
					authors = await wordpressApiRequestAllItems.call(this, 'GET', '/users', {}, { who: 'authors' });
				} catch (err) {
					throw new Error(`Wordpress Error: ${err}`);
				}
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
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (resource === 'post') {
				//https://developer.wordpress.org/rest-api/reference/posts/#create-a-post
				if (operation === 'create') {
					const title = this.getNodeParameter('title', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IPost = {
						title,
					};
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
					if (additionalFields.categories) {
						body.categories = additionalFields.categories as number[];
					}
					if (additionalFields.tags) {
						body.tags = additionalFields.tags as number[];
					}
					if (additionalFields.format) {
						body.format = additionalFields.format as string;
					}
					try{
						responseData = await wordpressApiRequest.call(this, 'POST', '/posts', body);
					} catch (err) {
						throw new Error(`Wordpress Error: ${err.message}`);
					}
				}
				//https://developer.wordpress.org/rest-api/reference/posts/#update-a-post
				if (operation === 'update') {
					const postId = this.getNodeParameter('postId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: IPost = {
						id: parseInt(postId, 10),
					};
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
					if (updateFields.categories) {
						body.categories = updateFields.categories as number[];
					}
					if (updateFields.tags) {
						body.tags = updateFields.tags as number[];
					}
					if (updateFields.format) {
						body.format = updateFields.format as string;
					}
					try {
						responseData = await wordpressApiRequest.call(this, 'POST', `/posts/${postId}`, body);
					} catch (err) {
						throw new Error(`Wordpress Error: ${err.message}`);
					}
				}
				//https://developer.wordpress.org/rest-api/reference/posts/#retrieve-a-post
				if (operation === 'get') {
					const postId = this.getNodeParameter('postId', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					options.id = postId;
					if (options.password) {
						qs.password = options.password as string;
					}
					if (options.context) {
						qs.context = options.context as string;
					}
					try {
						responseData = await wordpressApiRequest.call(this,'GET', `/posts/${postId}`, {}, qs);
					} catch (err) {
						throw new Error(`Wordpress Error: ${err.message}`);
					}
				}
				//https://developer.wordpress.org/rest-api/reference/posts/#list-posts
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					if (filters.context) {
						qs.context = filters.context as string;
					}
					if (filters.orderBy) {
						qs.orderby = filters.orderBy as string;
					}
					if (filters.order) {
						qs.order = filters.order as string;
					}
					if (filters.search) {
						qs.search = filters.search as string;
					}
					if (filters.after) {
						qs.after = filters.after as string;
					}
					if (filters.author) {
						qs.author = filters.author as number[];
					}
					if (filters.categories) {
						qs.categories = filters.categories as number[];
					}
					if (filters.excludedCategories) {
						qs.categories_exclude = filters.excludedCategories as number[];
					}
					if (filters.tags) {
						qs.tags = filters.tags as number[];
					}
					if (filters.excludedTags) {
						qs.tags_exclude = filters.excludedTags as number[];
					}
					if (filters.sticky) {
						qs.sticky = filters.sticky as boolean;
					}
					try {
						if (returnAll === true) {
							responseData = await wordpressApiRequestAllItems.call(this, 'GET', '/posts', {}, qs);
						} else {
							qs.per_page = this.getNodeParameter('limit', i) as number;
							responseData = await wordpressApiRequest.call(this, 'GET', '/posts', {}, qs);
						}
					} catch (err) {
						throw new Error(`Wordpress Error: ${err.message}`);
					}
				}
				//https://developer.wordpress.org/rest-api/reference/posts/#delete-a-post
				if (operation === 'delete') {
					const postId = this.getNodeParameter('postId', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					if (options.force) {
						qs.force = options.force as boolean;
					}
					try {
						responseData = await wordpressApiRequest.call(this, 'DELETE', `/posts/${postId}`, {}, qs);
					} catch (err) {
						throw new Error(`Wordpress Error: ${err.message}`);
					}
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
