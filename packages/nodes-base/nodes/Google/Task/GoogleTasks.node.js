import { NodeConnectionTypes } from 'n8n-workflow';
import { googleApiRequest, googleApiRequestAllItems } from './GenericFunctions';
import { taskFields, taskOperations } from './TaskDescription';
export class GoogleTasks {
    description = {
        displayName: 'Google Tasks',
        name: 'googleTasks',
        icon: 'file:googleTasks.svg',
        group: ['input'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Google Tasks API',
        schemaPath: 'Google/Task',
        defaults: {
            name: 'Google Tasks',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'googleTasksOAuth2Api',
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
                    },
                ],
                default: 'task',
            },
            ...taskOperations,
            ...taskFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the tasklists to display them to user so that they can select them easily
            async getTasks() {
                const returnData = [];
                const tasks = await googleApiRequestAllItems.call(this, 'items', 'GET', '/tasks/v1/users/@me/lists');
                for (const task of tasks) {
                    const taskName = task.title;
                    const taskId = task.id;
                    returnData.push({
                        name: taskName,
                        value: taskId,
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        let body = {};
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'task') {
                    if (operation === 'create') {
                        body = {};
                        //https://developers.google.com/tasks/v1/reference/tasks/insert
                        const taskId = this.getNodeParameter('task', i);
                        body.title = this.getNodeParameter('title', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.parent) {
                            qs.parent = additionalFields.parent;
                        }
                        if (additionalFields.previous) {
                            qs.previous = additionalFields.previous;
                        }
                        if (additionalFields.status) {
                            body.status = additionalFields.status;
                        }
                        if (additionalFields.notes) {
                            body.notes = additionalFields.notes;
                        }
                        if (additionalFields.dueDate) {
                            body.due = additionalFields.dueDate;
                        }
                        if (additionalFields.completed) {
                            body.completed = additionalFields.completed;
                        }
                        if (additionalFields.deleted) {
                            body.deleted = additionalFields.deleted;
                        }
                        responseData = await googleApiRequest.call(this, 'POST', `/tasks/v1/lists/${taskId}/tasks`, body, qs);
                    }
                    if (operation === 'delete') {
                        //https://developers.google.com/tasks/v1/reference/tasks/delete
                        const taskListId = this.getNodeParameter('task', i);
                        const taskId = this.getNodeParameter('taskId', i);
                        responseData = await googleApiRequest.call(this, 'DELETE', `/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {});
                        responseData = { success: true };
                    }
                    if (operation === 'get') {
                        //https://developers.google.com/tasks/v1/reference/tasks/get
                        const taskListId = this.getNodeParameter('task', i);
                        const taskId = this.getNodeParameter('taskId', i);
                        responseData = await googleApiRequest.call(this, 'GET', `/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {}, qs);
                    }
                    if (operation === 'getAll') {
                        //https://developers.google.com/tasks/v1/reference/tasks/list
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const taskListId = this.getNodeParameter('task', i);
                        const { showCompleted = true, showDeleted = false, showHidden = false, ...options } = this.getNodeParameter('additionalFields', i);
                        if (options.completedMax) {
                            qs.completedMax = options.completedMax;
                        }
                        if (options.completedMin) {
                            qs.completedMin = options.completedMin;
                        }
                        if (options.dueMin) {
                            qs.dueMin = options.dueMin;
                        }
                        if (options.dueMax) {
                            qs.dueMax = options.dueMax;
                        }
                        qs.showCompleted = showCompleted;
                        qs.showDeleted = showDeleted;
                        qs.showHidden = showHidden;
                        if (options.updatedMin) {
                            qs.updatedMin = options.updatedMin;
                        }
                        if (returnAll) {
                            responseData = await googleApiRequestAllItems.call(this, 'items', 'GET', `/tasks/v1/lists/${taskListId}/tasks`, {}, qs);
                        }
                        else {
                            qs.maxResults = this.getNodeParameter('limit', i);
                            responseData = await googleApiRequest.call(this, 'GET', `/tasks/v1/lists/${taskListId}/tasks`, {}, qs);
                            responseData = responseData.items;
                        }
                    }
                    if (operation === 'update') {
                        body = {};
                        //https://developers.google.com/tasks/v1/reference/tasks/patch
                        const taskListId = this.getNodeParameter('task', i);
                        const taskId = this.getNodeParameter('taskId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        if (updateFields.previous) {
                            qs.previous = updateFields.previous;
                        }
                        if (updateFields.status) {
                            body.status = updateFields.status;
                        }
                        if (updateFields.notes) {
                            body.notes = updateFields.notes;
                        }
                        if (updateFields.title) {
                            body.title = updateFields.title;
                        }
                        if (updateFields.dueDate) {
                            body.due = updateFields.dueDate;
                        }
                        if (updateFields.completed) {
                            body.completed = updateFields.completed;
                        }
                        if (updateFields.deleted) {
                            body.deleted = updateFields.deleted;
                        }
                        responseData = await googleApiRequest.call(this, 'PATCH', `/tasks/v1/lists/${taskListId}/tasks/${taskId}`, body, qs);
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=GoogleTasks.node.js.map