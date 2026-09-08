import { jsonParse, UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { FormatDueDatetime, todoistApiRequest, todoistSyncRequest } from '../GenericFunctions';
export const CommandTypes = {
    ITEM_MOVE: 'item_move',
    ITEM_ADD: 'item_add',
    ITEM_UPDATE: 'item_update',
    ITEM_REORDER: 'item_reorder',
    ITEM_DELETE: 'item_delete',
    ITEM_COMPLETE: 'item_complete',
};
async function getLabelNameFromId(ctx, labelIds) {
    const labelList = [];
    for (const label of labelIds) {
        const thisLabel = await todoistApiRequest.call(ctx, 'GET', `/labels/${label}`);
        labelList.push(thisLabel.name);
    }
    return labelList;
}
export class CreateHandler {
    async handleOperation(ctx, itemIndex) {
        //https://developer.todoist.com/rest/v2/#create-a-new-task
        const content = ctx.getNodeParameter('content', itemIndex);
        const projectId = ctx.getNodeParameter('project', itemIndex, undefined, {
            extractValue: true,
        });
        const labels = ctx.getNodeParameter('labels', itemIndex);
        const options = ctx.getNodeParameter('options', itemIndex);
        const body = {
            content,
            project_id: projectId,
            priority: options.priority ? parseInt(options.priority, 10) : 1,
        };
        if (options.description) {
            body.description = options.description;
        }
        if (options.dueDateTime) {
            body.due_datetime = FormatDueDatetime(options.dueDateTime);
        }
        if (options.dueString) {
            body.due_string = options.dueString;
        }
        if (labels !== undefined && labels.length !== 0) {
            body.labels = await getLabelNameFromId(ctx, labels);
        }
        if (options.section) {
            body.section_id = options.section;
        }
        if (options.dueLang) {
            body.due_lang = options.dueLang;
        }
        if (options.parentId) {
            body.parent_id = options.parentId;
        }
        const data = await todoistApiRequest.call(ctx, 'POST', '/tasks', body);
        return {
            data,
        };
    }
}
export class CloseHandler {
    async handleOperation(ctx, itemIndex) {
        const id = ctx.getNodeParameter('taskId', itemIndex);
        await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}/close`);
        return {
            success: true,
        };
    }
}
export class DeleteHandler {
    async handleOperation(ctx, itemIndex) {
        const id = ctx.getNodeParameter('taskId', itemIndex);
        await todoistApiRequest.call(ctx, 'DELETE', `/tasks/${id}`);
        return {
            success: true,
        };
    }
}
export class GetHandler {
    async handleOperation(ctx, itemIndex) {
        const id = ctx.getNodeParameter('taskId', itemIndex);
        const responseData = await todoistApiRequest.call(ctx, 'GET', `/tasks/${id}`);
        return {
            data: responseData,
        };
    }
}
export class GetAllHandler {
    async handleOperation(ctx, itemIndex) {
        //https://developer.todoist.com/rest/v2/#get-active-tasks
        const returnAll = ctx.getNodeParameter('returnAll', itemIndex);
        const filters = ctx.getNodeParameter('filters', itemIndex);
        const qs = {};
        if (filters.projectId) {
            qs.project_id = filters.projectId;
        }
        if (filters.labelId) {
            qs.label = filters.labelId;
        }
        if (filters.filter) {
            qs.filter = filters.filter;
        }
        if (filters.lang) {
            qs.lang = filters.lang;
        }
        if (filters.ids) {
            qs.ids = filters.ids;
        }
        let responseData = await todoistApiRequest.call(ctx, 'GET', '/tasks', {}, qs);
        if (!returnAll) {
            const limit = ctx.getNodeParameter('limit', itemIndex);
            responseData = responseData.splice(0, limit);
        }
        return {
            data: responseData,
        };
    }
}
async function getSectionIds(ctx, projectId) {
    const sections = await todoistApiRequest.call(ctx, 'GET', '/sections', {}, { project_id: projectId });
    return new Map(sections.map((s) => [s.name, s.id]));
}
export class ReopenHandler {
    async handleOperation(ctx, itemIndex) {
        //https://developer.todoist.com/rest/v2/#get-an-active-task
        const id = ctx.getNodeParameter('taskId', itemIndex);
        await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}/reopen`);
        return {
            success: true,
        };
    }
}
export class UpdateHandler {
    async handleOperation(ctx, itemIndex) {
        //https://developer.todoist.com/rest/v2/#update-a-task
        const id = ctx.getNodeParameter('taskId', itemIndex);
        const updateFields = ctx.getNodeParameter('updateFields', itemIndex);
        const body = {};
        if (updateFields.content) {
            body.content = updateFields.content;
        }
        if (updateFields.priority) {
            body.priority = parseInt(updateFields.priority, 10);
        }
        if (updateFields.description) {
            body.description = updateFields.description;
        }
        if (updateFields.dueDateTime) {
            body.due_datetime = FormatDueDatetime(updateFields.dueDateTime);
        }
        if (updateFields.dueString) {
            body.due_string = updateFields.dueString;
        }
        if (updateFields.labels !== undefined &&
            Array.isArray(updateFields.labels) &&
            updateFields.labels.length !== 0) {
            body.labels = await getLabelNameFromId(ctx, updateFields.labels);
        }
        if (updateFields.dueLang) {
            body.due_lang = updateFields.dueLang;
        }
        await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}`, body);
        return { success: true };
    }
}
export class MoveHandler {
    async handleOperation(ctx, itemIndex) {
        //https://api.todoist.com/sync/v9/sync
        const taskId = ctx.getNodeParameter('taskId', itemIndex);
        const section = ctx.getNodeParameter('section', itemIndex);
        const body = {
            commands: [
                {
                    type: CommandTypes.ITEM_MOVE,
                    uuid: uuid(),
                    args: {
                        id: taskId,
                        section_id: section,
                    },
                },
            ],
        };
        await todoistSyncRequest.call(ctx, body);
        return { success: true };
    }
}
export class SyncHandler {
    async handleOperation(ctx, itemIndex) {
        const commandsJson = ctx.getNodeParameter('commands', itemIndex);
        const projectId = ctx.getNodeParameter('project', itemIndex, undefined, {
            extractValue: true,
        });
        const sections = await getSectionIds(ctx, projectId);
        const commands = jsonParse(commandsJson);
        const tempIdMapping = new Map();
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            this.enrichUUID(command);
            this.enrichSection(command, sections);
            this.enrichProjectId(command, projectId);
            this.enrichTempId(command, tempIdMapping, projectId);
        }
        const body = {
            commands,
            temp_id_mapping: this.convertToObject(tempIdMapping),
        };
        await todoistSyncRequest.call(ctx, body);
        return { success: true };
    }
    convertToObject(map) {
        return Array.from(map.entries()).reduce((o, [key, value]) => {
            o[key] = value;
            return o;
        }, {});
    }
    enrichUUID(command) {
        command.uuid = uuid();
    }
    enrichSection(command, sections) {
        if (command.args?.section !== undefined) {
            const sectionId = sections.get(command.args.section);
            if (sectionId) {
                command.args.section_id = sectionId;
            }
            else {
                throw new UserError('Section ' + command.args.section + " doesn't exist on Todoist", {
                    level: 'warning',
                });
            }
        }
    }
    enrichProjectId(command, projectId) {
        if (this.requiresProjectId(command)) {
            command.args.project_id = projectId;
        }
    }
    requiresProjectId(command) {
        return command.type === CommandTypes.ITEM_ADD;
    }
    enrichTempId(command, tempIdMapping, projectId) {
        if (this.requiresTempId(command)) {
            command.temp_id = uuid();
            tempIdMapping.set(command.temp_id, projectId);
        }
    }
    requiresTempId(command) {
        return command.type === CommandTypes.ITEM_ADD;
    }
}
//# sourceMappingURL=OperationHandler.js.map