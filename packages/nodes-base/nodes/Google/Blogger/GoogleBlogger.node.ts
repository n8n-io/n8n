import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { bloggerApiRequest, bloggerApiRequestAllItems } from './GenericFunctions';

export class GoogleBlogger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Blogger',
		name: 'googleBlogger',
		icon: 'file:googleblogger.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Blogger API',
		defaults: {
			name: 'Google Blogger',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
			},
			{
				name: 'googleBloggerOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
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
						name: 'Service Account',
						value: 'serviceAccount',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'serviceAccount',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Blog',
						value: 'blog',
					},
					{
						name: 'Post',
						value: 'post',
					},
					{
						name: 'Comment',
						value: 'comment',
					},
				],
				default: 'blog',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['blog'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a blog',
						action: 'Get a blog',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many blogs',
						action: 'Get many blogs',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['post'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a post',
						action: 'Create a post',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a post',
						action: 'Delete a post',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a post',
						action: 'Get a post',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many posts',
						action: 'Get many posts',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a post',
						action: 'Update a post',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['comment'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a comment',
						action: 'Get a comment',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many comments',
						action: 'Get many comments',
					},
				],
				default: 'get',
			},
			// Additional fields will be added here for each operation
		],
	};

	methods = {
		loadOptions: {},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'blog') {
					if (operation === 'get') {
						const blogId = this.getNodeParameter('blogId', i) as string;
						responseData = await bloggerApiRequest.call(this, 'GET', `/blogs/${blogId}`);
					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll) {
							responseData = await bloggerApiRequestAllItems.call(
								this,
								'items',
								'GET',
								'/users/self/blogs',
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await bloggerApiRequest.call(
								this,
								'GET',
								'/users/self/blogs',
								{},
								qs,
							);
							responseData = responseData.items;
						}
					}
				} else if (resource === 'post') {
					if (operation === 'create') {
						const blogId = this.getNodeParameter('blogId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						const body: IDataObject = {
							kind: 'blogger#post',
							title,
							content,
						};
						responseData = await bloggerApiRequest.call(
							this,
							'POST',
							`/blogs/${blogId}/posts`,
							body,
						);
					} else if (operation === 'delete') {
						const blogId = this.getNodeParameter('blogId', i) as string;
						const postId = this.getNodeParameter('postId', i) as string;
						await bloggerApiRequest.call(this, 'DELETE', `/blogs/${blogId}/posts/${postId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						const blogId = this.getNodeParameter('blogId', i) as string;
						const postId = this.getNodeParameter('postId', i) as string;
						responseData = await bloggerApiRequest.call(
							this,
							'GET',
							`/blogs/${blogId}/posts/${postId}`,
						);
					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const blogId = this.getNodeParameter('blogId', i) as string;
						if (returnAll) {
							responseData = await bloggerApiRequestAllItems.call(
								this,
								'items',
								'GET',
								`/blogs/${blogId}/posts`,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await bloggerApiRequest.call(
								this,
								'GET',
								`/blogs/${blogId}/posts`,
								{},
								qs,
							);
							responseData = responseData.items;
						}
					} else if (operation === 'update') {
						const blogId = this.getNodeParameter('blogId', i) as string;
						const postId = this.getNodeParameter('postId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {
							kind: 'blogger#post',
						};
						if (updateFields.title) {
							body.title = updateFields.title as string;
						}
						if (updateFields.content) {
							body.content = updateFields.content as string;
						}
						responseData = await bloggerApiRequest.call(
							this,
							'PUT',
							`/blogs/${blogId}/posts/${postId}`,
							body,
						);
					}
				} else if (resource === 'comment') {
					if (operation === 'get') {
						const blogId = this.getNodeParameter('blogId', i) as string;
						const postId = this.getNodeParameter('postId', i) as string;
						const commentId = this.getNodeParameter('commentId', i) as string;
						responseData = await bloggerApiRequest.call(
							this,
							'GET',
							`/blogs/${blogId}/posts/${postId}/comments/${commentId}`,
						);
					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const blogId = this.getNodeParameter('blogId', i) as string;
						const postId = this.getNodeParameter('postId', i) as string;
						if (returnAll) {
							responseData = await bloggerApiRequestAllItems.call(
								this,
								'items',
								'GET',
								`/blogs/${blogId}/posts/${postId}/comments`,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await bloggerApiRequest.call(
								this,
								'GET',
								`/blogs/${blogId}/posts/${postId}/comments`,
								{},
								qs,
							);
							responseData = responseData.items;
						}
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
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
		return [returnData];
	}
}