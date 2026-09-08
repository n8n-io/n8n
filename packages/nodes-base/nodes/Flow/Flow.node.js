import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';
import { flowApiRequest, FlowApiRequestAllItems } from './GenericFunctions';
import { taskFields, taskOperations } from './TaskDescription';
export class Flow {
    description = {
        displayName: 'Flow',
        name: 'flow',
        icon: 'file:flow.svg',
        group: ['output'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Flow API',
        defaults: {
            name: 'Flow',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
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
                        description: 'Tasks are units of work that can be private or assigned to a list. Through this endpoint, you can manipulate your tasks in Flow, including creating new ones.',
                    },
                ],
                default: 'task',
            },
            ...taskOperations,
            ...taskFields,
        ],
    };
    async execute() {
        const credentials = await this.getCredentials('flowApi');
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const qs = {};
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            if (resource === 'task') {
                //https://developer.getflow.com/api/#tasks_create-task
                if (operation === 'create') {
                    const workspaceId = this.getNodeParameter('workspaceId', i);
                    const name = this.getNodeParameter('name', i);
                    const additionalFields = this.getNodeParameter('additionalFields', i);
                    const body = {
                        organization_id: credentials.organizationId,
                    };
                    const task = {
                        name,
                        workspace_id: parseInt(workspaceId, 10),
                    };
                    if (additionalFields.ownerId) {
                        task.owner_id = parseInt(additionalFields.ownerId, 10);
                    }
                    if (additionalFields.listId) {
                        task.list_id = parseInt(additionalFields.listId, 10);
                    }
                    if (additionalFields.startsOn) {
                        task.starts_on = additionalFields.startsOn;
                    }
                    if (additionalFields.dueOn) {
                        task.due_on = additionalFields.dueOn;
                    }
                    if (additionalFields.mirrorParentSubscribers) {
                        task.mirror_parent_subscribers = additionalFields.mirrorParentSubscribers;
                    }
                    if (additionalFields.mirrorParentTags) {
                        task.mirror_parent_tags = additionalFields.mirrorParentTags;
                    }
                    if (additionalFields.noteContent) {
                        task.note_content = additionalFields.noteContent;
                    }
                    if (additionalFields.noteMimeType) {
                        task.note_mime_type = additionalFields.noteMimeType;
                    }
                    if (additionalFields.parentId) {
                        task.parent_id = parseInt(additionalFields.parentId, 10);
                    }
                    if (additionalFields.positionList) {
                        task.position_list = additionalFields.positionList;
                    }
                    if (additionalFields.positionUpcoming) {
                        task.position_upcoming = additionalFields.positionUpcoming;
                    }
                    if (additionalFields.position) {
                        task.position = additionalFields.position;
                    }
                    if (additionalFields.sectionId) {
                        task.section_id = additionalFields.sectionId;
                    }
                    if (additionalFields.tags) {
                        task.tags = additionalFields.tags.split(',');
                    }
                    body.task = task;
                    try {
                        responseData = await flowApiRequest.call(this, 'POST', '/tasks', body);
                        responseData = responseData.task;
                    }
                    catch (error) {
                        throw new NodeApiError(this.getNode(), error);
                    }
                }
                //https://developer.getflow.com/api/#tasks_update-a-task
                if (operation === 'update') {
                    const workspaceId = this.getNodeParameter('workspaceId', i);
                    const taskId = this.getNodeParameter('taskId', i);
                    const updateFields = this.getNodeParameter('updateFields', i);
                    const body = {
                        organization_id: credentials.organizationId,
                    };
                    const task = {
                        workspace_id: parseInt(workspaceId, 10),
                        id: parseInt(taskId, 10),
                    };
                    if (updateFields.name) {
                        task.name = updateFields.name;
                    }
                    if (updateFields.ownerId) {
                        task.owner_id = parseInt(updateFields.ownerId, 10);
                    }
                    if (updateFields.listId) {
                        task.list_id = parseInt(updateFields.listId, 10);
                    }
                    if (updateFields.startsOn) {
                        task.starts_on = updateFields.startsOn;
                    }
                    if (updateFields.dueOn) {
                        task.due_on = updateFields.dueOn;
                    }
                    if (updateFields.mirrorParentSubscribers) {
                        task.mirror_parent_subscribers = updateFields.mirrorParentSubscribers;
                    }
                    if (updateFields.mirrorParentTags) {
                        task.mirror_parent_tags = updateFields.mirrorParentTags;
                    }
                    if (updateFields.noteContent) {
                        task.note_content = updateFields.noteContent;
                    }
                    if (updateFields.noteMimeType) {
                        task.note_mime_type = updateFields.noteMimeType;
                    }
                    if (updateFields.parentId) {
                        task.parent_id = parseInt(updateFields.parentId, 10);
                    }
                    if (updateFields.positionList) {
                        task.position_list = updateFields.positionList;
                    }
                    if (updateFields.positionUpcoming) {
                        task.position_upcoming = updateFields.positionUpcoming;
                    }
                    if (updateFields.position) {
                        task.position = updateFields.position;
                    }
                    if (updateFields.sectionId) {
                        task.section_id = updateFields.sectionId;
                    }
                    if (updateFields.tags) {
                        task.tags = updateFields.tags.split(',');
                    }
                    if (updateFields.completed) {
                        task.completed = updateFields.completed;
                    }
                    body.task = task;
                    try {
                        responseData = await flowApiRequest.call(this, 'PUT', `/tasks/${taskId}`, body);
                        responseData = responseData.task;
                    }
                    catch (error) {
                        throw new NodeApiError(this.getNode(), error);
                    }
                }
                //https://developer.getflow.com/api/#tasks_get-task
                if (operation === 'get') {
                    const taskId = this.getNodeParameter('taskId', i);
                    const filters = this.getNodeParameter('filters', i);
                    qs.organization_id = credentials.organizationId;
                    if (filters.include) {
                        qs.include = filters.include.join(',');
                    }
                    try {
                        responseData = await flowApiRequest.call(this, 'GET', `/tasks/${taskId}`, {}, qs);
                    }
                    catch (error) {
                        throw new NodeApiError(this.getNode(), error);
                    }
                }
                //https://developer.getflow.com/api/#tasks_get-tasks
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const filters = this.getNodeParameter('filters', i);
                    qs.organization_id = credentials.organizationId;
                    if (filters.include) {
                        qs.include = filters.include.join(',');
                    }
                    if (filters.order) {
                        qs.order = filters.order;
                    }
                    if (filters.workspaceId) {
                        qs.workspace_id = filters.workspaceId;
                    }
                    if (filters.createdBefore) {
                        qs.created_before = filters.createdBefore;
                    }
                    if (filters.createdAfter) {
                        qs.created_after = filters.createdAfter;
                    }
                    if (filters.updateBefore) {
                        qs.updated_before = filters.updateBefore;
                    }
                    if (filters.updateAfter) {
                        qs.updated_after = filters.updateAfter;
                    }
                    if (filters.deleted) {
                        qs.deleted = filters.deleted;
                    }
                    if (filters.cleared) {
                        qs.cleared = filters.cleared;
                    }
                    try {
                        if (returnAll) {
                            responseData = await FlowApiRequestAllItems.call(this, 'tasks', 'GET', '/tasks', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await flowApiRequest.call(this, 'GET', '/tasks', {}, qs);
                            responseData = responseData.tasks;
                        }
                    }
                    catch (error) {
                        throw new NodeApiError(this.getNode(), error, { itemIndex: i });
                    }
                }
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        return [returnData];
    }
}
//# sourceMappingURL=Flow.node.js.map