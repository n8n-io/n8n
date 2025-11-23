import type { IDataObject, INode } from 'n8n-workflow';
import {
	assertParamIsString,
	assertParamIsNumber,
	assertParamIsOfAnyTypes,
	validateNodeParameters,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { TodoistResponse } from './Service';
import type { Context } from '../GenericFunctions';
import { FormatDueDatetime, todoistApiRequest, todoistSyncRequest } from '../GenericFunctions';

// Helper function for string or number validation
function assertValidTodoistId(
	parameterName: string,
	value: unknown,
	node: INode,
): asserts value is string | number {
	assertParamIsOfAnyTypes(parameterName, value, ['string', 'number'] as const, node);
}

export interface OperationHandler {
	handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse>;
}

export interface CreateTaskRequest {
	content?: string;
	description?: string;
	project_id?: number | string;
	section_id?: number | string;
	parent_id?: number | string;
	order?: number;
	labels?: string[];
	priority?: number | string;
	due_string?: string;
	due_datetime?: string;
	due_date?: string;
	due_lang?: string;
	assignee_id?: string;
	duration?: number;
	duration_unit?: string;
	deadline_date?: string;
}

export interface SyncRequest {
	commands: Command[];
	temp_id_mapping?: IDataObject;
}

export interface Command {
	type: CommandType;
	uuid: string;
	temp_id?: string;
	args: {
		parent_id?: number | string;
		id?: number | string;
		section_id?: number | string;
		project_id?: number | string;
		section?: string;
		content?: string;
		item_id?: number | string;
		due?: Record<string, unknown>;
		type?: string;
		minute_offset?: number;
		notify_uid?: string;
	};
}

export const CommandTypes = {
	// Item/Task commands
	ITEM_MOVE: 'item_move',
	ITEM_ADD: 'item_add',
	ITEM_UPDATE: 'item_update',
	ITEM_REORDER: 'item_reorder',
	ITEM_DELETE: 'item_delete',
	ITEM_COMPLETE: 'item_complete',
	ITEM_UNCOMPLETE: 'item_uncomplete',
	ITEM_CLOSE: 'item_close',
	// Project commands
	PROJECT_ADD: 'project_add',
	PROJECT_UPDATE: 'project_update',
	PROJECT_DELETE: 'project_delete',
	PROJECT_ARCHIVE: 'project_archive',
	PROJECT_UNARCHIVE: 'project_unarchive',
	PROJECT_REORDER: 'project_reorder',
	// Section commands
	SECTION_ADD: 'section_add',
	SECTION_UPDATE: 'section_update',
	SECTION_DELETE: 'section_delete',
	SECTION_ARCHIVE: 'section_archive',
	SECTION_UNARCHIVE: 'section_unarchive',
	SECTION_MOVE: 'section_move',
	SECTION_REORDER: 'section_reorder',
	// Label commands
	LABEL_ADD: 'label_add',
	LABEL_UPDATE: 'label_update',
	LABEL_DELETE: 'label_delete',
	LABEL_UPDATE_ORDERS: 'label_update_orders',
	// Filter commands
	FILTER_ADD: 'filter_add',
	FILTER_UPDATE: 'filter_update',
	FILTER_DELETE: 'filter_delete',
	FILTER_UPDATE_ORDERS: 'filter_update_orders',
	// Reminder commands
	REMINDER_ADD: 'reminder_add',
	REMINDER_UPDATE: 'reminder_update',
	REMINDER_DELETE: 'reminder_delete',
	// Note commands
	NOTE_ADD: 'note_add',
	NOTE_UPDATE: 'note_update',
	NOTE_DELETE: 'note_delete',
	// Sharing commands
	SHARE_PROJECT: 'share_project',
	DELETE_COLLABORATOR: 'delete_collaborator',
	ACCEPT_INVITATION: 'accept_invitation',
	REJECT_INVITATION: 'reject_invitation',
	DELETE_INVITATION: 'delete_invitation',
	// User settings
	USER_UPDATE: 'user_update',
	USER_UPDATE_GOALS: 'user_update_goals',
} as const;

export type CommandType = (typeof CommandTypes)[keyof typeof CommandTypes];

export class CreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://developer.todoist.com/rest/v2/#create-a-new-task
		const content = ctx.getNodeParameter('content', itemIndex);
		assertParamIsString('content', content, ctx.getNode());

		const projectId = ctx.getNodeParameter('project', itemIndex, undefined, {
			extractValue: true,
		});
		assertValidTodoistId('project', projectId, ctx.getNode());

		const labels = ctx.getNodeParameter('labels', itemIndex) as string[];
		const options = ctx.getNodeParameter('options', itemIndex) as IDataObject;

		validateNodeParameters(
			options,
			{
				description: { type: 'string' },
				dueDateTime: { type: 'string' },
				dueString: { type: 'string' },
				section: { type: ['string', 'number'] },
				dueLang: { type: 'string' },
				parentId: { type: ['string', 'number'] },
				priority: { type: ['string', 'number'] },
				order: { type: 'number' },
				dueDate: { type: 'string' },
				assigneeId: { type: 'string' },
				duration: { type: 'number' },
				durationUnit: { type: 'string' },
				deadlineDate: { type: 'string' },
			},
			ctx.getNode(),
		);

		const body: CreateTaskRequest = {
			content,
			project_id: projectId,
			priority:
				typeof options.priority === 'string'
					? parseInt(options.priority, 10)
					: (options.priority ?? 1),
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
			body.labels = labels;
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

		if (options.order) {
			body.order = options.order;
		}

		if (options.dueDate) {
			body.due_date = options.dueDate;
		}

		if (options.assigneeId) {
			body.assignee_id = options.assigneeId;
		}

		if (options.duration) {
			body.duration = options.duration;
		}

		if (options.durationUnit) {
			body.duration_unit = options.durationUnit;
		}

		if (options.deadlineDate) {
			body.deadline_date = options.deadlineDate;
		}

		const data = await todoistApiRequest.call(ctx, 'POST', '/tasks', body as IDataObject);

		return {
			data,
		};
	}
}

export class CloseHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex);
		assertValidTodoistId('taskId', id, ctx.getNode());

		await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}/close`);

		return {
			success: true,
		};
	}
}

export class DeleteHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex);
		assertValidTodoistId('taskId', id, ctx.getNode());

		await todoistApiRequest.call(ctx, 'DELETE', `/tasks/${id}`);

		return {
			success: true,
		};
	}
}

export class GetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex);
		assertValidTodoistId('taskId', id, ctx.getNode());

		const responseData = await todoistApiRequest.call(ctx, 'GET', `/tasks/${id}`);
		return {
			data: responseData,
		};
	}
}

export class GetAllHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://developer.todoist.com/rest/v2/#get-active-tasks
		const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;
		const filters = ctx.getNodeParameter('filters', itemIndex) as IDataObject;

		validateNodeParameters(
			filters,
			{
				projectId: { type: ['string', 'number'] },
				sectionId: { type: ['string', 'number'] },
				labelId: { type: ['string', 'number'] },
				filter: { type: 'string' },
				lang: { type: 'string' },
				ids: { type: 'string' },
			},
			ctx.getNode(),
		);

		const qs: IDataObject = {};

		if (filters.projectId) {
			qs.project_id = filters.projectId;
		}
		if (filters.sectionId) {
			qs.section_id = filters.sectionId;
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
			assertParamIsNumber('limit', limit, ctx.getNode());
			responseData = responseData.splice(0, limit);
		}

		return {
			data: responseData,
		};
	}
}

export class ReopenHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://developer.todoist.com/rest/v2/#get-an-active-task
		const id = ctx.getNodeParameter('taskId', itemIndex);
		assertValidTodoistId('taskId', id, ctx.getNode());

		await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}/reopen`);

		return {
			success: true,
		};
	}
}

export class UpdateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://developer.todoist.com/rest/v2/#update-a-task
		const id = ctx.getNodeParameter('taskId', itemIndex);
		assertValidTodoistId('taskId', id, ctx.getNode());

		const updateFields = ctx.getNodeParameter('updateFields', itemIndex) as IDataObject;
		validateNodeParameters(
			updateFields,
			{
				content: { type: 'string' },
				priority: { type: ['number', 'string'] },
				description: { type: 'string' },
				dueDateTime: { type: 'string' },
				dueString: { type: 'string' },
				labels: { type: 'string[]' },
				dueLang: { type: 'string' },
				order: { type: 'number' },
				dueDate: { type: 'string' },
				assigneeId: { type: 'string' },
				duration: { type: 'number' },
				durationUnit: { type: 'string' },
				deadlineDate: { type: 'string' },
			},
			ctx.getNode(),
		);

		const body: CreateTaskRequest = {};

		if (updateFields.content) {
			body.content = updateFields.content;
		}

		if (updateFields.priority) {
			body.priority = updateFields.priority;
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

		if (
			updateFields.labels !== undefined &&
			Array.isArray(updateFields.labels) &&
			updateFields.labels.length !== 0
		) {
			body.labels = updateFields.labels;
		}

		if (updateFields.dueLang) {
			body.due_lang = updateFields.dueLang;
		}

		if (updateFields.order) {
			body.order = updateFields.order;
		}

		if (updateFields.dueDate) {
			body.due_date = updateFields.dueDate;
		}

		if (updateFields.assigneeId) {
			body.assignee_id = updateFields.assigneeId;
		}

		if (updateFields.duration) {
			body.duration = updateFields.duration;
		}

		if (updateFields.durationUnit) {
			body.duration_unit = updateFields.durationUnit;
		}

		if (updateFields.deadlineDate) {
			body.deadline_date = updateFields.deadlineDate;
		}

		await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}`, body as IDataObject);

		return { success: true };
	}
}

export class MoveHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://api.todoist.com/sync/v9/sync
		const taskId = ctx.getNodeParameter('taskId', itemIndex);
		assertValidTodoistId('taskId', taskId, ctx.getNode());

		const projectId = ctx.getNodeParameter('project', itemIndex, undefined, {
			extractValue: true,
		});
		assertValidTodoistId('project', projectId, ctx.getNode());
		const nodeVersion = ctx.getNode().typeVersion;

		const body: SyncRequest = {
			commands: [
				{
					type: CommandTypes.ITEM_MOVE,
					uuid: uuid(),
					args: {
						id: taskId,
						// Set section_id only if node version is below 2.1
						...(nodeVersion < 2.1
							? {
									section_id: (() => {
										const section = ctx.getNodeParameter('section', itemIndex);
										assertValidTodoistId('section', section, ctx.getNode());
										return section;
									})(),
								}
							: {}),
					},
				},
			],
		};

		if (nodeVersion >= 2.1) {
			const options = ctx.getNodeParameter('options', itemIndex, {}) as IDataObject;
			validateNodeParameters(
				options,
				{
					parent: { type: ['string', 'number'] },
					section: { type: ['string', 'number'] },
				},
				ctx.getNode(),
			);

			// Only one of parent_id, section_id, or project_id must be set to move the task
			if (options.parent) {
				body.commands[0].args.parent_id = options.parent;
			} else if (options.section) {
				body.commands[0].args.section_id = options.section;
			} else {
				body.commands[0].args.project_id = projectId;
			}
		}

		await todoistSyncRequest.call(ctx, body);
		return { success: true };
	}
}

// Project Handlers
export class ProjectCreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const name = ctx.getNodeParameter('name', itemIndex);
		assertParamIsString('name', name, ctx.getNode());

		const options = ctx.getNodeParameter('projectOptions', itemIndex) as IDataObject;
		validateNodeParameters(
			options,
			{
				color: { type: 'string' },
				is_favorite: { type: 'boolean' },
				parent_id: { type: 'string' },
				view_style: { type: 'string' },
			},
			ctx.getNode(),
		);

		const body: IDataObject = {
			name,
			...options,
		};

		const data = await todoistApiRequest.call(ctx, 'POST', '/projects', body);
		return { data };
	}
}

export class ProjectDeleteHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('projectId', itemIndex);
		assertValidTodoistId('projectId', id, ctx.getNode());

		await todoistApiRequest.call(ctx, 'DELETE', `/projects/${id}`);
		return { success: true };
	}
}

export class ProjectGetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('projectId', itemIndex);
		assertValidTodoistId('projectId', id, ctx.getNode());

		const data = await todoistApiRequest.call(ctx, 'GET', `/projects/${id}`);
		return { data };
	}
}

export class ProjectGetAllHandler implements OperationHandler {
	async handleOperation(ctx: Context, _itemIndex: number): Promise<TodoistResponse> {
		const data = await todoistApiRequest.call(ctx, 'GET', '/projects');
		return { data };
	}
}

export class ProjectUpdateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('projectId', itemIndex);
		assertValidTodoistId('projectId', id, ctx.getNode());

		const updateFields = ctx.getNodeParameter('projectUpdateFields', itemIndex) as IDataObject;
		validateNodeParameters(
			updateFields,
			{
				name: { type: 'string' },
				color: { type: 'string' },
				is_favorite: { type: 'boolean' },
				view_style: { type: 'string' },
			},
			ctx.getNode(),
		);

		await todoistApiRequest.call(ctx, 'POST', `/projects/${id}`, updateFields);
		return { success: true };
	}
}

export class ProjectArchiveHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('projectId', itemIndex);
		assertValidTodoistId('projectId', id, ctx.getNode());

		await todoistApiRequest.call(ctx, 'POST', `/projects/${id}/archive`);
		return { success: true };
	}
}

export class ProjectUnarchiveHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('projectId', itemIndex);
		assertValidTodoistId('projectId', id, ctx.getNode());

		await todoistApiRequest.call(ctx, 'POST', `/projects/${id}/unarchive`);
		return { success: true };
	}
}

export class ProjectGetCollaboratorsHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('projectId', itemIndex);
		assertValidTodoistId('projectId', id, ctx.getNode());

		const data = await todoistApiRequest.call(ctx, 'GET', `/projects/${id}/collaborators`);
		return { data };
	}
}

// Section Handlers
export class SectionCreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const name = ctx.getNodeParameter('sectionName', itemIndex);
		assertParamIsString('sectionName', name, ctx.getNode());

		const projectId = ctx.getNodeParameter('sectionProject', itemIndex, undefined, {
			extractValue: true,
		});
		assertValidTodoistId('sectionProject', projectId, ctx.getNode());

		const options = ctx.getNodeParameter('sectionOptions', itemIndex) as IDataObject;
		validateNodeParameters(
			options,
			{
				order: { type: 'number' },
			},
			ctx.getNode(),
		);

		const body: IDataObject = {
			name,
			project_id: projectId,
			...options,
		};

		const data = await todoistApiRequest.call(ctx, 'POST', '/sections', body);
		return { data };
	}
}

export class SectionDeleteHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('sectionId', itemIndex);
		assertValidTodoistId('sectionId', id, ctx.getNode());

		await todoistApiRequest.call(ctx, 'DELETE', `/sections/${id}`);
		return { success: true };
	}
}

export class SectionGetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('sectionId', itemIndex);
		assertValidTodoistId('sectionId', id, ctx.getNode());

		const data = await todoistApiRequest.call(ctx, 'GET', `/sections/${id}`);
		return { data };
	}
}

export class SectionGetAllHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const filters = ctx.getNodeParameter('sectionFilters', itemIndex) as IDataObject;
		const qs: IDataObject = {};

		if (filters.project_id) {
			assertValidTodoistId('project_id', filters.project_id, ctx.getNode());
			qs.project_id = filters.project_id;
		}

		const data = await todoistApiRequest.call(ctx, 'GET', '/sections', {}, qs);
		return { data };
	}
}

export class SectionUpdateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('sectionId', itemIndex);
		assertValidTodoistId('sectionId', id, ctx.getNode());

		const updateFields = ctx.getNodeParameter('sectionUpdateFields', itemIndex) as IDataObject;
		validateNodeParameters(
			updateFields,
			{
				name: { type: 'string' },
			},
			ctx.getNode(),
		);

		await todoistApiRequest.call(ctx, 'POST', `/sections/${id}`, updateFields);
		return { success: true };
	}
}

// Comment Handlers
export class CommentCreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const taskId = ctx.getNodeParameter('commentTaskId', itemIndex);
		assertValidTodoistId('commentTaskId', taskId, ctx.getNode());

		const content = ctx.getNodeParameter('commentContent', itemIndex);
		assertParamIsString('commentContent', content, ctx.getNode());

		const body: IDataObject = {
			task_id: taskId,
			content,
		};

		const data = await todoistApiRequest.call(ctx, 'POST', '/comments', body);
		return { data };
	}
}

export class CommentDeleteHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('commentId', itemIndex);
		assertValidTodoistId('commentId', id, ctx.getNode());

		await todoistApiRequest.call(ctx, 'DELETE', `/comments/${id}`);
		return { success: true };
	}
}

export class CommentGetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('commentId', itemIndex);
		assertValidTodoistId('commentId', id, ctx.getNode());

		const data = await todoistApiRequest.call(ctx, 'GET', `/comments/${id}`);
		return { data };
	}
}

export class CommentGetAllHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const filters = ctx.getNodeParameter('commentFilters', itemIndex) as IDataObject;
		const qs: IDataObject = {};

		if (filters.task_id) {
			assertValidTodoistId('task_id', filters.task_id, ctx.getNode());
			qs.task_id = filters.task_id;
		}

		if (filters.project_id) {
			assertValidTodoistId('project_id', filters.project_id, ctx.getNode());
			qs.project_id = filters.project_id;
		}

		const data = await todoistApiRequest.call(ctx, 'GET', '/comments', {}, qs);
		return { data };
	}
}

export class CommentUpdateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('commentId', itemIndex);
		assertValidTodoistId('commentId', id, ctx.getNode());

		const updateFields = ctx.getNodeParameter('commentUpdateFields', itemIndex) as IDataObject;
		validateNodeParameters(
			updateFields,
			{
				content: { type: 'string' },
			},
			ctx.getNode(),
		);

		await todoistApiRequest.call(ctx, 'POST', `/comments/${id}`, updateFields);
		return { success: true };
	}
}

// Label Handlers
export class LabelCreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const name = ctx.getNodeParameter('labelName', itemIndex);
		assertParamIsString('labelName', name, ctx.getNode());

		const options = ctx.getNodeParameter('labelOptions', itemIndex) as IDataObject;
		validateNodeParameters(
			options,
			{
				color: { type: 'string' },
				order: { type: 'number' },
				is_favorite: { type: 'boolean' },
			},
			ctx.getNode(),
		);

		const body: IDataObject = {
			name,
			...options,
		};

		const data = await todoistApiRequest.call(ctx, 'POST', '/labels', body);
		return { data };
	}
}

export class LabelDeleteHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('labelId', itemIndex);
		assertValidTodoistId('labelId', id, ctx.getNode());

		await todoistApiRequest.call(ctx, 'DELETE', `/labels/${id}`);
		return { success: true };
	}
}

export class LabelGetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('labelId', itemIndex);
		assertValidTodoistId('labelId', id, ctx.getNode());

		const data = await todoistApiRequest.call(ctx, 'GET', `/labels/${id}`);
		return { data };
	}
}

export class LabelGetAllHandler implements OperationHandler {
	async handleOperation(ctx: Context, _itemIndex: number): Promise<TodoistResponse> {
		const data = await todoistApiRequest.call(ctx, 'GET', '/labels');
		return { data };
	}
}

export class LabelUpdateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('labelId', itemIndex);
		assertValidTodoistId('labelId', id, ctx.getNode());

		const updateFields = ctx.getNodeParameter('labelUpdateFields', itemIndex) as IDataObject;
		validateNodeParameters(
			updateFields,
			{
				name: { type: 'string' },
				color: { type: 'string' },
				order: { type: 'number' },
				is_favorite: { type: 'boolean' },
			},
			ctx.getNode(),
		);

		await todoistApiRequest.call(ctx, 'POST', `/labels/${id}`, updateFields);
		return { success: true };
	}
}

export class QuickAddHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const text = ctx.getNodeParameter('text', itemIndex);
		assertParamIsString('text', text, ctx.getNode());

		const options = ctx.getNodeParameter('options', itemIndex, {}) as IDataObject;
		validateNodeParameters(
			options,
			{
				note: { type: 'string' },
				reminder: { type: 'string' },
				auto_reminder: { type: 'boolean' },
			},
			ctx.getNode(),
		);

		const body: IDataObject = { text };

		if (options.note) {
			body.note = options.note;
		}

		if (options.reminder) {
			body.reminder = options.reminder;
		}

		if (options.auto_reminder) {
			body.auto_reminder = options.auto_reminder;
		}

		const data = await todoistSyncRequest.call(ctx, body, {}, '/quick/add');

		return {
			data,
		};
	}
}

// Reminder Handlers
export class ReminderCreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const itemId = ctx.getNodeParameter('itemId', itemIndex);
		assertValidTodoistId('itemId', itemId, ctx.getNode());

		const dueDateType = ctx.getNodeParameter('dueDateType', itemIndex) as string;
		assertParamIsString('dueDateType', dueDateType, ctx.getNode());

		const due: IDataObject = {};

		if (dueDateType === 'natural_language') {
			const naturalLanguageRep = ctx.getNodeParameter('natural_language_representation', itemIndex);
			assertParamIsString('natural_language_representation', naturalLanguageRep, ctx.getNode());
			due.string = naturalLanguageRep;
		} else if (dueDateType === 'full_day') {
			const date = ctx.getNodeParameter('date', itemIndex);
			assertParamIsString('date', date, ctx.getNode());
			due.date = date;
		} else if (dueDateType === 'floating_time') {
			const datetime = ctx.getNodeParameter('datetime', itemIndex);
			assertParamIsString('datetime', datetime, ctx.getNode());
			due.datetime = datetime;
		} else if (dueDateType === 'fixed_timezone') {
			const datetime = ctx.getNodeParameter('datetime', itemIndex);
			const timezone = ctx.getNodeParameter('timezone', itemIndex);
			assertParamIsString('datetime', datetime, ctx.getNode());
			assertParamIsString('timezone', timezone, ctx.getNode());
			due.datetime = datetime;
			due.timezone = timezone;
		}

		const options = ctx.getNodeParameter('reminderOptions', itemIndex) as IDataObject;
		validateNodeParameters(
			options,
			{
				type: { type: 'string' },
				minute_offset: { type: 'number' },
				notify_uid: { type: 'string' },
			},
			ctx.getNode(),
		);

		const body: SyncRequest = {
			commands: [
				{
					type: CommandTypes.REMINDER_ADD,
					uuid: uuid(),
					temp_id: uuid(),
					args: {
						item_id: itemId,
						due,
						...options,
					},
				},
			],
		};

		await todoistSyncRequest.call(ctx, body);
		return { success: true };
	}
}

export class ReminderUpdateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('reminderId', itemIndex);
		assertValidTodoistId('reminderId', id, ctx.getNode());

		const updateFields = ctx.getNodeParameter('reminderUpdateFields', itemIndex) as IDataObject;
		validateNodeParameters(
			updateFields,
			{
				due: { type: 'object' },
				type: { type: 'string' },
				minute_offset: { type: 'number' },
				notify_uid: { type: 'string' },
			},
			ctx.getNode(),
		);

		const body: SyncRequest = {
			commands: [
				{
					type: CommandTypes.REMINDER_UPDATE,
					uuid: uuid(),
					args: {
						id,
						...updateFields,
					},
				},
			],
		};

		await todoistSyncRequest.call(ctx, body);
		return { success: true };
	}
}

export class ReminderDeleteHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('reminderId', itemIndex);
		assertValidTodoistId('reminderId', id, ctx.getNode());

		const body: SyncRequest = {
			commands: [
				{
					type: CommandTypes.REMINDER_DELETE,
					uuid: uuid(),
					args: {
						id,
					},
				},
			],
		};

		await todoistSyncRequest.call(ctx, body);
		return { success: true };
	}
}

export class ReminderGetAllHandler implements OperationHandler {
	async handleOperation(ctx: Context, _itemIndex: number): Promise<TodoistResponse> {
		const syncData = await todoistSyncRequest.call(ctx, {
			sync_token: '*',
			resource_types: ['reminders'],
		});

		return {
			data: syncData.reminders || [],
		};
	}
}
