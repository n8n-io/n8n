import { CloseHandler, CreateHandler, DeleteHandler, GetAllHandler, GetHandler, MoveHandler, QuickAddHandler, ReopenHandler, UpdateHandler, 
// Project handlers
ProjectCreateHandler, ProjectDeleteHandler, ProjectGetHandler, ProjectGetAllHandler, ProjectUpdateHandler, ProjectArchiveHandler, ProjectUnarchiveHandler, ProjectGetCollaboratorsHandler, 
// Section handlers
SectionCreateHandler, SectionDeleteHandler, SectionGetHandler, SectionGetAllHandler, SectionUpdateHandler, 
// Comment handlers
CommentCreateHandler, CommentDeleteHandler, CommentGetHandler, CommentGetAllHandler, CommentUpdateHandler, 
// Label handlers
LabelCreateHandler, LabelDeleteHandler, LabelGetHandler, LabelGetAllHandler, LabelUpdateHandler, 
// Reminder handlers
ReminderCreateHandler, ReminderDeleteHandler, ReminderGetAllHandler, ReminderUpdateHandler, } from './OperationHandler';
export class TodoistService {
    async executeTask(ctx, operation, itemIndex) {
        return await this.handlers[operation].handleOperation(ctx, itemIndex);
    }
    handlers = {
        create: new CreateHandler(),
        close: new CloseHandler(),
        delete: new DeleteHandler(),
        get: new GetHandler(),
        getAll: new GetAllHandler(),
        reopen: new ReopenHandler(),
        update: new UpdateHandler(),
        move: new MoveHandler(),
        quickAdd: new QuickAddHandler(),
    };
    projectHandlers = {
        create: new ProjectCreateHandler(),
        delete: new ProjectDeleteHandler(),
        get: new ProjectGetHandler(),
        getAll: new ProjectGetAllHandler(),
        update: new ProjectUpdateHandler(),
        archive: new ProjectArchiveHandler(),
        unarchive: new ProjectUnarchiveHandler(),
        getCollaborators: new ProjectGetCollaboratorsHandler(),
    };
    sectionHandlers = {
        create: new SectionCreateHandler(),
        delete: new SectionDeleteHandler(),
        get: new SectionGetHandler(),
        getAll: new SectionGetAllHandler(),
        update: new SectionUpdateHandler(),
    };
    commentHandlers = {
        create: new CommentCreateHandler(),
        delete: new CommentDeleteHandler(),
        get: new CommentGetHandler(),
        getAll: new CommentGetAllHandler(),
        update: new CommentUpdateHandler(),
    };
    labelHandlers = {
        create: new LabelCreateHandler(),
        delete: new LabelDeleteHandler(),
        get: new LabelGetHandler(),
        getAll: new LabelGetAllHandler(),
        update: new LabelUpdateHandler(),
    };
    reminderHandlers = {
        create: new ReminderCreateHandler(),
        delete: new ReminderDeleteHandler(),
        getAll: new ReminderGetAllHandler(),
        update: new ReminderUpdateHandler(),
    };
    async executeProject(ctx, operation, itemIndex) {
        return await this.projectHandlers[operation].handleOperation(ctx, itemIndex);
    }
    async executeSection(ctx, operation, itemIndex) {
        return await this.sectionHandlers[operation].handleOperation(ctx, itemIndex);
    }
    async executeComment(ctx, operation, itemIndex) {
        return await this.commentHandlers[operation].handleOperation(ctx, itemIndex);
    }
    async executeLabel(ctx, operation, itemIndex) {
        return await this.labelHandlers[operation].handleOperation(ctx, itemIndex);
    }
    async executeReminder(ctx, operation, itemIndex) {
        return await this.reminderHandlers[operation].handleOperation(ctx, itemIndex);
    }
}
// Define operations as const arrays - source of truth
const TASK_OPERATIONS = [
    'create',
    'close',
    'delete',
    'get',
    'getAll',
    'reopen',
    'update',
    'move',
    'quickAdd',
];
const PROJECT_OPERATIONS = [
    'create',
    'delete',
    'get',
    'getAll',
    'update',
    'archive',
    'unarchive',
    'getCollaborators',
];
const SECTION_OPERATIONS = ['create', 'delete', 'get', 'getAll', 'update'];
const COMMENT_OPERATIONS = ['create', 'delete', 'get', 'getAll', 'update'];
const LABEL_OPERATIONS = ['create', 'delete', 'get', 'getAll', 'update'];
const REMINDER_OPERATIONS = ['create', 'delete', 'getAll', 'update'];
// Type guards using the same arrays
export function isTaskOperationType(operation) {
    return TASK_OPERATIONS.includes(operation);
}
export function isProjectOperationType(operation) {
    return PROJECT_OPERATIONS.includes(operation);
}
export function isSectionOperationType(operation) {
    return SECTION_OPERATIONS.includes(operation);
}
export function isCommentOperationType(operation) {
    return COMMENT_OPERATIONS.includes(operation);
}
export function isLabelOperationType(operation) {
    return LABEL_OPERATIONS.includes(operation);
}
export function isReminderOperationType(operation) {
    return REMINDER_OPERATIONS.includes(operation);
}
//# sourceMappingURL=Service.js.map