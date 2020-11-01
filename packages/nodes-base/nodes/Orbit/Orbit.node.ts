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
	orbitApiRequest,
	orbitApiRequestAllItems,
} from './GenericFunctions';

import {
	activityFields,
	activityOperations,
} from './ActivityDescription';

import {
	memberFields,
	memberOperations,
} from './MemberDescription';

import {
	noteFields,
	noteOperations,
} from './NoteDescription';

import {
	postFields,
	postOperations,
} from './PostDescription';

export class Orbit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Orbit',
		name: 'orbit',
		icon: 'file:orbit.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Orbit API',
		defaults: {
			name: 'Orbit',
			color: '#775af6',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'orbitApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Activity',
						value: 'activity',
					},
					{
						name: 'Member',
						value: 'member',
					},
					{
						name: 'Note',
						value: 'note',
					},
					{
						name: 'Post',
						value: 'post',
					},
				],
				default: 'member',
				description: 'Resource to consume.',
			},
			// ACTIVITY
			...activityOperations,
			...activityFields,
			// MEMBER
			...memberOperations,
			...memberFields,
			// NOTE
			...noteOperations,
			...noteFields,
			// POST
			...postOperations,
			...postFields,
		],
	};

	methods = {
		loadOptions: {
			async getWorkspaces(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaces = await orbitApiRequest.call(
					this,
					'GET',
					'/workspaces',
				);		
				for (const workspace of workspaces.data) {
					returnData.push({
						name: workspace.attributes.name,
						value: workspace.id,
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
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'activity') {
				if (operation === 'create') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const title = this.getNodeParameter('title', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						title: title,
					};
					if (additionalFields.description) {
						body.description = additionalFields.description as string;
					}
					if (additionalFields.link) {
						body.link = additionalFields.link as string;
					}
					if (additionalFields.linkText) {
						body.link_text = additionalFields.linkText as string;
					}
					if (additionalFields.score) {
						body.score = additionalFields.score as number;
					}
					if (additionalFields.activityType) {
						body.activity_type = additionalFields.activityType as string;
					}
					if (additionalFields.key) {
						body.key = additionalFields.key as string;
					}
					if (additionalFields.occurredAt) {
						body.occurred_at = additionalFields.occurredAt as string;
					}

					responseData = await orbitApiRequest.call(this, 'POST', `/${workspaceId}/members/${memberId}/activities`, body);
				}
				if (operation === 'get') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;

					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/members/${memberId}/activities`);
				}
				if (operation === 'getAll') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;

					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/activities`);
				}
			}
			if (resource === 'member') {
				if (operation === 'delete') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					responseData = await orbitApiRequest.call(this, 'DELETE', `/${workspaceId}/members/${memberId}`);
				}
				if (operation === 'get') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/members/${memberId}`);
				}
				if (operation === 'getAll') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/members`);
				}
				if (operation === 'lookup') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const githubUsername = this.getNodeParameter('githubUsername', i) as string;
					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/github_user/${githubUsername}`);
				}
				if (operation === 'update') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
					};
					if (additionalFields.bio) {
						body.bio = additionalFields.bio as string;
					}
					if (additionalFields.birthday) {
						// This isn't functioning at the moment
						body.birthday = additionalFields.birthday as string;
					}
					if (additionalFields.company) {
						body.company = additionalFields.company as string;
					}
					if (additionalFields.devTo) {
						body.devto = additionalFields.devTo as string;
					}
					if (additionalFields.linkedin) {
						body.linkedin = additionalFields.linkedin as string;
					}
					if (additionalFields.location) {
						body.location = additionalFields.location as string;
					}
					if (additionalFields.name) {
						body.name = additionalFields.name as string;
					}
					if (additionalFields.orbitLevel) {
						// This isn't functioning at the moment
						body.orbit_level = additionalFields.orbitLevel as number;
					}
					if (additionalFields.bio) {
						body.bio = additionalFields.bio as string;
					}
					if (additionalFields.pronouns) {
						body.pronouns = additionalFields.pronouns as string;
					}
					if (additionalFields.shippingAddress) {
						body.shipping_address = additionalFields.shippingAddress as string;
					}
					if (additionalFields.slug) {
						body.slug = additionalFields.slug as string;
					}
					if (additionalFields.tagsToAdd) {
						body.tags_to_add = additionalFields.tagsToAdd as string;
					}
					if (additionalFields.tagList) {
						body.tag_list = additionalFields.tagList as string;
					}
					if (additionalFields.tshirt) {
						body.tshirt = additionalFields.tshirt as string;
					}
					if (additionalFields.teammate) {
						// This is partially functioning at the moment
						body.teammate = additionalFields.teammate as boolean;
					}
					if (additionalFields.url) {
						body.url = additionalFields.url as string;
					}

					responseData = await orbitApiRequest.call(this, 'PUT', `/${workspaceId}/members/${memberId}`, body);
				}
			}
			if (resource === 'note') {
				if (operation === 'create') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const note = this.getNodeParameter('note', i) as string;

					responseData = await orbitApiRequest.call(this, 'POST', `/${workspaceId}/members/${memberId}/notes`, {body: note});
				}
				if (operation === 'get') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;

					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/members/${memberId}/notes`);
				}
				if (operation === 'update') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const noteId = this.getNodeParameter('noteId', i) as string;
					const note = this.getNodeParameter('note', i) as string;

					responseData = await orbitApiRequest.call(this, 'PUT', `/${workspaceId}/members/${memberId}/notes/${noteId}`, {body: note});
				}
			}
			if (resource === 'post') {
				if (operation === 'create') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const url = this.getNodeParameter('url', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						url: url,
					};
					if (additionalFields.publishedAt) {
						body.published_at = additionalFields.publishedAt as string;
					}

					responseData = await orbitApiRequest.call(this, 'POST', `/${workspaceId}/members/${memberId}/posts`, body);
				}
				if (operation === 'get') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;

					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/members/${memberId}/posts`);
				}
				if (operation === 'getAll') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;

					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/posts`);
				}
				if (operation === 'delete') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const postId = this.getNodeParameter('postId', i) as string;

					responseData = await orbitApiRequest.call(this, 'DELETE', `/${workspaceId}/members/${memberId}/posts/${postId}`);
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
