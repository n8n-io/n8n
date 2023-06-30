import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { storyblokApiRequest, storyblokApiRequestAllItems } from './GenericFunctions';

import { storyContentFields, storyContentOperations } from './StoryContentDescription';

import { storyManagementFields, storyManagementOperations } from './StoryManagementDescription';

export class Storyblok implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Storyblok',
		name: 'storyblok',
		icon: 'file:storyblok.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Storyblok API',
		defaults: {
			name: 'Storyblok',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'storyblokContentApi',
				required: true,
				displayOptions: {
					show: {
						source: ['contentApi'],
					},
				},
			},
			{
				name: 'storyblokManagementApi',
				required: true,
				displayOptions: {
					show: {
						source: ['managementApi'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				default: 'contentApi',
				description: 'Pick where your data comes from, Content or Management API',
				options: [
					{
						name: 'Content API',
						value: 'contentApi',
					},
					{
						name: 'Management API',
						value: 'managementApi',
					},
				],
			},
			// Resources: Content API
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Story',
						value: 'story',
					},
				],
				default: 'story',
				displayOptions: {
					show: {
						source: ['contentApi'],
					},
				},
			},
			// Resources: Management API
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Story',
						value: 'story',
					},
				],
				default: 'story',
				displayOptions: {
					show: {
						source: ['managementApi'],
					},
				},
			},
			// Content API - Story
			...storyContentOperations,
			...storyContentFields,
			// Management API - Story
			...storyManagementOperations,
			...storyManagementFields,
		],
	};

	methods = {
		loadOptions: {
			async getSpaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { spaces } = await storyblokApiRequest.call(this, 'GET', '/v1/spaces');
				for (const space of spaces) {
					returnData.push({
						name: space.name,
						value: space.id,
					});
				}
				return returnData;
			},
			async getComponents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const space = this.getCurrentNodeParameter('space') as string;
				const { components } = await storyblokApiRequest.call(
					this,
					'GET',
					`/v1/spaces/${space}/components`,
				);
				for (const component of components) {
					returnData.push({
						name: `${component.name} ${component.is_root ? '(root)' : ''}`,
						value: component.name,
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
		const qs: IDataObject = {};
		let responseData;
		const source = this.getNodeParameter('source', 0) as string;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (source === 'contentApi') {
					if (resource === 'story') {
						if (operation === 'get') {
							const identifier = this.getNodeParameter('identifier', i) as string;

							responseData = await storyblokApiRequest.call(
								this,
								'GET',
								`/v1/cdn/stories/${identifier}`,
							);
							responseData = responseData.story;
						}
						if (operation === 'getAll') {
							const filters = this.getNodeParameter('filters', i);
							const returnAll = this.getNodeParameter('returnAll', i);
							Object.assign(qs, filters);

							if (returnAll) {
								responseData = await storyblokApiRequestAllItems.call(
									this,
									'stories',
									'GET',
									'/v1/cdn/stories',
									{},
									qs,
								);
							} else {
								const limit = this.getNodeParameter('limit', i);
								qs.per_page = limit;
								responseData = await storyblokApiRequest.call(
									this,
									'GET',
									'/v1/cdn/stories',
									{},
									qs,
								);
								responseData = responseData.stories;
							}
						}
					}
				}
				if (source === 'managementApi') {
					if (resource === 'story') {
						// if (operation === 'create') {
						// 	const space = this.getNodeParameter('space', i) as string;
						// 	const name = this.getNodeParameter('name', i) as string;
						// 	const slug = this.getNodeParameter('slug', i) as string;
						// 	const jsonParameters = this.getNodeParameter('jsonParameters', i);
						// 	const additionalFields = this.getNodeParameter('additionalFields', i);
						// 	const body: IDataObject = {
						// 		name,
						// 		slug,
						// 	};

						// 	if (jsonParameters) {
						// 		if (additionalFields.contentJson) {
						// 			const json = validateJSON(additionalFields.contentJson as string);
						// 			body.content = json;
						// 		}
						// 	} else {
						// 		if (additionalFields.contentUi) {
						// 			const contentValue = (additionalFields.contentUi as IDataObject).contentValue as IDataObject;
						// 			const content: { component: string, body: IDataObject[] } = { component: '', body: [] };
						// 			if (contentValue) {
						// 				content.component = contentValue.component as string;
						// 				const elementValues = (contentValue.elementUi as IDataObject).elementValues as IDataObject[];
						// 				for (const elementValue of elementValues) {
						// 					const body: IDataObject = {};
						// 					body._uid = uuidv4();
						// 					body.component = elementValue.component;
						// 					if (elementValue.dataUi) {
						// 						const dataValues = (elementValue.dataUi as IDataObject).dataValues as IDataObject[];
						// 						for (const dataValue of dataValues) {
						// 							body[dataValue.key as string] = dataValue.value;
						// 						}
						// 					}
						// 					content.body.push(body);
						// 				}
						// 			}
						// 			body.content = content;
						// 		}
						// 	}

						// 	if (additionalFields.parentId) {
						// 		body.parent_id = additionalFields.parentId as string;
						// 	}
						// 	if (additionalFields.path) {
						// 		body.path = additionalFields.path as string;
						// 	}
						// 	if (additionalFields.isStartpage) {
						// 		body.is_startpage = additionalFields.isStartpage as string;
						// 	}
						// 	if (additionalFields.firstPublishedAt) {
						// 		body.first_published_at = additionalFields.firstPublishedAt as string;
						// 	}

						// 	responseData = await storyblokApiRequest.call(this, 'POST', `/v1/spaces/${space}/stories`, { story: body });
						// 	responseData = responseData.story;
						// }
						if (operation === 'delete') {
							const space = this.getNodeParameter('space', i) as string;
							const storyId = this.getNodeParameter('storyId', i) as string;

							responseData = await storyblokApiRequest.call(
								this,
								'DELETE',
								`/v1/spaces/${space}/stories/${storyId}`,
							);
							responseData = responseData.story;
						}
						if (operation === 'get') {
							const space = this.getNodeParameter('space', i) as string;
							const storyId = this.getNodeParameter('storyId', i) as string;

							responseData = await storyblokApiRequest.call(
								this,
								'GET',
								`/v1/spaces/${space}/stories/${storyId}`,
							);
							responseData = responseData.story;
						}
						if (operation === 'getAll') {
							const space = this.getNodeParameter('space', i) as string;
							const filters = this.getNodeParameter('filters', i);
							const returnAll = this.getNodeParameter('returnAll', i);
							Object.assign(qs, filters);

							if (returnAll) {
								responseData = await storyblokApiRequestAllItems.call(
									this,
									'stories',
									'GET',
									`/v1/spaces/${space}/stories`,
									{},
									qs,
								);
							} else {
								const limit = this.getNodeParameter('limit', i);
								qs.per_page = limit;
								responseData = await storyblokApiRequest.call(
									this,
									'GET',
									`/v1/spaces/${space}/stories`,
									{},
									qs,
								);
								responseData = responseData.stories;
							}
						}
						if (operation === 'publish') {
							const space = this.getNodeParameter('space', i) as string;
							const storyId = this.getNodeParameter('storyId', i) as string;
							const options = this.getNodeParameter('options', i);
							const query: IDataObject = {};
							// Not sure if these two options work
							if (options.releaseId) {
								query.release_id = options.releaseId as string;
							}
							if (options.language) {
								query.lang = options.language as string;
							}

							responseData = await storyblokApiRequest.call(
								this,
								'GET',
								`/v1/spaces/${space}/stories/${storyId}/publish`,
								{},
								query,
							);
							responseData = responseData.story;
						}
						if (operation === 'unpublish') {
							const space = this.getNodeParameter('space', i) as string;
							const storyId = this.getNodeParameter('storyId', i) as string;

							responseData = await storyblokApiRequest.call(
								this,
								'GET',
								`/v1/spaces/${space}/stories/${storyId}/unpublish`,
							);
							responseData = responseData.story;
						}
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
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
