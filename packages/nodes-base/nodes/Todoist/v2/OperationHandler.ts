import type { IDataObject } from 'n8n-workflow';
import { ApplicationError, jsonParse } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import {
	assertIsString,
	assertIsNumber,
	assertIsStringOrNumber,
	assertIsNodeParameters,
} from '../../../utils/types';

import type { Section, TodoistResponse } from './Service';
import type { Context } from '../GenericFunctions';
import { FormatDueDatetime, todoistApiRequest, todoistSyncRequest } from '../GenericFunctions';

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
		assertIsString('content', content);

		const projectId = ctx.getNodeParameter('project', itemIndex, undefined, {
			extractValue: true,
		});
		assertIsStringOrNumber('project', projectId);

		const labels = ctx.getNodeParameter('labels', itemIndex) as string[];
		const options = ctx.getNodeParameter('options', itemIndex) as IDataObject;

		assertIsNodeParameters<{
			description?: string;
			dueDateTime?: string;
			dueString?: string;
			section?: string | number;
			dueLang?: string;
			parentId?: string | number;
			priority?: string | number;
		}>(options, {
			description: { type: 'string', optional: true },
			dueDateTime: { type: 'string', optional: true },
			dueString: { type: 'string', optional: true },
			section: { type: ['string', 'number'], optional: true },
			dueLang: { type: 'string', optional: true },
			parentId: { type: ['string', 'number'], optional: true },
			priority: { type: ['string', 'number'], optional: true },
		});

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

		const data = await todoistApiRequest.call(ctx, 'POST', '/tasks', body as IDataObject);

		return {
			data,
		};
	}
}

export class CloseHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex);
		assertIsStringOrNumber('taskId', id);

		await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}/close`);

		return {
			success: true,
		};
	}
}

export class DeleteHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex);
		assertIsStringOrNumber('taskId', id);

		await todoistApiRequest.call(ctx, 'DELETE', `/tasks/${id}`);

		return {
			success: true,
		};
	}
}

export class GetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex);
		assertIsStringOrNumber('taskId', id);

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

		assertIsNodeParameters<{
			projectId?: string | number;
			sectionId?: string | number;
			labelId?: string | number;
			filter?: string;
			lang?: string;
			ids?: string;
		}>(filters, {
			projectId: { type: ['string', 'number'], optional: true },
			sectionId: { type: ['string', 'number'], optional: true },
			labelId: { type: ['string', 'number'], optional: true },
			filter: { type: 'string', optional: true },
			lang: { type: 'string', optional: true },
			ids: { type: 'string', optional: true },
		});

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
			assertIsNumber('limit', limit);
			responseData = responseData.splice(0, limit);
		}

		return {
			data: responseData,
		};
	}
}

async function getSectionIds(
	ctx: Context,
	projectId: string | number,
): Promise<Map<string, number>> {
	const sections: Section[] = await todoistApiRequest.call(
		ctx,
		'GET',
		'/sections',
		{},
		{ project_id: projectId },
	);
	return new Map(sections.map((s) => [s.name, s.id as unknown as number]));
}

export class ReopenHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://developer.todoist.com/rest/v2/#get-an-active-task
		const id = ctx.getNodeParameter('taskId', itemIndex);
		assertIsStringOrNumber('taskId', id);

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
		assertIsStringOrNumber('taskId', id);

		const updateFields = ctx.getNodeParameter('updateFields', itemIndex) as IDataObject;
		assertIsNodeParameters<{
			content?: string;
			priority?: number | string;
			description?: string;
			dueDateTime?: string;
			dueString?: string;
			labels?: string[];
			dueLang?: string;
		}>(updateFields, {
			content: { type: 'string', optional: true },
			priority: { type: ['number', 'string'], optional: true },
			description: { type: 'string', optional: true },
			dueDateTime: { type: 'string', optional: true },
			dueString: { type: 'string', optional: true },
			labels: { type: 'string[]', optional: true },
			dueLang: { type: 'string', optional: true },
		});

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

		await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}`, body as IDataObject);

		return { success: true };
	}
}

export class MoveHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://api.todoist.com/sync/v9/sync
		const taskId = ctx.getNodeParameter('taskId', itemIndex);
		assertIsStringOrNumber('taskId', taskId);

		const projectId = ctx.getNodeParameter('project', itemIndex, undefined, {
			extractValue: true,
		});
		assertIsStringOrNumber('project', projectId);
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
										assertIsStringOrNumber('section', section);
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
			assertIsNodeParameters<{
				parent?: string | number;
				section?: string | number;
			}>(options, {
				parent: { type: ['string', 'number'], optional: true },
				section: { type: ['string', 'number'], optional: true },
			});

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

export class SyncHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const commandsJson = ctx.getNodeParameter('commands', itemIndex);
		assertIsString('commands', commandsJson);

		const projectId = ctx.getNodeParameter('project', itemIndex, undefined, {
			extractValue: true,
		});
		assertIsStringOrNumber('project', projectId);
		const sections = await getSectionIds(ctx, projectId);
		const commands: Command[] = jsonParse(commandsJson);
		const tempIdMapping = new Map<string, string>();

		for (let i = 0; i < commands.length; i++) {
			const command = commands[i];
			this.enrichUUID(command);
			this.enrichSection(command, sections);
			this.enrichProjectId(command, projectId);
			this.enrichTempId(command, tempIdMapping, projectId);
		}

		const body: SyncRequest = {
			commands,
			temp_id_mapping: this.convertToObject(tempIdMapping),
		};

		await todoistSyncRequest.call(ctx, body);

		return { success: true };
	}

	private convertToObject(map: Map<string, string>) {
		return Array.from(map.entries()).reduce((o, [key, value]) => {
			o[key] = value;
			return o;
		}, {} as IDataObject);
	}

	private enrichUUID(command: Command) {
		command.uuid = uuid();
	}

	private enrichSection(command: Command, sections: Map<string, number>) {
		if (command.args?.section !== undefined) {
			const sectionId = sections.get(command.args.section);
			if (sectionId) {
				command.args.section_id = sectionId;
			} else {
				throw new ApplicationError(
					'Section ' + command.args.section + " doesn't exist on Todoist",
					{ level: 'warning' },
				);
			}
		}
	}

	private enrichProjectId(command: Command, projectId: number | string) {
		if (this.requiresProjectId(command)) {
			command.args.project_id = projectId;
		}
	}

	private requiresProjectId(command: Command) {
		const commands: CommandType[] = [CommandTypes.ITEM_ADD, CommandTypes.SECTION_ADD];
		return commands.includes(command.type);
	}

	private enrichTempId(
		command: Command,
		tempIdMapping: Map<string, string>,
		projectId: string | number,
	) {
		if (this.requiresTempId(command)) {
			command.temp_id = uuid();
			tempIdMapping.set(command.temp_id, projectId as unknown as string);
		}
	}

	private requiresTempId(command: Command) {
		const commands: CommandType[] = [
			CommandTypes.ITEM_ADD,
			CommandTypes.PROJECT_ADD,
			CommandTypes.SECTION_ADD,
			CommandTypes.LABEL_ADD,
			CommandTypes.FILTER_ADD,
			CommandTypes.REMINDER_ADD,
			CommandTypes.NOTE_ADD,
		];
		return commands.includes(command.type);
	}
}

// Project Handlers
export class ProjectCreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const name = ctx.getNodeParameter('name', itemIndex);
		assertIsString('name', name);

		const options = ctx.getNodeParameter('projectOptions', itemIndex) as IDataObject;
		assertIsNodeParameters<{
			color?: string;
			is_favorite?: boolean;
			parent_id?: string;
			view_style?: string;
		}>(options, {
			color: { type: 'string', optional: true },
			is_favorite: { type: 'boolean', optional: true },
			parent_id: { type: 'string', optional: true },
			view_style: { type: 'string', optional: true },
		});

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
		assertIsStringOrNumber('projectId', id);

		await todoistApiRequest.call(ctx, 'DELETE', `/projects/${id}`);
		return { success: true };
	}
}

export class ProjectGetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('projectId', itemIndex);
		assertIsStringOrNumber('projectId', id);

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
		assertIsStringOrNumber('projectId', id);

		const updateFields = ctx.getNodeParameter('projectUpdateFields', itemIndex) as IDataObject;
		assertIsNodeParameters<{
			name?: string;
			color?: string;
			is_favorite?: boolean;
			view_style?: string;
		}>(updateFields, {
			name: { type: 'string', optional: true },
			color: { type: 'string', optional: true },
			is_favorite: { type: 'boolean', optional: true },
			view_style: { type: 'string', optional: true },
		});

		await todoistApiRequest.call(ctx, 'POST', `/projects/${id}`, updateFields);
		return { success: true };
	}
}

export class ProjectArchiveHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('projectId', itemIndex);
		assertIsStringOrNumber('projectId', id);

		await todoistApiRequest.call(ctx, 'POST', `/projects/${id}/archive`);
		return { success: true };
	}
}

export class ProjectUnarchiveHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('projectId', itemIndex);
		assertIsStringOrNumber('projectId', id);

		await todoistApiRequest.call(ctx, 'POST', `/projects/${id}/unarchive`);
		return { success: true };
	}
}

export class ProjectGetCollaboratorsHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('projectId', itemIndex);
		assertIsStringOrNumber('projectId', id);

		const data = await todoistApiRequest.call(ctx, 'GET', `/projects/${id}/collaborators`);
		return { data };
	}
}

// Section Handlers
export class SectionCreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const name = ctx.getNodeParameter('sectionName', itemIndex);
		assertIsString('sectionName', name);

		const projectId = ctx.getNodeParameter('sectionProject', itemIndex, undefined, {
			extractValue: true,
		});
		assertIsStringOrNumber('sectionProject', projectId);

		const options = ctx.getNodeParameter('sectionOptions', itemIndex) as IDataObject;
		assertIsNodeParameters<{
			order?: number;
		}>(options, {
			order: { type: 'number', optional: true },
		});

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
		assertIsStringOrNumber('sectionId', id);

		await todoistApiRequest.call(ctx, 'DELETE', `/sections/${id}`);
		return { success: true };
	}
}

export class SectionGetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('sectionId', itemIndex);
		assertIsStringOrNumber('sectionId', id);

		const data = await todoistApiRequest.call(ctx, 'GET', `/sections/${id}`);
		return { data };
	}
}

export class SectionGetAllHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const filters = ctx.getNodeParameter('sectionFilters', itemIndex) as IDataObject;
		const qs: IDataObject = {};

		if (filters.project_id) {
			assertIsStringOrNumber('project_id', filters.project_id);
			qs.project_id = filters.project_id;
		}

		const data = await todoistApiRequest.call(ctx, 'GET', '/sections', {}, qs);
		return { data };
	}
}

export class SectionUpdateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('sectionId', itemIndex);
		assertIsStringOrNumber('sectionId', id);

		const updateFields = ctx.getNodeParameter('sectionUpdateFields', itemIndex) as IDataObject;
		assertIsNodeParameters<{
			name?: string;
		}>(updateFields, {
			name: { type: 'string', optional: true },
		});

		await todoistApiRequest.call(ctx, 'POST', `/sections/${id}`, updateFields);
		return { success: true };
	}
}

// Comment Handlers
export class CommentCreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const taskId = ctx.getNodeParameter('commentTaskId', itemIndex);
		assertIsStringOrNumber('commentTaskId', taskId);

		const content = ctx.getNodeParameter('commentContent', itemIndex);
		assertIsString('commentContent', content);

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
		assertIsStringOrNumber('commentId', id);

		await todoistApiRequest.call(ctx, 'DELETE', `/comments/${id}`);
		return { success: true };
	}
}

export class CommentGetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('commentId', itemIndex);
		assertIsStringOrNumber('commentId', id);

		const data = await todoistApiRequest.call(ctx, 'GET', `/comments/${id}`);
		return { data };
	}
}

export class CommentGetAllHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const filters = ctx.getNodeParameter('commentFilters', itemIndex) as IDataObject;
		const qs: IDataObject = {};

		if (filters.task_id) {
			assertIsStringOrNumber('task_id', filters.task_id);
			qs.task_id = filters.task_id;
		}

		if (filters.project_id) {
			assertIsStringOrNumber('project_id', filters.project_id);
			qs.project_id = filters.project_id;
		}

		const data = await todoistApiRequest.call(ctx, 'GET', '/comments', {}, qs);
		return { data };
	}
}

export class CommentUpdateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('commentId', itemIndex);
		assertIsStringOrNumber('commentId', id);

		const updateFields = ctx.getNodeParameter('commentUpdateFields', itemIndex) as IDataObject;
		assertIsNodeParameters<{
			content?: string;
		}>(updateFields, {
			content: { type: 'string', optional: true },
		});

		await todoistApiRequest.call(ctx, 'POST', `/comments/${id}`, updateFields);
		return { success: true };
	}
}

// Label Handlers
export class LabelCreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const name = ctx.getNodeParameter('labelName', itemIndex);
		assertIsString('labelName', name);

		const options = ctx.getNodeParameter('labelOptions', itemIndex) as IDataObject;
		assertIsNodeParameters<{
			color?: string;
			order?: number;
			is_favorite?: boolean;
		}>(options, {
			color: { type: 'string', optional: true },
			order: { type: 'number', optional: true },
			is_favorite: { type: 'boolean', optional: true },
		});

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
		assertIsStringOrNumber('labelId', id);

		await todoistApiRequest.call(ctx, 'DELETE', `/labels/${id}`);
		return { success: true };
	}
}

export class LabelGetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('labelId', itemIndex);
		assertIsStringOrNumber('labelId', id);

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
		assertIsStringOrNumber('labelId', id);

		const updateFields = ctx.getNodeParameter('labelUpdateFields', itemIndex) as IDataObject;
		assertIsNodeParameters<{
			name?: string;
			color?: string;
			order?: number;
			is_favorite?: boolean;
		}>(updateFields, {
			name: { type: 'string', optional: true },
			color: { type: 'string', optional: true },
			order: { type: 'number', optional: true },
			is_favorite: { type: 'boolean', optional: true },
		});

		await todoistApiRequest.call(ctx, 'POST', `/labels/${id}`, updateFields);
		return { success: true };
	}
}
