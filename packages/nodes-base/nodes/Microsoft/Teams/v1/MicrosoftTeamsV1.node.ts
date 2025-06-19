import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type INodeTypeBaseDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { channelFields, channelOperations } from './ChannelDescription';
import { channelMessageFields, channelMessageOperations } from './ChannelMessageDescription';
import { chatMessageFields, chatMessageOperations } from './ChatMessageDescription';
import {
	microsoftApiRequest,
	microsoftApiRequestAllItems,
	prepareMessage,
} from './GenericFunctions';
import { taskFields, taskOperations } from './TaskDescription';
import { oldVersionNotice } from '../../../../utils/descriptions';

const versionDescription: INodeTypeDescription = {
	displayName: 'Microsoft Teams',
	name: 'microsoftTeams',
	icon: 'file:teams.svg',
	group: ['input'],
	version: [1, 1.1],
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Microsoft Teams API',
	defaults: {
		name: 'Microsoft Teams',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'microsoftTeamsOAuth2Api',
			required: true,
		},
	],
	properties: [
		oldVersionNotice,
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
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
					name: 'Chat Message',
					value: 'chatMessage',
				},
				{
					name: 'Task',
					value: 'task',
				},
			],
			default: 'channel',
		},
		// CHANNEL
		...channelOperations,
		...channelFields,
		/// MESSAGE
		...channelMessageOperations,
		...channelMessageFields,
		...chatMessageOperations,
		...chatMessageFields,
		///TASK
		...taskOperations,
		...taskFields,
	],
};

export class MicrosoftTeamsV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			// Get all the team's channels to display them to user so that they can
			// select them easily
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const teamId = this.getCurrentNodeParameter('teamId') as string;
				const { value } = await microsoftApiRequest.call(
					this,
					'GET',
					`/v1.0/teams/${teamId}/channels`,
				);
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
			// Get all the teams to display them to user so that they can
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
			// Get all the groups to display them to user so that they can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const groupSource = this.getCurrentNodeParameter('groupSource') as string;
				let requestUrl = '/v1.0/groups' as string;
				if (groupSource === 'mine') {
					requestUrl = '/v1.0/me/transitiveMemberOf';
				}
				const { value } = await microsoftApiRequest.call(this, 'GET', requestUrl);
				for (const group of value) {
					returnData.push({
						name: group.displayName || group.mail || group.id,
						value: group.id,
						description: group.mail,
					});
				}
				return returnData;
			},
			// Get all the plans to display them to user so that they can
			// select them easily
			async getPlans(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let groupId = this.getCurrentNodeParameter('groupId') as string;
				const operation = this.getNodeParameter('operation', 0);
				if (operation === 'update' && (groupId === undefined || groupId === null)) {
					// groupId not found at base, check updateFields for the groupId
					groupId = this.getCurrentNodeParameter('updateFields.groupId') as string;
				}
				const { value } = await microsoftApiRequest.call(
					this,
					'GET',
					`/v1.0/groups/${groupId}/planner/plans`,
				);
				for (const plan of value) {
					returnData.push({
						name: plan.title,
						value: plan.id,
					});
				}
				return returnData;
			},
			// Get all the plans to display them to user so that they can
			// select them easily
			async getBuckets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let planId = this.getCurrentNodeParameter('planId') as string;
				const operation = this.getNodeParameter('operation', 0);
				if (operation === 'update' && (planId === undefined || planId === null)) {
					// planId not found at base, check updateFields for the planId
					planId = this.getCurrentNodeParameter('updateFields.planId') as string;
				}
				const { value } = await microsoftApiRequest.call(
					this,
					'GET',
					`/v1.0/planner/plans/${planId}/buckets`,
				);
				for (const bucket of value) {
					returnData.push({
						name: bucket.name,
						value: bucket.id,
					});
				}
				return returnData;
			},
			// Get all the plans to display them to user so that they can
			// select them easily
			async getMembers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let groupId = this.getCurrentNodeParameter('groupId') as string;
				const operation = this.getNodeParameter('operation', 0);
				if (operation === 'update' && (groupId === undefined || groupId === null)) {
					// groupId not found at base, check updateFields for the groupId
					groupId = this.getCurrentNodeParameter('updateFields.groupId') as string;
				}
				const { value } = await microsoftApiRequest.call(
					this,
					'GET',
					`/v1.0/groups/${groupId}/members`,
				);
				for (const member of value) {
					returnData.push({
						name: member.displayName,
						value: member.id,
					});
				}
				return returnData;
			},
			// Get all the labels to display them to user so that they can
			// select them easily
			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				let planId = this.getCurrentNodeParameter('planId') as string;
				const operation = this.getNodeParameter('operation', 0);
				if (operation === 'update' && (planId === undefined || planId === null)) {
					// planId not found at base, check updateFields for the planId
					planId = this.getCurrentNodeParameter('updateFields.planId') as string;
				}
				const { categoryDescriptions } = await microsoftApiRequest.call(
					this,
					'GET',
					`/v1.0/planner/plans/${planId}/details`,
				);
				for (const key of Object.keys(categoryDescriptions as IDataObject)) {
					if (categoryDescriptions[key] !== null) {
						returnData.push({
							name: categoryDescriptions[key],
							value: key,
						});
					}
				}
				return returnData;
			},
			// Get all the chats to display them to user so that they can
			// select them easily
			async getChats(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {
					$expand: 'members',
				};
				const { value } = await microsoftApiRequest.call(this, 'GET', '/v1.0/chats', {}, qs);
				for (const chat of value) {
					if (!chat.topic) {
						chat.topic = chat.members
							.filter((member: IDataObject) => member.displayName)
							.map((member: IDataObject) => member.displayName)
							.join(', ');
					}
					const chatName = `${chat.topic || '(no title) - ' + (chat.id as string)} (${
						chat.chatType
					})`;
					const chatId = chat.id;
					returnData.push({
						name: chatName,
						value: chatId,
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
		const nodeVersion = this.getNode().typeVersion;
		const instanceId = this.getInstanceId();

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'channel') {
					//https://docs.microsoft.com/en-us/graph/api/channel-post?view=graph-rest-beta&tabs=http
					if (operation === 'create') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const options = this.getNodeParameter('options', i);
						const body: IDataObject = {
							displayName: name,
						};
						if (options.description) {
							body.description = options.description as string;
						}
						if (options.type) {
							body.membershipType = options.type as string;
						}
						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/v1.0/teams/${teamId}/channels`,
							body,
						);
					}
					//https://docs.microsoft.com/en-us/graph/api/channel-delete?view=graph-rest-beta&tabs=http
					if (operation === 'delete') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const channelId = this.getNodeParameter('channelId', i) as string;
						responseData = await microsoftApiRequest.call(
							this,
							'DELETE',
							`/v1.0/teams/${teamId}/channels/${channelId}`,
						);
						responseData = { success: true };
					}
					//https://docs.microsoft.com/en-us/graph/api/channel-get?view=graph-rest-beta&tabs=http
					if (operation === 'get') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const channelId = this.getNodeParameter('channelId', i) as string;
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/v1.0/teams/${teamId}/channels/${channelId}`,
						);
					}
					//https://docs.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-beta&tabs=http
					if (operation === 'getAll') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								`/v1.0/teams/${teamId}/channels`,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								`/v1.0/teams/${teamId}/channels`,
								{},
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
					//https://docs.microsoft.com/en-us/graph/api/channel-patch?view=graph-rest-beta&tabs=http
					if (operation === 'update') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const channelId = this.getNodeParameter('channelId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						if (updateFields.name) {
							body.displayName = updateFields.name as string;
						}
						if (updateFields.description) {
							body.description = updateFields.description as string;
						}
						responseData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/v1.0/teams/${teamId}/channels/${channelId}`,
							body,
						);
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
						const options = this.getNodeParameter('options', i);

						let includeLinkToWorkflow = options.includeLinkToWorkflow;
						if (includeLinkToWorkflow === undefined) {
							includeLinkToWorkflow = nodeVersion >= 1.1;
						}

						const body: IDataObject = prepareMessage.call(
							this,
							message,
							messageType,
							includeLinkToWorkflow as boolean,
							instanceId,
						);

						if (options.makeReply) {
							const replyToId = options.makeReply as string;
							responseData = await microsoftApiRequest.call(
								this,
								'POST',
								`/beta/teams/${teamId}/channels/${channelId}/messages/${replyToId}/replies`,
								body,
							);
						} else {
							responseData = await microsoftApiRequest.call(
								this,
								'POST',
								`/beta/teams/${teamId}/channels/${channelId}/messages`,
								body,
							);
						}
					}
					//https://docs.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-beta&tabs=http
					if (operation === 'getAll') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						const channelId = this.getNodeParameter('channelId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								`/beta/teams/${teamId}/channels/${channelId}/messages`,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								`/beta/teams/${teamId}/channels/${channelId}/messages`,
								{},
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
				}
				if (resource === 'chatMessage') {
					// https://docs.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0&tabs=http
					if (operation === 'create') {
						const chatId = this.getNodeParameter('chatId', i) as string;
						const messageType = this.getNodeParameter('messageType', i) as string;
						const message = this.getNodeParameter('message', i) as string;
						const options = this.getNodeParameter('options', i, {});

						const includeLinkToWorkflow =
							options.includeLinkToWorkflow !== false && nodeVersion >= 1.1;

						const body: IDataObject = prepareMessage.call(
							this,
							message,
							messageType,
							includeLinkToWorkflow,
							instanceId,
						);

						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							`/v1.0/chats/${chatId}/messages`,
							body,
						);
					}
					// https://docs.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0&tabs=http
					if (operation === 'get') {
						const chatId = this.getNodeParameter('chatId', i) as string;
						const messageId = this.getNodeParameter('messageId', i) as string;
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/v1.0/chats/${chatId}/messages/${messageId}`,
						);
					}
					// https://docs.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0&tabs=http
					if (operation === 'getAll') {
						const chatId = this.getNodeParameter('chatId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll) {
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								`/v1.0/chats/${chatId}/messages`,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await microsoftApiRequestAllItems.call(
								this,
								'value',
								'GET',
								`/v1.0/chats/${chatId}/messages`,
								{},
							);
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
						const additionalFields = this.getNodeParameter('additionalFields', i);
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
									orderHint: ' !',
								},
							};
							delete body.assignedTo;
						}

						if (Array.isArray(body.labels)) {
							body.appliedCategories = (body.labels as string[]).map((label) => ({
								[label]: true,
							}));
						}

						responseData = await microsoftApiRequest.call(
							this,
							'POST',
							'/v1.0/planner/tasks',
							body,
						);
					}
					//https://docs.microsoft.com/en-us/graph/api/plannertask-delete?view=graph-rest-1.0&tabs=http
					if (operation === 'delete') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const task = await microsoftApiRequest.call(
							this,
							'GET',
							`/v1.0/planner/tasks/${taskId}`,
						);
						responseData = await microsoftApiRequest.call(
							this,
							'DELETE',
							`/v1.0/planner/tasks/${taskId}`,
							{},
							{},
							undefined,
							{ 'If-Match': task['@odata.etag'] },
						);
						responseData = { success: true };
					}
					//https://docs.microsoft.com/en-us/graph/api/plannertask-get?view=graph-rest-1.0&tabs=http
					if (operation === 'get') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						responseData = await microsoftApiRequest.call(
							this,
							'GET',
							`/v1.0/planner/tasks/${taskId}`,
						);
					}
					if (operation === 'getAll') {
						const tasksFor = this.getNodeParameter('tasksFor', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						if (tasksFor === 'member') {
							//https://docs.microsoft.com/en-us/graph/api/planneruser-list-tasks?view=graph-rest-1.0&tabs=http
							const memberId = this.getNodeParameter('memberId', i) as string;
							if (returnAll) {
								responseData = await microsoftApiRequestAllItems.call(
									this,
									'value',
									'GET',
									`/v1.0/users/${memberId}/planner/tasks`,
								);
							} else {
								qs.limit = this.getNodeParameter('limit', i);
								responseData = await microsoftApiRequestAllItems.call(
									this,
									'value',
									'GET',
									`/v1.0/users/${memberId}/planner/tasks`,
									{},
								);
								responseData = responseData.splice(0, qs.limit);
							}
						} else {
							//https://docs.microsoft.com/en-us/graph/api/plannerplan-list-tasks?view=graph-rest-1.0&tabs=http
							const planId = this.getNodeParameter('planId', i) as string;
							if (returnAll) {
								responseData = await microsoftApiRequestAllItems.call(
									this,
									'value',
									'GET',
									`/v1.0/planner/plans/${planId}/tasks`,
								);
							} else {
								qs.limit = this.getNodeParameter('limit', i);
								responseData = await microsoftApiRequestAllItems.call(
									this,
									'value',
									'GET',
									`/v1.0/planner/plans/${planId}/tasks`,
									{},
								);
								responseData = responseData.splice(0, qs.limit);
							}
						}
					}
					//https://docs.microsoft.com/en-us/graph/api/plannertask-update?view=graph-rest-1.0&tabs=http
					if (operation === 'update') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						Object.assign(body, updateFields);

						if (body.assignedTo) {
							body.assignments = {
								[body.assignedTo as string]: {
									'@odata.type': 'microsoft.graph.plannerAssignment',
									orderHint: ' !',
								},
							};
							delete body.assignedTo;
						}

						if (body.groupId) {
							// tasks are assigned to a plan and bucket, group is used for filtering
							delete body.groupId;
						}

						if (Array.isArray(body.labels)) {
							body.appliedCategories = (body.labels as string[]).map((label) => ({
								[label]: true,
							}));
						}

						const task = await microsoftApiRequest.call(
							this,
							'GET',
							`/v1.0/planner/tasks/${taskId}`,
						);

						responseData = await microsoftApiRequest.call(
							this,
							'PATCH',
							`/v1.0/planner/tasks/${taskId}`,
							body,
							{},
							undefined,
							{ 'If-Match': task['@odata.etag'] },
						);

						responseData = { success: true };
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
