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
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from './GenericFunctions';

import {
	channelFields,
	channelOperations,
} from './ChannelDescription';

import {
	channelMessageFields,
	channelMessageOperations,
} from './ChannelMessageDescription';

import {
	taskFields,
	taskOperations,
} from './TaskDescription';

export class MicrosoftTeams implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Teams',
		name: 'microsoftTeams',
		icon: 'file:teams.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Microsoft Teams API',
		defaults: {
			name: 'Microsoft Teams',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftTeamsOAuth2Api',
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
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Channel Message (Beta)',
						value: 'channelMessage',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: 'channel',
				description: 'The resource to operate on.',
			},
			// CHANNEL
			...channelOperations,
			...channelFields,
			/// MESSAGE
			...channelMessageOperations,
			...channelMessageFields,
			///TASK
			...taskOperations,
			...taskFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the team's channels to display them to user so that he can
			// select them easily
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const teamId = this.getCurrentNodeParameter('teamId') as string;
				const { value } = await microsoftApiRequest.call(this, 'GET', `/v1.0/teams/${teamId}/channels`);
				for (const channel of value) {
					const channelName = channel.displayName;
					const channelId = channel.id;
					returnData.push({
						name: channelName,
						value: channelId,
					});
				}
				return returnData;
			},
			// Get all the teams to display them to user so that he can
			// select them easily
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { value } = await microsoftApiRequest.call(this, 'GET', '/v1.0/me/joinedTeams');
				for (const team of value) {
					const teamName = team.displayName;
					const teamId = team.id;
					returnData.push({
						name: teamName,
						value: teamId,
					});
				}
				return returnData;
			},
			// Get all the groups to display them to user so that he can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { value } = await microsoftApiRequest.call(this, 'GET', '/v1.0/groups');
				for (const group of value) {
					returnData.push({
						name: group.mail,
						value: group.id,
					});
				}
				return returnData;
			},
			// Get all the plans to display them to user so that he can
			// select them easily
			async getPlans(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const groupId = this.getCurrentNodeParameter('groupId') as string;
				const { value } = await microsoftApiRequest.call(this, 'GET', `/v1.0/groups/${groupId}/planner/plans`);
				for (const plan of value) {
					returnData.push({
						name: plan.title,
						value: plan.id,
					});
				}
				return returnData;
			},
			// Get all the plans to display them to user so that he can
			// select them easily
			async getBuckets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const planId = this.getCurrentNodeParameter('planId') as string;
				const { value } = await microsoftApiRequest.call(this, 'GET', `/v1.0/planner/plans/${planId}/buckets`);
				for (const bucket of value) {
					returnData.push({
						name: bucket.name,
						value: bucket.id,
					});
				}
				return returnData;
			},
			// Get all the plans to display them to user so that he can
			// select them easily
			async getMembers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const groupId = this.getCurrentNodeParameter('groupId') as string;
				const { value } = await microsoftApiRequest.call(this, 'GET', `/v1.0/groups/${groupId}/members`);
				for (const member of value) {
					returnData.push({
						name: member.displayName,
						value: member.id,
					});
				}
				return returnData;
			},
			// Get all the labels to display them to user so that he can
			// select them easily
			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const planId = this.getCurrentNodeParameter('planId') as string;
				const { categoryDescriptions } = await microsoftApiRequest.call(this, 'GET', `/v1.0/planner/plans/${planId}/details`);
				for (const key of Object.keys(categoryDescriptions)) {
					if (categoryDescriptions[key] !== null) {
						returnData.push({
							name: categoryDescriptions[key],
							value: key,
						});
					}
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
			try {
				if (resource === 'channel') {
					//https://docs.microsoft.com/en-us/graph/api/channel-post?view=graph-rest-beta&tabs=http
					if (operation === 'create') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						const body: IDataObject = {
							displayName: name,
						};
						if (options.description) {
							body.description = options.description as string;
						}
						if (options.type) {
							body.membershipType = options.type as string;
						}
						responseData = await microsoftApiRequest.call(this, 'POST', `/v1.0/teams/${teamId}/channels`, body);
					}
					//https://docs.microsoft.com/en-us/graph/api/channel-delete?view=graph-rest-beta&tabs=http
					if (operation === 'delete') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const channelId = this.getNodeParameter('channelId', i) as string;
						responseData = await microsoftApiRequest.call(this, 'DELETE', `/v1.0/teams/${teamId}/channels/${channelId}`);
						responseData = { success: true };
					}
					//https://docs.microsoft.com/en-us/graph/api/channel-get?view=graph-rest-beta&tabs=http
					if (operation === 'get') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const channelId = this.getNodeParameter('channelId', i) as string;
						responseData = await microsoftApiRequest.call(this, 'GET', `/v1.0/teams/${teamId}/channels/${channelId}`);
					}
					//https://docs.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-beta&tabs=http
					if (operation === 'getAll') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/v1.0/teams/${teamId}/channels`);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/v1.0/teams/${teamId}/channels`, {});
							responseData = responseData.splice(0, qs.limit);
						}
					}
					//https://docs.microsoft.com/en-us/graph/api/channel-patch?view=graph-rest-beta&tabs=http
					if (operation === 'update') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const channelId = this.getNodeParameter('channelId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {};
						if (updateFields.name) {
							body.displayName = updateFields.name as string;
						}
						if (updateFields.description) {
							body.description = updateFields.description as string;
						}
						responseData = await microsoftApiRequest.call(this, 'PATCH', `/v1.0/teams/${teamId}/channels/${channelId}`, body);
						responseData = { success: true };
					}
				}
				if (resource === 'channelMessage') {
					//https://docs.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-beta&tabs=http
					//https://docs.microsoft.com/en-us/graph/api/channel-post-messagereply?view=graph-rest-beta&tabs=http
					if (operation === 'create') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const channelId = this.getNodeParameter('channelId', i) as string;
						const messageType = this.getNodeParameter('messageType', i) as string;
						const message = this.getNodeParameter('message', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						const body: IDataObject = {
							body: {
								contentType: messageType,
								content: message,
							},
						};

						if (options.makeReply) {
							const replyToId = options.makeReply as string;
							responseData = await microsoftApiRequest.call(this, 'POST', `/beta/teams/${teamId}/channels/${channelId}/messages/${replyToId}/replies`, body);
						} else {
							responseData = await microsoftApiRequest.call(this, 'POST', `/beta/teams/${teamId}/channels/${channelId}/messages`, body);
						}
					}
					//https://docs.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-beta&tabs=http
					if (operation === 'getAll') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const channelId = this.getNodeParameter('channelId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/beta/teams/${teamId}/channels/${channelId}/messages`);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/beta/teams/${teamId}/channels/${channelId}/messages`, {});
							responseData = responseData.splice(0, qs.limit);
						}
					}
				}
				if (resource === 'task') {
					//https://docs.microsoft.com/en-us/graph/api/planner-post-tasks?view=graph-rest-1.0&tabs=http
					if (operation === 'create') {
						const planId = this.getNodeParameter('planId', i) as string;
						const bucketId = this.getNodeParameter('bucketId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IDataObject = {
							planId,
							bucketId,
							title,
						};
						Object.assign(body, additionalFields);

						if (body.assignedTo) {
							body.assignments = {
								[body.assignedTo as string]: {
									'@odata.type': 'microsoft.graph.plannerAssignment',
									'orderHint': ' !',
								},
							};
							delete body.assignedTo;
						}

						if (Array.isArray(body.labels)) {
							body.appliedCategories = (body.labels as string[]).map((label) => ({ [label]: true }));
						}

						responseData = await microsoftApiRequest.call(this, 'POST', `/v1.0/planner/tasks`, body);
					}
					//https://docs.microsoft.com/en-us/graph/api/plannertask-delete?view=graph-rest-1.0&tabs=http
					if (operation === 'delete') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const task = await microsoftApiRequest.call(this, 'GET', `/v1.0/planner/tasks/${taskId}`);
						responseData = await microsoftApiRequest.call(this, 'DELETE', `/v1.0/planner/tasks/${taskId}`, {}, {}, undefined, { 'If-Match': task['@odata.etag'] });
						responseData = { success: true };
					}
					//https://docs.microsoft.com/en-us/graph/api/plannertask-get?view=graph-rest-1.0&tabs=http
					if (operation === 'get') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						responseData = await microsoftApiRequest.call(this, 'GET', `/v1.0/planner/tasks/${taskId}`);
					}
					//https://docs.microsoft.com/en-us/graph/api/planneruser-list-tasks?view=graph-rest-1.0&tabs=http
					if (operation === 'getAll') {
						const memberId = this.getNodeParameter('memberId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/v1.0/users/${memberId}/planner/tasks`);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/v1.0/users/${memberId}/planner/tasks`, {});
							responseData = responseData.splice(0, qs.limit);
						}
					}
					//https://docs.microsoft.com/en-us/graph/api/plannertask-update?view=graph-rest-1.0&tabs=http
					if (operation === 'update') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {};
						Object.assign(body, updateFields);

						if (body.assignedTo) {
							body.assignments = {
								[body.assignedTo as string]: {
									'@odata.type': 'microsoft.graph.plannerAssignment',
									'orderHint': ' !',
								},
							};
							delete body.assignedTo;
						}

						if (Array.isArray(body.labels)) {
							body.appliedCategories = (body.labels as string[]).map((label) => ({ [label]: true }));
						}

						const task = await microsoftApiRequest.call(this, 'GET', `/v1.0/planner/tasks/${taskId}`);

						responseData = await microsoftApiRequest.call(this, 'PATCH', `/v1.0/planner/tasks/${taskId}`, body, {}, undefined, { 'If-Match': task['@odata.etag'] });

						responseData = { success: true };
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
