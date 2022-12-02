import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { orbitApiRequest, orbitApiRequestAllItems, resolveIdentities } from './GenericFunctions';

import { activityFields, activityOperations } from './ActivityDescription';

import { memberFields, memberOperations } from './MemberDescription';

import { noteFields, noteOperations } from './NoteDescription';

import { postFields, postOperations } from './PostDescription';

import moment from 'moment';

export class Orbit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Orbit',
		name: 'orbit',
		icon: 'file:orbit.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Orbit API',
		defaults: {
			name: 'Orbit',
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
				noDataExpression: true,
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
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaces = await orbitApiRequest.call(this, 'GET', '/workspaces');
				for (const workspace of workspaces.data) {
					returnData.push({
						name: workspace.attributes.name,
						value: workspace.attributes.slug,
					});
				}
				return returnData;
			},
			async getActivityTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await orbitApiRequest.call(this, 'GET', '/activity_types');
				for (const activityType of data) {
					returnData.push({
						name: activityType.attributes.short_name,
						value: activityType.id,
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
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'activity') {
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const memberId = this.getNodeParameter('memberId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
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
						if (additionalFields.activityType) {
							body.activity_type = additionalFields.activityType as string;
						}
						if (additionalFields.key) {
							body.key = additionalFields.key as string;
						}
						if (additionalFields.occurredAt) {
							body.occurred_at = additionalFields.occurredAt as string;
						}

						responseData = await orbitApiRequest.call(
							this,
							'POST',
							`/${workspaceId}/members/${memberId}/activities`,
							body,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						let endpoint = `/${workspaceId}/activities`;
						if (filters.memberId) {
							endpoint = `/${workspaceId}/members/${filters.memberId}/activities`;
						}
						if (returnAll === true) {
							responseData = await orbitApiRequestAllItems.call(
								this,
								'data',
								'GET',
								endpoint,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await orbitApiRequestAllItems.call(
								this,
								'data',
								'GET',
								endpoint,
								{},
								qs,
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
				}
				if (resource === 'member') {
					if (operation === 'upsert') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const member: IDataObject = {};
						const identity: IDataObject = {};
						if (additionalFields.bio) {
							member.bio = additionalFields.bio as string;
						}
						if (additionalFields.birthday) {
							member.birthday = moment(additionalFields.birthday as string).format('MM-DD-YYYY');
						}
						if (additionalFields.company) {
							member.company = additionalFields.company as string;
						}
						if (additionalFields.location) {
							member.location = additionalFields.location as string;
						}
						if (additionalFields.name) {
							member.name = additionalFields.name as string;
						}
						if (additionalFields.bio) {
							member.bio = additionalFields.bio as string;
						}
						if (additionalFields.pronouns) {
							member.pronouns = additionalFields.pronouns as string;
						}
						if (additionalFields.shippingAddress) {
							member.shipping_address = additionalFields.shippingAddress as string;
						}
						if (additionalFields.slug) {
							member.slug = additionalFields.slug as string;
						}
						if (additionalFields.tagsToAdd) {
							member.tags_to_add = additionalFields.tagsToAdd as string;
						}
						if (additionalFields.tagList) {
							member.tag_list = additionalFields.tagList as string;
						}
						if (additionalFields.tshirt) {
							member.tshirt = additionalFields.tshirt as string;
						}
						if (additionalFields.hasOwnProperty('teammate')) {
							member.teammate = additionalFields.teammate as boolean;
						}
						if (additionalFields.url) {
							member.url = additionalFields.url as string;
						}

						const data = (this.getNodeParameter('identityUi', i) as IDataObject)
							.identityValue as IDataObject;
						if (data) {
							if (['github', 'twitter', 'discourse'].includes(data.source as string)) {
								identity.source = data.source as string;
								const searchBy = data.searchBy as string;
								if (searchBy === 'id') {
									identity.uid = data.id as string;
								} else {
									identity.username = data.username as string;
								}
								if (data.source === 'discourse') {
									identity.source_host = data.host as string;
								}
							} else {
								//it's email
								identity.email = data.email as string;
							}
						}

						responseData = await orbitApiRequest.call(this, 'POST', `/${workspaceId}/members`, {
							member,
							identity,
						});
						responseData = responseData.data;
					}
					if (operation === 'delete') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const memberId = this.getNodeParameter('memberId', i) as string;
						responseData = await orbitApiRequest.call(
							this,
							'DELETE',
							`/${workspaceId}/members/${memberId}`,
						);
						responseData = { success: true };
					}
					if (operation === 'get') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const memberId = this.getNodeParameter('memberId', i) as string;
						const resolve = this.getNodeParameter('resolveIdentities', 0) as boolean;
						responseData = await orbitApiRequest.call(
							this,
							'GET',
							`/${workspaceId}/members/${memberId}`,
						);
						if (resolve === true) {
							resolveIdentities(responseData);
						}
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', 0);
						const options = this.getNodeParameter('options', i);
						Object.assign(qs, options);
						qs.resolveIdentities = this.getNodeParameter('resolveIdentities', 0) as boolean;
						if (returnAll === true) {
							responseData = await orbitApiRequestAllItems.call(
								this,
								'data',
								'GET',
								`/${workspaceId}/members`,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await orbitApiRequestAllItems.call(
								this,
								'data',
								'GET',
								`/${workspaceId}/members`,
								{},
								qs,
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
					if (operation === 'lookup') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const source = this.getNodeParameter('source', i) as string;

						if (['github', 'twitter', 'discourse'].includes(source)) {
							qs.source = this.getNodeParameter('source', i) as string;
							const searchBy = this.getNodeParameter('searchBy', i) as string;
							if (searchBy === 'id') {
								qs.uid = this.getNodeParameter('id', i) as string;
							} else {
								qs.username = this.getNodeParameter('username', i) as string;
							}
							if (source === 'discourse') {
								qs.source_host = this.getNodeParameter('host', i) as string;
							}
						} else {
							//it's email
							qs.email = this.getNodeParameter('email', i) as string;
						}

						responseData = await orbitApiRequest.call(
							this,
							'GET',
							`/${workspaceId}/members/find`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const memberId = this.getNodeParameter('memberId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						if (updateFields.bio) {
							body.bio = updateFields.bio as string;
						}
						if (updateFields.birthday) {
							body.birthday = moment(updateFields.birthday as string).format('MM-DD-YYYY');
						}
						if (updateFields.company) {
							body.company = updateFields.company as string;
						}
						if (updateFields.location) {
							body.location = updateFields.location as string;
						}
						if (updateFields.name) {
							body.name = updateFields.name as string;
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

						responseData = await orbitApiRequest.call(
							this,
							'PUT',
							`/${workspaceId}/members/${memberId}`,
							body,
						);
						responseData = { success: true };
					}
				}
				if (resource === 'note') {
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const memberId = this.getNodeParameter('memberId', i) as string;
						const note = this.getNodeParameter('note', i) as string;

						responseData = await orbitApiRequest.call(
							this,
							'POST',
							`/${workspaceId}/members/${memberId}/notes`,
							{ body: note },
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const memberId = this.getNodeParameter('memberId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						qs.resolveMember = this.getNodeParameter('resolveMember', 0) as boolean;
						if (returnAll === true) {
							responseData = await orbitApiRequestAllItems.call(
								this,
								'data',
								'GET',
								`/${workspaceId}/members/${memberId}/notes`,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await orbitApiRequestAllItems.call(
								this,
								'data',
								'GET',
								`/${workspaceId}/members/${memberId}/notes`,
								{},
								qs,
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
					if (operation === 'update') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const memberId = this.getNodeParameter('memberId', i) as string;
						const noteId = this.getNodeParameter('noteId', i) as string;
						const note = this.getNodeParameter('note', i) as string;

						responseData = await orbitApiRequest.call(
							this,
							'PUT',
							`/${workspaceId}/members/${memberId}/notes/${noteId}`,
							{ body: note },
						);
						responseData = { success: true };
					}
				}
				if (resource === 'post') {
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const memberId = this.getNodeParameter('memberId', i) as string;
						const url = this.getNodeParameter('url', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {
							type: 'post',
							activity_type: 'post',
							url,
						};
						if (additionalFields.publishedAt) {
							body.occurred_at = additionalFields.publishedAt as string;
							delete body.publishedAt;
						}

						responseData = await orbitApiRequest.call(
							this,
							'POST',
							`/${workspaceId}/members/${memberId}/activities/`,
							body,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						let endpoint = `/${workspaceId}/activities`;
						qs.type = 'content';
						if (filters.memberId) {
							endpoint = `/${workspaceId}/members/${filters.memberId}/activities`;
						}
						if (returnAll === true) {
							responseData = await orbitApiRequestAllItems.call(
								this,
								'data',
								'GET',
								endpoint,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', 0);
							responseData = await orbitApiRequestAllItems.call(
								this,
								'data',
								'GET',
								endpoint,
								{},
								qs,
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
					if (operation === 'delete') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;
						const memberId = this.getNodeParameter('memberId', i) as string;
						const postId = this.getNodeParameter('postId', i) as string;

						responseData = await orbitApiRequest.call(
							this,
							'DELETE',
							`/${workspaceId}/members/${memberId}/activities/${postId}`,
						);
						responseData = { success: true };
					}
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
