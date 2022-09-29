import { IDataObject } from 'n8n-workflow';
import {
	Context,
	FormatDueDatetime,
	todoistApiRequest,
	todoistSyncRequest,
} from './GenericFunctions';
import { Section, TodoistResponse } from './Service';
import { v4 as uuid } from 'uuid';

export interface OperationHandler {
	handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse>;
}

export class CreateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://developer.todoist.com/rest/v1/#create-a-new-task
		const content = ctx.getNodeParameter('content', itemIndex) as string;
		const projectId = ctx.getNodeParameter('project', itemIndex) as number;
		const labels = ctx.getNodeParameter('labels', itemIndex) as number[];
		const options = ctx.getNodeParameter('options', itemIndex) as IDataObject;

		const body: CreateTaskRequest = {
			content,
			project_id: projectId,
			priority: options.priority! ? parseInt(options.priority as string, 10) : 1,
		};

		if (options.description) {
			body.description = options.description as string;
		}

		if (options.dueDateTime) {
			body.due_datetime = FormatDueDatetime(options.dueDateTime as string);
		}

		if (options.dueString) {
			body.due_string = options.dueString as string;
		}

		if (labels !== undefined && labels.length !== 0) {
			body.label_ids = labels;
		}

		if (options.section) {
			body.section_id = options.section as number;
		}

		if (options.dueLang) {
			body.due_lang = options.dueLang as string;
		}

		const data = await todoistApiRequest.call(ctx, 'POST', '/tasks', body);

		return {
			data,
		};
	}
}

export class CloseHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex) as string;

		await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}/close`);

		return {
			success: true,
		};
	}
}

export class DeleteHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex) as string;

		const responseData = await todoistApiRequest.call(ctx, 'DELETE', `/tasks/${id}`);

		return {
			success: true,
		};
	}
}

export class GetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex) as string;

		const responseData = await todoistApiRequest.call(ctx, 'GET', `/tasks/${id}`);
		return {
			data: responseData,
		};
	}
}

export class GetAllHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://developer.todoist.com/rest/v1/#get-active-tasks
		const returnAll = ctx.getNodeParameter('returnAll', itemIndex) as boolean;
		const filters = ctx.getNodeParameter('filters', itemIndex) as IDataObject;
		const qs: IDataObject = {};

		if (filters.projectId) {
			qs.project_id = filters.projectId as string;
		}
		if (filters.labelId) {
			qs.label_id = filters.labelId as string;
		}
		if (filters.filter) {
			qs.filter = filters.filter as string;
		}
		if (filters.lang) {
			qs.lang = filters.lang as string;
		}
		if (filters.ids) {
			qs.ids = filters.ids as string;
		}

		let responseData = await todoistApiRequest.call(ctx, 'GET', '/tasks', {}, qs);

		if (!returnAll) {
			const limit = ctx.getNodeParameter('limit', itemIndex) as number;
			responseData = responseData.splice(0, limit);
		}

		return {
			data: responseData,
		};
	}
}

async function getSectionIds(ctx: Context, projectId: number): Promise<Map<string, number>> {
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
		//https://developer.todoist.com/rest/v1/#get-an-active-task
		const id = ctx.getNodeParameter('taskId', itemIndex) as string;

		const responseData = await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}/reopen`);
		return {
			data: responseData,
		};
	}
}

export class UpdateHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://developer.todoist.com/rest/v1/#update-a-task
		const id = ctx.getNodeParameter('taskId', itemIndex) as string;
		const updateFields = ctx.getNodeParameter('updateFields', itemIndex) as IDataObject;

		const body: CreateTaskRequest = {};

		if (updateFields.content) {
			body.content = updateFields.content as string;
		}

		if (updateFields.priority) {
			body.priority = parseInt(updateFields.priority as string, 10);
		}

		if (updateFields.description) {
			body.description = updateFields.description as string;
		}

		if (updateFields.dueDateTime) {
			body.due_datetime = FormatDueDatetime(updateFields.dueDateTime as string);
		}

		if (updateFields.dueString) {
			body.due_string = updateFields.dueString as string;
		}

		if (
			updateFields.labels !== undefined &&
			Array.isArray(updateFields.labels) &&
			updateFields.labels.length !== 0
		) {
			body.label_ids = updateFields.labels as number[];
		}

		if (updateFields.dueLang) {
			body.due_lang = updateFields.dueLang as string;
		}

		await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}`, body);

		return { success: true };
	}
}

export class MoveHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://api.todoist.com/sync/v8/sync
		const taskId = ctx.getNodeParameter('taskId', itemIndex) as number;
		const section = ctx.getNodeParameter('section', itemIndex) as number;

		const body: SyncRequest = {
			commands: [
				{
					type: CommandType.ITEM_MOVE,
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

export class SyncHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const commandsJson = ctx.getNodeParameter('commands', itemIndex) as string;
		const projectId = ctx.getNodeParameter('project', itemIndex) as number;
		const sections = await getSectionIds(ctx, projectId);
		const commands: Command[] = JSON.parse(commandsJson);
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
			// @ts-ignore
			o[key] = value;
			return o;
		}, {});
	}

	private enrichUUID(command: Command) {
		command.uuid = uuid();
	}

	private enrichSection(command: Command, sections: Map<string, number>) {
		if (command.args !== undefined && command.args.section !== undefined) {
			const sectionId = sections.get(command.args.section);
			if (sectionId) {
				command.args.section_id = sectionId;
			} else {
				throw new Error('Section ' + command.args.section + " doesn't exist on Todoist");
			}
		}
	}

	private enrichProjectId(command: Command, projectId: number) {
		if (this.requiresProjectId(command)) {
			command.args.project_id = projectId;
		}
	}

	private requiresProjectId(command: Command) {
		return command.type === CommandType.ITEM_ADD;
	}

	private enrichTempId(command: Command, tempIdMapping: Map<string, string>, projectId: number) {
		if (this.requiresTempId(command)) {
			command.temp_id = uuid() as string;
			tempIdMapping.set(command.temp_id, projectId as unknown as string);
		}
	}

	private requiresTempId(command: Command) {
		return command.type === CommandType.ITEM_ADD;
	}
}

export interface CreateTaskRequest {
	content?: string;
	description?: string;
	project_id?: number;
	section_id?: number;
	parent?: number;
	order?: number;
	label_ids?: number[];
	priority?: number;
	due_string?: string;
	due_datetime?: string;
	due_date?: string;
	due_lang?: string;
}

export interface SyncRequest {
	commands: Command[];
	temp_id_mapping?: {};
}

export interface Command {
	type: CommandType;
	uuid: string;
	temp_id?: string;
	args: {
		id?: number;
		section_id?: number;
		project_id?: number | string;
		section?: string;
		content?: string;
	};
}

export enum CommandType {
	ITEM_MOVE = 'item_move',
	ITEM_ADD = 'item_add',
	ITEM_UPDATE = 'item_update',
	ITEM_REORDER = 'item_reorder',
	ITEM_DELETE = 'item_delete',
	ITEM_COMPLETE = 'item_complete',
}
