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
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'activity',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an activity for a member',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get activities for a member',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'member',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a member',
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'note',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a note',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get notes for a member',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a note',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'post',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a post',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get posts for a member',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a note',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Workspace',
				name: 'workspaceId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
							'delete',
							'get',
							'update',
						],
						resource: [
							'activity',
							'member',
							'note',
							'post',
						],
					},
				},
				description: 'The workspace',
			},
			{
				displayName: 'Member ID',
				name: 'memberId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
							'delete',
							'get',
							'update',
						],
						resource: [
							'activity',
							'member',
							'note',
							'post',
						],
					},
				},
				description: 'Member ID',
			},
			{
				displayName: 'Note ID',
				name: 'noteId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'note',
						],
					},
				},
				description: 'Note ID',
			},
			{
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'post',
						],
					},
				},
				description: 'Post ID',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
							'update',
						],
						resource: [
							'note',
						],
					},
				},
				description: 'Note',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'post',
						],
					},
				},
				description: 'Post',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'activity',
						],
					},
				},
				description: 'Title',
			},
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

					responseData = await orbitApiRequest.call(this, 'POST', `/${workspaceId}/members/${memberId}/activities`, {title: title});
				}
				if (operation === 'get') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;

					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/members/${memberId}/activities`);
				}
			}
			if (resource === 'member') {
				if (operation === 'get') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;
					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/members/${memberId}`);
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

					responseData = await orbitApiRequest.call(this, 'POST', `/${workspaceId}/members/${memberId}/posts`, {url: url});
				}
				if (operation === 'get') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const memberId = this.getNodeParameter('memberId', i) as string;

					responseData = await orbitApiRequest.call(this, 'GET', `/${workspaceId}/members/${memberId}/posts`);
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
