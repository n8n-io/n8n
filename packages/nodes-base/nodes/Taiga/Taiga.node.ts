import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, requestPath } from 'n8n-workflow';

import {
	epicFields,
	epicOperations,
	issueFields,
	issueOperations,
	taskFields,
	taskOperations,
	userStoryFields,
	userStoryOperations,
} from './descriptions';
import {
	getVersionForUpdate,
	handleListing,
	taigaApiRequest,
	throwOnEmptyUpdate,
	toOptions,
} from './GenericFunctions';
import type {
	LoadedEpic,
	LoadedResource,
	LoadedTags,
	LoadedUser,
	LoadedUserStory,
	Operation,
	Resource,
} from './types';

export class Taiga implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Taiga',
		name: 'taiga',
		icon: 'file:taiga.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Taiga API',
		defaults: {
			name: 'Taiga',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'taigaApi',
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
						name: 'Epic',
						value: 'epic',
					},
					{
						name: 'Issue',
						value: 'issue',
					},
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'User Story',
						value: 'userStory',
					},
				],
				default: 'issue',
			},
			...epicOperations,
			...epicFields,
			...issueOperations,
			...issueFields,
			...taskOperations,
			...taskFields,
			...userStoryOperations,
			...userStoryFields,
		],
	};

	methods = {
		loadOptions: {
			async getEpics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const epics = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/epics`,
					{},
					{ project },
				)) as LoadedEpic[];

				return epics.map(({ subject, id }) => ({ name: subject, value: id }));
			},

			async getMilestones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const milestones = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/milestones`,
					{},
					{ project },
				)) as LoadedResource[];

				return toOptions(milestones);
			},

			async getPriorities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const priorities = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/priorities`,
					{},
					{ project },
				)) as LoadedResource[];

				return toOptions(priorities);
			},

			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { id } = (await taigaApiRequest.call(this, 'GET', requestPath`/users/me`)) as {
					id: string;
				};
				const projects = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/projects`,
					{},
					{ member: id },
				)) as LoadedResource[];

				return toOptions(projects);
			},

			async getRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const roles = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/roles`,
					{},
					{ project },
				)) as LoadedResource[];

				return toOptions(roles);
			},

			async getSeverities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const severities = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/severities`,
					{},
					{ project },
				)) as LoadedResource[];

				return toOptions(severities);
			},

			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const tags = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/projects/${project}/tags_colors`,
				)) as LoadedTags;

				return Object.keys(tags).map((tag) => ({ name: tag, value: tag }));
			},

			async getTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const types = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/issue-types`,
					{},
					{ project },
				)) as LoadedResource[];

				return toOptions(types);
			},

			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const users = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/users`,
					{},
					{ project },
				)) as LoadedUser[];

				return users.map(({ full_name_display, id }) => ({ name: full_name_display, value: id }));
			},

			async getUserStories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const userStories = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/userstories`,
					{},
					{ project },
				)) as LoadedUserStory[];

				return userStories.map(({ subject, id }) => ({ name: subject, value: id }));
			},

			// statuses

			async getIssueStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const statuses = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/issue-statuses`,
					{},
					{ project },
				)) as LoadedResource[];

				return toOptions(statuses);
			},

			async getTaskStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const statuses = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/task-statuses`,
					{},
					{ project },
				)) as LoadedResource[];

				return toOptions(statuses);
			},

			async getUserStoryStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const statuses = (await taigaApiRequest.call(
					this,
					'GET',
					requestPath`/userstory-statuses`,
					{},
					{ project },
				)) as LoadedResource[];

				return toOptions(statuses);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as Resource;
		const operation = this.getNodeParameter('operation', 0) as Operation;

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'epic') {
					// **********************************************************************
					//                                  epic
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//               epic: create
						// ----------------------------------------

						const body = {
							project: this.getNodeParameter('projectId', i),
							subject: this.getNodeParameter('subject', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await taigaApiRequest.call(this, 'POST', requestPath`/epics`, body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               epic: delete
						// ----------------------------------------

						const epicId = this.getNodeParameter('epicId', i);

						responseData = await taigaApiRequest.call(
							this,
							'DELETE',
							requestPath`/epics/${epicId}`,
						);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                epic: get
						// ----------------------------------------

						const epicId = this.getNodeParameter('epicId', i);

						responseData = await taigaApiRequest.call(this, 'GET', requestPath`/epics/${epicId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               epic: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await handleListing.call(this, 'GET', requestPath`/epics`, {}, qs, i);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               epic: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const epicId = this.getNodeParameter('epicId', i);
						body.version = await getVersionForUpdate.call(this, requestPath`/epics/${epicId}`);

						responseData = await taigaApiRequest.call(
							this,
							'PATCH',
							requestPath`/epics/${epicId}`,
							body,
						);
					}
				} else if (resource === 'issue') {
					// **********************************************************************
					//                                 issue
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//              issue: create
						// ----------------------------------------

						const body = {
							project: this.getNodeParameter('projectId', i),
							subject: this.getNodeParameter('subject', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await taigaApiRequest.call(this, 'POST', requestPath`/issues`, body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//              issue: delete
						// ----------------------------------------

						const issueId = this.getNodeParameter('issueId', i);

						responseData = await taigaApiRequest.call(
							this,
							'DELETE',
							requestPath`/issues/${issueId}`,
						);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                issue: get
						// ----------------------------------------

						const issueId = this.getNodeParameter('issueId', i);

						responseData = await taigaApiRequest.call(this, 'GET', requestPath`/issues/${issueId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              issue: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await handleListing.call(this, 'GET', requestPath`/issues`, {}, qs, i);
					} else if (operation === 'update') {
						// ----------------------------------------
						//              issue: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const issueId = this.getNodeParameter('issueId', i);
						body.version = await getVersionForUpdate.call(this, requestPath`/issues/${issueId}`);

						responseData = await taigaApiRequest.call(
							this,
							'PATCH',
							requestPath`/issues/${issueId}`,
							body,
						);
					}
				} else if (resource === 'task') {
					// **********************************************************************
					//                                  task
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//               task: create
						// ----------------------------------------

						const body = {
							project: this.getNodeParameter('projectId', i),
							subject: this.getNodeParameter('subject', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await taigaApiRequest.call(this, 'POST', requestPath`/tasks`, body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               task: delete
						// ----------------------------------------

						const taskId = this.getNodeParameter('taskId', i);

						responseData = await taigaApiRequest.call(
							this,
							'DELETE',
							requestPath`/tasks/${taskId}`,
						);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                task: get
						// ----------------------------------------

						const taskId = this.getNodeParameter('taskId', i);

						responseData = await taigaApiRequest.call(this, 'GET', requestPath`/tasks/${taskId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               task: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await handleListing.call(this, 'GET', requestPath`/tasks`, {}, qs, i);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               task: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const taskId = this.getNodeParameter('taskId', i);
						body.version = await getVersionForUpdate.call(this, requestPath`/tasks/${taskId}`);

						responseData = await taigaApiRequest.call(
							this,
							'PATCH',
							requestPath`/tasks/${taskId}`,
							body,
						);
					}
				} else if (resource === 'userStory') {
					// **********************************************************************
					//                               userStory
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//            userStory: create
						// ----------------------------------------

						const body = {
							project: this.getNodeParameter('projectId', i),
							subject: this.getNodeParameter('subject', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await taigaApiRequest.call(
							this,
							'POST',
							requestPath`/userstories`,
							body,
						);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            userStory: delete
						// ----------------------------------------

						const userStoryId = this.getNodeParameter('userStoryId', i);

						const endpoint = requestPath`/userstories/${userStoryId}`;
						responseData = await taigaApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//              userStory: get
						// ----------------------------------------

						const userStoryId = this.getNodeParameter('userStoryId', i);

						const endpoint = requestPath`/userstories/${userStoryId}`;
						responseData = await taigaApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            userStory: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await handleListing.call(
							this,
							'GET',
							requestPath`/userstories`,
							{},
							qs,
							i,
						);
					} else if (operation === 'update') {
						// ----------------------------------------
						//            userStory: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const userStoryId = this.getNodeParameter('userStoryId', i);
						body.version = await getVersionForUpdate.call(
							this,
							requestPath`/userstories/${userStoryId}`,
						);

						responseData = await taigaApiRequest.call(
							this,
							'PATCH',
							requestPath`/userstories/${userStoryId}`,
							body,
						);
					}
				}
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

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return [returnData];
	}
}
