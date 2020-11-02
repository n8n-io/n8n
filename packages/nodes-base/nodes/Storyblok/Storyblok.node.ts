import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	storyblokApiRequest,
} from './GenericFunctions';

import {
	storyContentFields,
	storyContentOperations,
} from './StoryContentDescription';

import {
	storyManagementFields,
	storyManagementOperations,
} from './StoryManagementDescription';

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
			color: '#775af6',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'storyblokContentApi',
				required: true,
				displayOptions: {
					show: {
						source: [
							'contentApi',
						],
					},
				},
			},
			{
				name: 'storyblokManagementApi',
				required: true,
				displayOptions: {
					show: {
						source: [
							'managementApi',
						],
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
						value: 'contentApi'
					},
					{
						name: 'Management API',
						value: 'managementApi'
					},
				],
			},
			// Resources: Content API
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Story',
						value: 'story',
					},
				],
				default: 'member',
				description: 'Resource to consume.',
				displayOptions: {
					show: {
						source: [
							'contentApi',
						],
					},
				},
			},
			// Resources: Management API
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Story',
						value: 'story',
					},
				],
				default: 'member',
				description: 'Resource to consume.',
				displayOptions: {
					show: {
						source: [
							'managementApi',
						],
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
			async getSpaces(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { spaces } = await storyblokApiRequest.call(
					this,
					'GET',
					'/v1/spaces',
				);
				for (const space of spaces) {
					returnData.push({
						name: space.name,
						value: space.id,
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
		const qs: IDataObject = {};
		let responseData;
		const source = this.getNodeParameter('source', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (source === 'contentApi') {
				if (resource === 'story') {
					if (operation === 'get') {
						const slug = this.getNodeParameter('slug', i) as string;

						responseData = await storyblokApiRequest.call(this, 'GET', `/v1/cdn/stories/posts/${slug}`);
						responseData = responseData.story;
					}
					if (operation === 'getAll') {
						const startsWith = this.getNodeParameter('startsWith', i) as string;

						// This doesnt work, cause I am not sending token properly maybe

						responseData = await storyblokApiRequest.call(this, 'GET', `/v1/cdn/stories?starts_with=${startsWith}/`);
						responseData = responseData.stories;
					}
				}
			}
			if (source === 'managementApi') {
				if (resource === 'story') {
					if (operation === 'create') {
						const space = this.getNodeParameter('space', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const slug = this.getNodeParameter('slug', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {
							name,
							slug,
						};
						if (additionalFields.content) {
							// This doesnt work
							body.content = additionalFields.content as string;
						}
						if (additionalFields.parentId) {
							body.parent_id = additionalFields.parentId as string;
						}
						if (additionalFields.path) {
							body.path = additionalFields.path as string;
						}
						if (additionalFields.isStartpage) {
							body.is_startpage = additionalFields.isStartpage as string;
						}
						if (additionalFields.firstPublishedAt) {
							body.first_published_at = additionalFields.firstPublishedAt as string;
						}

						responseData = await storyblokApiRequest.call(this, 'POST', `/v1/spaces/${space}/stories`, { story: body });
						responseData = responseData.story;
					}
					if (operation === 'delete') {
						const space = this.getNodeParameter('space', i) as string;
						const storyId = this.getNodeParameter('storyId', i) as string;

						responseData = await storyblokApiRequest.call(this, 'DELETE', `/v1/spaces/${space}/stories/${storyId}`);
						responseData = responseData.story;
					}
					if (operation === 'get') {
						const space = this.getNodeParameter('space', i) as string;
						const storyId = this.getNodeParameter('storyId', i) as string;

						responseData = await storyblokApiRequest.call(this, 'GET', `/v1/spaces/${space}/stories/${storyId}`);
						responseData = responseData.story;
					}
					if (operation === 'getAll') {
						const space = this.getNodeParameter('space', i) as string;

						responseData = await storyblokApiRequest.call(this, 'GET', `/v1/spaces/${space}/stories/`);
						responseData = responseData.stories;
					}
					if (operation === 'publish') {
						const space = this.getNodeParameter('space', i) as string;
						const storyId = this.getNodeParameter('storyId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const query: IDataObject = {};
						// Not sure if these two options work
						if (options.releaseId) {
							query.release_id = options.releaseId as string;
						}
						if (options.language) {
							query.lang = options.language as string;
						}

						responseData = await storyblokApiRequest.call(this, 'GET', `/v1/spaces/${space}/stories/${storyId}/publish`, {}, query);
						responseData = responseData.story;
					}
					if (operation === 'unpublish') {
						const space = this.getNodeParameter('space', i) as string;
						const storyId = this.getNodeParameter('storyId', i) as string;

						responseData = await storyblokApiRequest.call(this, 'GET', `/v1/spaces/${space}/stories/${storyId}/unpublish`);
						responseData = responseData.story;
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
