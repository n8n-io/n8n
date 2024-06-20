import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { flowApiRequest, FlowApiRequestAllItems } from './GenericFunctions';
import { taskFields, taskOperations } from './TaskDescription';
import type { ITask, TaskInfo } from './TaskInterface';

export class Flow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Flow',
		name: 'flow',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:flow.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Flow API',
		defaults: {
			name: 'Flow',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'flowApi',
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
						name: 'Task',
						value: 'task',
						description:
							'Tasks are units of work that can be private or assigned to a list. Through this endpoint, you can manipulate your tasks in Flow, including creating new ones.',
					},
				],
				default: 'task',
			},
			...taskOperations,
			...taskFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('flowApi');

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			if (resource === 'task') {
				//https://developer.getflow.com/api/#tasks_create-task
				if (operation === 'create') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const name = this.getNodeParameter('name', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i);
					const body: ITask = {
						organization_id: credentials.organizationId as number,
					};
					const task: TaskInfo = {
						name,
						workspace_id: parseInt(workspaceId, 10),
					};
					if (additionalFields.ownerId) {
						task.owner_id = parseInt(additionalFields.ownerId as string, 10);
					}
					if (additionalFields.listId) {
						task.list_id = parseInt(additionalFields.listId as string, 10);
					}
					if (additionalFields.startsOn) {
						task.starts_on = additionalFields.startsOn as string;
					}
					if (additionalFields.dueOn) {
						task.due_on = additionalFields.dueOn as string;
					}
					if (additionalFields.mirrorParentSubscribers) {
						task.mirror_parent_subscribers = additionalFields.mirrorParentSubscribers as boolean;
					}
					if (additionalFields.mirrorParentTags) {
						task.mirror_parent_tags = additionalFields.mirrorParentTags as boolean;
					}
					if (additionalFields.noteContent) {
						task.note_content = additionalFields.noteContent as string;
					}
					if (additionalFields.noteMimeType) {
						task.note_mime_type = additionalFields.noteMimeType as string;
					}
					if (additionalFields.parentId) {
						task.parent_id = parseInt(additionalFields.parentId as string, 10);
					}
					if (additionalFields.positionList) {
						task.position_list = additionalFields.positionList as number;
					}
					if (additionalFields.positionUpcoming) {
						task.position_upcoming = additionalFields.positionUpcoming as number;
					}
					if (additionalFields.position) {
						task.position = additionalFields.position as number;
					}
					if (additionalFields.sectionId) {
						task.section_id = additionalFields.sectionId as number;
					}
					if (additionalFields.tags) {
						task.tags = (additionalFields.tags as string).split(',');
					}
					body.task = task;
					try {
						responseData = await flowApiRequest.call(this, 'POST', '/tasks', body);
						responseData = responseData.task;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}
				//https://developer.getflow.com/api/#tasks_update-a-task
				if (operation === 'update') {
					const workspaceId = this.getNodeParameter('workspaceId', i) as string;
					const taskId = this.getNodeParameter('taskId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i);
					const body: ITask = {
						organization_id: credentials.organizationId as number,
					};
					const task: TaskInfo = {
						workspace_id: parseInt(workspaceId, 10),
						id: parseInt(taskId, 10),
					};
					if (updateFields.name) {
						task.name = updateFields.name as string;
					}
					if (updateFields.ownerId) {
						task.owner_id = parseInt(updateFields.ownerId as string, 10);
					}
					if (updateFields.listId) {
						task.list_id = parseInt(updateFields.listId as string, 10);
					}
					if (updateFields.startsOn) {
						task.starts_on = updateFields.startsOn as string;
					}
					if (updateFields.dueOn) {
						task.due_on = updateFields.dueOn as string;
					}
					if (updateFields.mirrorParentSubscribers) {
						task.mirror_parent_subscribers = updateFields.mirrorParentSubscribers as boolean;
					}
					if (updateFields.mirrorParentTags) {
						task.mirror_parent_tags = updateFields.mirrorParentTags as boolean;
					}
					if (updateFields.noteContent) {
						task.note_content = updateFields.noteContent as string;
					}
					if (updateFields.noteMimeType) {
						task.note_mime_type = updateFields.noteMimeType as string;
					}
					if (updateFields.parentId) {
						task.parent_id = parseInt(updateFields.parentId as string, 10);
					}
					if (updateFields.positionList) {
						task.position_list = updateFields.positionList as number;
					}
					if (updateFields.positionUpcoming) {
						task.position_upcoming = updateFields.positionUpcoming as number;
					}
					if (updateFields.position) {
						task.position = updateFields.position as number;
					}
					if (updateFields.sectionId) {
						task.section_id = updateFields.sectionId as number;
					}
					if (updateFields.tags) {
						task.tags = (updateFields.tags as string).split(',');
					}
					if (updateFields.completed) {
						task.completed = updateFields.completed as boolean;
					}
					body.task = task;
					try {
						responseData = await flowApiRequest.call(this, 'PUT', `/tasks/${taskId}`, body);
						responseData = responseData.task;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}
				//https://developer.getflow.com/api/#tasks_get-task
				if (operation === 'get') {
					const taskId = this.getNodeParameter('taskId', i) as string;
					const filters = this.getNodeParameter('filters', i);
					qs.organization_id = credentials.organizationId as number;
					if (filters.include) {
						qs.include = (filters.include as string[]).join(',');
					}
					try {
						responseData = await flowApiRequest.call(this, 'GET', `/tasks/${taskId}`, {}, qs);
					} catch (error) {
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}
				//https://developer.getflow.com/api/#tasks_get-tasks
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i);
					const filters = this.getNodeParameter('filters', i);
					qs.organization_id = credentials.organizationId as number;
					if (filters.include) {
						qs.include = (filters.include as string[]).join(',');
					}
					if (filters.order) {
						qs.order = filters.order as string;
					}
					if (filters.workspaceId) {
						qs.workspace_id = filters.workspaceId as string;
					}
					if (filters.createdBefore) {
						qs.created_before = filters.createdBefore as string;
					}
					if (filters.createdAfter) {
						qs.created_after = filters.createdAfter as string;
					}
					if (filters.updateBefore) {
						qs.updated_before = filters.updateBefore as string;
					}
					if (filters.updateAfter) {
						qs.updated_after = filters.updateAfter as string;
					}
					if (filters.deleted) {
						qs.deleted = filters.deleted as boolean;
					}
					if (filters.cleared) {
						qs.cleared = filters.cleared as boolean;
					}
					try {
						if (returnAll) {
							responseData = await FlowApiRequestAllItems.call(
								this,
								'tasks',
								'GET',
								'/tasks',
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await flowApiRequest.call(this, 'GET', '/tasks', {}, qs);
							responseData = responseData.tasks;
						}
					} catch (error) {
						throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
					}
				}
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
