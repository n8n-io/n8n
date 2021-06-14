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
	taigaApiRequest,
	taigaApiRequestAllItems,
} from './GenericFunctions';

import {
	generalOperations,
} from './generalOperations';

import {
	operationFields,
} from './operationFields';

export class Taiga implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Taiga',
		name: 'taiga',
		icon: 'file:taiga.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Taiga API',
		defaults: {
			name: 'Taiga',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'taigaCloudApi',
				displayOptions: {
					show: {
						version: [
							'cloud',
						],
					},
				},
				required: true,
			},
			{
				name: 'taigaServerApi',
				displayOptions: {
					show: {
						version: [
							'server',
						],
					},
				},
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Taiga Version',
				name: 'version',
				type: 'options',
				options: [
					{
						name: 'Cloud',
						value: 'cloud',
					},
					{
						name: 'Server (Self Hosted)',
						value: 'server',
					},
				],
				default: 'server',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'User Story',
						value: 'userstory',
					},
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'Issue',
						value: 'issue',
					},
				],
				default: 'userstory',
				description: 'Resource to consume.',
			},
			...generalOperations,
			...operationFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available tags to display them to user so that we can
			// select them easily
			async getTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projectId = this.getCurrentNodeParameter('projectId') as string;

				const returnData: INodePropertyOptions[] = [];

				const types = await taigaApiRequest.call(this, 'GET', `/issue-types?project=${projectId}`);
				for (const type of types) {
					const typeName = type.name;
					const typeId = type.id;
					returnData.push({
						name: typeName,
						value: typeId,
					});
				}
				return returnData;
			},

			// Get all the available issue statuses to display them to user so that we can
			// select them easily
			async getIssueStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const projectId = this.getCurrentNodeParameter('projectId') as string;

				const statuses = await taigaApiRequest.call(this, 'GET', '/issue-statuses', {}, { project: projectId });
				for (const status of statuses) {
					const statusName = status.name;
					const statusId = status.id;
					returnData.push({
						name: statusName,
						value: statusId,
					});
				}
				return returnData;
			},

			// Get all the available userstory statuses to display them to user so that we can
			// select them easily
			async getUserstoryStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const projectId = this.getCurrentNodeParameter('projectId') as string;

				const statuses = await taigaApiRequest.call(this, 'GET', '/userstory-statuses', {}, { project: projectId });
				for (const status of statuses) {
					const statusName = status.name;
					const statusId = status.id;
					returnData.push({
						name: statusName,
						value: statusId,
					});
				}
				return returnData;
			},

			// Get all the available userstory statuses to display them to user so that we can
			// select them easily
			async getTaskStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const projectId = this.getCurrentNodeParameter('projectId') as string;

				const statuses = await taigaApiRequest.call(this, 'GET', '/task-statuses', {}, { project: projectId });
				for (const status of statuses) {
					const statusName = status.name;
					const statusId = status.id;
					returnData.push({
						name: statusName,
						value: statusId,
					});
				}
				return returnData;
			},

			// Get all the available users to display them to user so that we can
			// select them easily
			async getProjectUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const projectId = this.getCurrentNodeParameter('projectId') as string;

				const users = await taigaApiRequest.call(this, 'GET', '/users', {}, { project: projectId });
				for (const user of users) {
					const userName = user.username;
					const userId = user.id;
					returnData.push({
						name: userName,
						value: userId,
					});
				}
				return returnData;
			},

			// Get all the available priorities to display them to user so that we can
			// select them easily
			async getProjectPriorities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const projectId = this.getCurrentNodeParameter('projectId') as string;

				const priorities = await taigaApiRequest.call(this, 'GET', '/priorities', {}, { project: projectId });
				for (const priority of priorities) {
					const priorityName = priority.name;
					const priorityId = priority.id;
					returnData.push({
						name: priorityName,
						value: priorityId,
					});
				}
				return returnData;
			},

			// Get all the available severities to display them to user so that we can
			// select them easily
			async getProjectSeverities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const projectId = this.getCurrentNodeParameter('projectId') as string;

				const severities = await taigaApiRequest.call(this, 'GET', '/severities', {}, { project: projectId });
				for (const severity of severities) {
					const severityName = severity.name;
					const severityId = severity.id;
					returnData.push({
						name: severityName,
						value: severityId,
					});
				}
				return returnData;
			},

			// Get all the available milestones to display them to user so that we can
			// select them easily
			async getProjectMilestones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const projectId = this.getCurrentNodeParameter('projectId') as string;

				const milestones = await taigaApiRequest.call(this, 'GET', '/milestones', {}, { project: projectId });
				for (const milestone of milestones) {
					const milestoneName = milestone.name;
					const milestoneId = milestone.id;
					returnData.push({
						name: milestoneName,
						value: milestoneId,
					});
				}
				return returnData;
			},

			// Get all the available projects to display them to user so that we can
			// select them easily
			async getUserProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const { id } = await taigaApiRequest.call(this, 'GET', '/users/me');

				const projects = await taigaApiRequest.call(this, 'GET', '/projects', {}, { member: id });
				for (const project of projects) {
					const projectName = project.name;
					const projectId = project.id;
					returnData.push({
						name: projectName,
						value: projectId,
					});
				}
				return returnData;
			},

			// Get all the available userstories to display them to user so that we can
			// select them easily
			async getUserStories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const projectId = this.getCurrentNodeParameter('projectId') as string;

				const userstories = await taigaApiRequest.call(this, 'GET', '/userstories', {}, { project: projectId });
				for (const userstory of userstories) {
					const userstorySubject = userstory.subject;
					const userstoryId = userstory.id;
					returnData.push({
						name: userstorySubject,
						value: userstoryId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const qs: IDataObject = {};

		for (let i = 0; i < items.length; i++) {
			if (resource === 'issue') {
				if (operation === 'create') {
					const projectId = this.getNodeParameter('projectId', i) as number;

					const subject = this.getNodeParameter('subject', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {
						project: projectId,
						subject,
					};

					Object.assign(body, additionalFields);

					if (body.tags) {
						body.tags = (body.tags as string).split(',') as string[];
					}

					responseData = await taigaApiRequest.call(this, 'POST', '/issues', body);
				}

				if (operation === 'update') {

					const itemId = this.getNodeParameter('itemId', i) as string;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					const body: IDataObject = {};

					Object.assign(body, updateFields);

					if (body.tags) {
						body.tags = (body.tags as string).split(',') as string[];
					}

					const { version } = await taigaApiRequest.call(this, 'GET', `/issues/${itemId}`);

					body.version = version;

					responseData = await taigaApiRequest.call(this, 'PATCH', `/issues/${itemId}`, body);
				}

				if (operation === 'delete') {
					const itemId = this.getNodeParameter('itemId', i) as string;
					responseData = await taigaApiRequest.call(this, 'DELETE', `/issues/${itemId}`);
					responseData = { success: true };
				}

				if (operation === 'get') {
					const itemId = this.getNodeParameter('itemId', i) as string;
					responseData = await taigaApiRequest.call(this, 'GET', `/issues/${itemId}`);
				}

				if (operation === 'getAll') {

					const projectId = this.getNodeParameter('projectId', i) as number;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					qs.project = projectId;

					if (returnAll === true) {
						responseData = await taigaApiRequestAllItems.call(this, 'GET', '/issues', {}, qs);

					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await taigaApiRequestAllItems.call(this, 'GET', '/issues', {}, qs);
						responseData = responseData.splice(0, qs.limit);
					}
				}
			} else if (resource === 'userstory') {
				if (operation === 'getAll') {

					const projectId = this.getNodeParameter('projectId', i) as number;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					qs.project = projectId;

					if (returnAll === true) {
						responseData = await taigaApiRequestAllItems.call(this, 'GET', '/userstories', {}, qs);

					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await taigaApiRequestAllItems.call(this, 'GET', '/userstories', {}, qs);
						responseData = responseData.splice(0, qs.limit);
					}
				}

				if (operation === 'delete') {
					const itemId = this.getNodeParameter('itemId', i) as string;
					responseData = await taigaApiRequest.call(this, 'DELETE', `/userstories/${itemId}`);
					responseData = { success: true };
				}

				if (operation === 'get') {
					const itemId = this.getNodeParameter('itemId', i) as string;
					responseData = await taigaApiRequest.call(this, 'GET', `/userstories/${itemId}`);
				}

				if (operation === 'create') {
					const projectId = this.getNodeParameter('projectId', i) as number;

					const subject = this.getNodeParameter('subject', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {
						project: projectId,
						subject,
					};

					Object.assign(body, additionalFields);

					if (body.tags) {
						body.tags = (body.tags as string).split(',') as string[];
					}

					responseData = await taigaApiRequest.call(this, 'POST', '/userstories', body);
				}

				if (operation === 'update') {

					const itemId = this.getNodeParameter('itemId', i) as string;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					const body: IDataObject = {};

					Object.assign(body, updateFields);

					if (body.tags) {
						body.tags = (body.tags as string).split(',') as string[];
					}

					const { version } = await taigaApiRequest.call(this, 'GET', `/userstories/${itemId}`);

					body.version = version;

					responseData = await taigaApiRequest.call(this, 'PATCH', `/userstories/${itemId}`, body);
				}
			} else if (resource === 'task') {
				if (operation === 'getAll') {

					const projectId = this.getNodeParameter('projectId', i) as number;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					qs.project = projectId;

					if (returnAll === true) {
						responseData = await taigaApiRequestAllItems.call(this, 'GET', '/tasks', {}, qs);

					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						responseData = await taigaApiRequestAllItems.call(this, 'GET', '/tasks', {}, qs);
						responseData = responseData.splice(0, qs.limit);
					}
				}

				if (operation === 'delete') {
					const itemId = this.getNodeParameter('itemId', i) as string;
					responseData = await taigaApiRequest.call(this, 'DELETE', `/tasks/${itemId}`);
					responseData = { success: true };
				}

				if (operation === 'get') {
					const itemId = this.getNodeParameter('itemId', i) as string;
					responseData = await taigaApiRequest.call(this, 'GET', `/tasks/${itemId}`);
				}

				if (operation === 'create') {
					const projectId = this.getNodeParameter('projectId', i) as number;

					const subject = this.getNodeParameter('subject', i) as string;
					const userstoryId = this.getNodeParameter('user_story', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {
						project: projectId,
						user_story: userstoryId,
						subject,
					};

					Object.assign(body, additionalFields);

					if (body.tags) {
						body.tags = (body.tags as string).split(',') as string[];
					}

					responseData = await taigaApiRequest.call(this, 'POST', '/tasks', body);
				}

				if (operation === 'update') {

					const itemId = this.getNodeParameter('itemId', i) as string;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					const body: IDataObject = {};

					Object.assign(body, updateFields);

					if (body.tags) {
						body.tags = (body.tags as string).split(',') as string[];
					}

					const { version } = await taigaApiRequest.call(this, 'GET', `/tasks/${itemId}`);

					body.version = version;

					responseData = await taigaApiRequest.call(this, 'PATCH', `/tasks/${itemId}`, body);
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
