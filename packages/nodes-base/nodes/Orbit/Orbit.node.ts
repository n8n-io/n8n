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
	resolveIdentities,
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

import * as moment from 'moment';

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
						title,
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
					responseData = responseData.data;
				}
				if (operation === 'getAll') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					let endpoint = `/${workspaceId}/activities`;
					if (filters.memberId) {
						endpoint = `/${workspaceId}/members/${filters.memberId}/activities`;
					}
					if (returnAll === true) {
						responseData = await orbitApiRequestAllItems.call(this, 'data', 'GET', endpoint, {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', 0) as boolean;
						responseData = await orbitApiRequestAllItems.call(this, 'data', 'GET', endpoint, {}, qs);
						responseData = responseData.splice(0, qs.limit);
					}
				}
			}
			if (resource === 'member') {
				if (operation === 'delete') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					responseData = await orbitApiRequest.call(this, 'DELETE', `/${workspaceId}/members/${memberId}`);
					responseData = { success: true };
				}
				if (operation === 'get') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const resolve = this.getNodeParameter('resolveIdentities', 0) as boolean;
					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/members/${memberId}`);
					if (resolve === true) {
						resolveIdentities(responseData);
					} 
					responseData = responseData.data;
				}
				if (operation === 'getAll') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					Object.assign(qs, options);
					qs.resolveIdentities = this.getNodeParameter('resolveIdentities', 0) as boolean;
					if (returnAll === true) {
						responseData = await orbitApiRequestAllItems.call(this, 'data', 'GET', `/${workspaceId}/members`, {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', 0) as boolean;
						responseData = await orbitApiRequestAllItems.call(this, 'data', 'GET', `/${workspaceId}/members`, {}, qs);
						responseData = responseData.splice(0, qs.limit);
					}
				}
				if (operation === 'lookup') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const githubUsername = this.getNodeParameter('githubUsername', i) as string;
					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/github_user/${githubUsername}`);
					responseData = responseData.data;
				}
				if (operation === 'update') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: IDataObject = {
					};
					if (updateFields.bio) {
						body.bio = updateFields.bio as string;
					}
					if (updateFields.birthday) {
						body.birthday = moment(updateFields.birthday as string).format('MM-DD-YYYY');
					}
					if (updateFields.company) {
						body.company = updateFields.company as string;
					}
					if (updateFields.devTo) {
						body.devto = updateFields.devTo as string;
					}
					if (updateFields.linkedin) {
						body.linkedin = updateFields.linkedin as string;
					}
					if (updateFields.location) {
						body.location = updateFields.location as string;
					}
					if (updateFields.name) {
						body.name = updateFields.name as string;
					}
					if (updateFields.hasOwnProperty('orbitLevel')) {
						body.orbit_level = updateFields.orbitLevel as number;
					}
					if (updateFields.bio) {
						body.bio = updateFields.bio as string;
					}
					if (updateFields.pronouns) {
						body.pronouns = updateFields.pronouns as string;
					}
					if (updateFields.shippingAddress) {
						body.shipping_address = updateFields.shippingAddress as string;
					}
					if (updateFields.slug) {
						body.slug = updateFields.slug as string;
					}
					if (updateFields.tagsToAdd) {
						body.tags_to_add = updateFields.tagsToAdd as string;
					}
					if (updateFields.tagList) {
						body.tag_list = updateFields.tagList as string;
					}
					if (updateFields.tshirt) {
						body.tshirt = updateFields.tshirt as string;
					}
					if (updateFields.hasOwnProperty('teammate')) {
						body.teammate = updateFields.teammate as boolean;
					}
					if (updateFields.url) {
						body.url = updateFields.url as string;
					}

					responseData = await orbitApiRequest.call(this, 'PUT', `/${workspaceId}/members/${memberId}`, body);
					responseData = { success: true };
				}
			}
			if (resource === 'note') {
				if (operation === 'create') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const note = this.getNodeParameter('note', i) as string;

					responseData = await orbitApiRequest.call(this, 'POST', `/${workspaceId}/members/${memberId}/notes`, {body: note});
					responseData = responseData.data;
				}
				if (operation === 'getAll') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					qs.resolveMember = this.getNodeParameter('resolveMember', 0) as boolean;
					if (returnAll === true) {
						responseData = await orbitApiRequestAllItems.call(this, 'data', 'GET', `/${workspaceId}/members/${memberId}/notes`, {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', 0) as boolean;
						responseData = await orbitApiRequestAllItems.call(this, 'data', 'GET', `/${workspaceId}/members/${memberId}/notes`, {}, qs);
						responseData = responseData.splice(0, qs.limit);
					}
				}
				if (operation === 'update') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const noteId = this.getNodeParameter('noteId', i) as string;
					const note = this.getNodeParameter('note', i) as string;

					responseData = await orbitApiRequest.call(this, 'PUT', `/${workspaceId}/members/${memberId}/notes/${noteId}`, {body: note});
					responseData = { success: true };
				}
			}
			if (resource === 'post') {
				if (operation === 'create') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const url = this.getNodeParameter('url', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IDataObject = {
						url,
					};
					if (additionalFields.publishedAt) {
						body.published_at = additionalFields.publishedAt as string;
					}

					responseData = await orbitApiRequest.call(this, 'POST', `/${workspaceId}/members/${memberId}/posts`, body);
					responseData = responseData.data;
				}
				if (operation === 'getAll') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					let endpoint = `/${workspaceId}/posts`;
					if (filters.memberId) {
						endpoint = `/${workspaceId}/members/${filters.memberId}/posts`;
					}
					if (returnAll === true) {
						responseData = await orbitApiRequestAllItems.call(this, 'data', 'GET', endpoint, {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', 0) as boolean;
						responseData = await orbitApiRequestAllItems.call(this, 'data', 'GET', endpoint, {}, qs);
						responseData = responseData.splice(0, qs.limit);
					}
				}
				if (operation === 'delete') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					const postId = this.getNodeParameter('postId', i) as string;

					responseData = await orbitApiRequest.call(this, 'DELETE', `/${workspaceId}/members/${memberId}/posts/${postId}`);
					responseData = { success: true };
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
