import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { discussionFields, discussionOperations } from './DiscussionDescription';

import { flarumApiRequest, flarumApiRequestAllItems } from './GenericFunctions';

export class Flarum implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Flarum',
		name: 'flarum',
		icon: 'file:flarum_logo.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Flarum API',
		defaults: {
			name: 'Flarum',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'flarumApi',
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
						name: 'Discussion',
						value: 'discussion',
					},
				],
				default: 'discussion',
			},
			...discussionOperations,
			...discussionFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available tags to display them to user so that they can
			// select them easily
			async getTags(this: ILoadOptionsFunctions) {
				const returnData = [];
				const tags = await flarumApiRequestAllItems.call(this, 'data', 'GET', '/tags');
				for (const tag of tags) {
					returnData.push({
						name: tag.attributes.name,
						value: tag.id,
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
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'discussion') {
					if (operation === 'create') {
						const title = this.getNodeParameter('title', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {
							type: 'discussions',
							attributes: {
								title,
								content,
							},
							relationships: {},
						};
						if (additionalFields.tags) {
							body.relationships!.tags = {
								data: additionalFields.tags.map((tagId: string) => ({ type: 'tags', id: tagId })),
							};
						}
						responseData = await flarumApiRequest.call(this, 'POST', '/discussions', body);
					}
					if (operation === 'get') {
						const discussionId = this.getNodeParameter('discussionId', i) as string;
						responseData = await flarumApiRequest.call(this, 'GET', `/discussions/${discussionId}`);
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0);
						const filters = this.getNodeParameter('filters', i);
						const qs: IDataObject = {};
						if (filters.tag) {
							qs.filter = { tag: filters.tag };
						}
						if (returnAll) {
							responseData = await flarumApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/discussions',
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', 0);
							qs.page = { limit };
							responseData = await flarumApiRequest.call(this, 'GET', '/discussions', {}, qs);
							responseData = responseData.data;
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
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}