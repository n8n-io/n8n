import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	getVersionForUpdate,
	handleListing,
	taigaApiRequest,
	throwOnEmptyUpdate,
	toOptions,
} from './GenericFunctions';

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
		inputs: ['main'],
		outputs: ['main'],
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
					'/epics',
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
					'/milestones',
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
					'/priorities',
					{},
					{ project },
				)) as LoadedResource[];

				return toOptions(priorities);
			},

			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const { id } = (await taigaApiRequest.call(this, 'GET', '/users/me')) as { id: string };
				const projects = (await taigaApiRequest.call(
					this,
					'GET',
					'/projects',
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
					'/roles',
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
					'/severities',
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
					`/projects/${project}/tags_colors`,
				)) as LoadedTags;

				return Object.keys(tags).map((tag) => ({ name: tag, value: tag }));
			},

			async getTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const project = this.getCurrentNodeParameter('projectId') as string;
				const types = (await taigaApiRequest.call(
					this,
					'GET',
					'/issue-types',
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
					'/users',
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
					'/userstories',
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
					'/issue-statuses',
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
					'/task-statuses',
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
					'/userstory-statuses',
					{},
					{ project },
				)) as LoadedResource[];

				return toOptions(statuses);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

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

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await taigaApiRequest.call(this, 'POST', '/epics', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               epic: delete
						// ----------------------------------------

						const epicId = this.getNodeParameter('epicId', i);

						responseData = await taigaApiRequest.call(this, 'DELETE', `/epics/${epicId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                epic: get
						// ----------------------------------------

						const epicId = this.getNodeParameter('epicId', i);

						responseData = await taigaApiRequest.call(this, 'GET', `/epics/${epicId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               epic: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await handleListing.call(this, 'GET', '/epics', {}, qs, i);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               epic: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const epicId = this.getNodeParameter('epicId', i);
						body.version = await getVersionForUpdate.call(this, `/epics/${epicId}`);

						responseData = await taigaApiRequest.call(this, 'PATCH', `/epics/${epicId}`, body);
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

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await taigaApiRequest.call(this, 'POST', '/issues', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//              issue: delete
						// ----------------------------------------

						const issueId = this.getNodeParameter('issueId', i);

						responseData = await taigaApiRequest.call(this, 'DELETE', `/issues/${issueId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                issue: get
						// ----------------------------------------

						const issueId = this.getNodeParameter('issueId', i);

						responseData = await taigaApiRequest.call(this, 'GET', `/issues/${issueId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              issue: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await handleListing.call(this, 'GET', '/issues', {}, qs, i);
					} else if (operation === 'update') {
						// ----------------------------------------
						//              issue: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const issueId = this.getNodeParameter('issueId', i);
						body.version = await getVersionForUpdate.call(this, `/issues/${issueId}`);

						responseData = await taigaApiRequest.call(this, 'PATCH', `/issues/${issueId}`, body);
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

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await taigaApiRequest.call(this, 'POST', '/tasks', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               task: delete
						// ----------------------------------------

						const taskId = this.getNodeParameter('taskId', i);

						responseData = await taigaApiRequest.call(this, 'DELETE', `/tasks/${taskId}`);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                task: get
						// ----------------------------------------

						const taskId = this.getNodeParameter('taskId', i);

						responseData = await taigaApiRequest.call(this, 'GET', `/tasks/${taskId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               task: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await handleListing.call(this, 'GET', '/tasks', {}, qs, i);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               task: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const taskId = this.getNodeParameter('taskId', i);
						body.version = await getVersionForUpdate.call(this, `/tasks/${taskId}`);

						responseData = await taigaApiRequest.call(this, 'PATCH', `/tasks/${taskId}`, body);
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

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await taigaApiRequest.call(this, 'POST', '/userstories', body);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            userStory: delete
						// ----------------------------------------

						const userStoryId = this.getNodeParameter('userStoryId', i);

						const endpoint = `/userstories/${userStoryId}`;
						responseData = await taigaApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//              userStory: get
						// ----------------------------------------

						const userStoryId = this.getNodeParameter('userStoryId', i);

						const endpoint = `/userstories/${userStoryId}`;
						responseData = await taigaApiRequest.call(this, 'GET', endpoint);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            userStory: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await handleListing.call(this, 'GET', '/userstories', {}, qs, i);
					} else if (operation === 'update') {
						// ----------------------------------------
						//            userStory: update
						// ----------------------------------------

						const body = {} as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const userStoryId = this.getNodeParameter('userStoryId', i);
						body.version = await getVersionForUpdate.call(this, `/userstories/${userStoryId}`);

						responseData = await taigaApiRequest.call(
							this,
							'PATCH',
							`/userstories/${userStoryId}`,
							body,
						);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}

				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
