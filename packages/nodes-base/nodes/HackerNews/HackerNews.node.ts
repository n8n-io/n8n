import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { hackerNewsApiRequest, hackerNewsApiRequestAllItems } from './GenericFunctions';

export class HackerNews implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hacker News',
		name: 'hackerNews',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:hackernews.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Hacker News API',
		defaults: {
			name: 'Hacker News',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			// ----------------------------------
			//         Resources
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'Article',
						value: 'article',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'article',
			},

			// ----------------------------------
			//         Operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['all'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get all items',
						action: 'Get many items',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['article'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a Hacker News article',
						action: 'Get an article',
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
						resource: ['user'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a Hacker News user',
						action: 'Get a user',
					},
				],
				default: 'get',
			},
			// ----------------------------------
			//         Fields
			// ----------------------------------
			{
				displayName: 'Article ID',
				name: 'articleId',
				type: 'string',
				required: true,
				default: '',
				description: 'The ID of the Hacker News article to be returned',
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['get'],
					},
				},
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				required: true,
				default: '',
				description: 'The Hacker News user to be returned',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['get'],
					},
				},
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: {
					show: {
						resource: ['all'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 100,
				description: 'Max number of results to return',
				displayOptions: {
					show: {
						resource: ['all'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['article'],
						operation: ['get'],
					},
				},
				options: [
					{
						displayName: 'Include Comments',
						name: 'includeComments',
						type: 'boolean',
						default: false,
						description: 'Whether to include all the comments in a Hacker News article',
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['all'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Keyword',
						name: 'keyword',
						type: 'string',
						default: '',
						description: 'The keyword for filtering the results of the query',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'multiOptions',
						options: [
							{
								name: 'Ask HN',
								value: 'ask_hn', // snake case per HN tags
								description: 'Returns query results filtered by Ask HN tag',
							},
							{
								name: 'Comment',
								value: 'comment',
								description: 'Returns query results filtered by comment tag',
							},
							{
								name: 'Front Page',
								value: 'front_page', // snake case per HN tags
								description: 'Returns query results filtered by Front Page tag',
							},
							{
								name: 'Poll',
								value: 'poll',
								description: 'Returns query results filtered by poll tag',
							},
							{
								name: 'Show HN',
								value: 'show_hn', // snake case per HN tags
								description: 'Returns query results filtered by Show HN tag',
							},
							{
								name: 'Story',
								value: 'story',
								description: 'Returns query results filtered by story tag',
							},
						],
						default: [],
						description: 'Tags for filtering the results of the query',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		let returnAll = false;

		for (let i = 0; i < items.length; i++) {
			try {
				let qs: IDataObject = {};
				let endpoint = '';
				let includeComments = false;

				if (resource === 'all') {
					if (operation === 'getAll') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const keyword = additionalFields.keyword as string;
						const tags = additionalFields.tags as string[];

						qs = {
							query: keyword,
							tags: tags ? tags.join() : '',
						};

						returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (!returnAll) {
							qs.hitsPerPage = this.getNodeParameter('limit', i) as number;
						}

						endpoint = 'search?';
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation '${operation}' is unknown!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'article') {
					if (operation === 'get') {
						endpoint = `items/${this.getNodeParameter('articleId', i)}`;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						includeComments = additionalFields.includeComments as boolean;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation '${operation}' is unknown!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'user') {
					if (operation === 'get') {
						endpoint = `users/${this.getNodeParameter('username', i)}`;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation '${operation}' is unknown!`,
							{ itemIndex: i },
						);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource '${resource}' is unknown!`, {
						itemIndex: i,
					});
				}

				let responseData;
				if (returnAll === true) {
					responseData = await hackerNewsApiRequestAllItems.call(this, 'GET', endpoint, qs);
				} else {
					responseData = await hackerNewsApiRequest.call(this, 'GET', endpoint, qs);
					if (resource === 'all' && operation === 'getAll') {
						responseData = responseData.hits;
					}
				}

				if (resource === 'article' && operation === 'get' && !includeComments) {
					delete responseData.children;
				}

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
