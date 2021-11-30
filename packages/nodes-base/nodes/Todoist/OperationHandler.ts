import {IDataObject} from 'n8n-workflow';
import {Context, todoistApiRequest, todoistSyncRequest} from './GenericFunctions';
import {Section, TodoistResponse} from './Service';
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
			priority: (options.priority!) ? parseInt(options.priority as string, 10) : 1,
		};

		if (options.description) {
			body.description = options.description as string;
		}

		if (options.dueDateTime) {
			body.due_datetime = options.dueDateTime as string;
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

		const data = await todoistApiRequest.call(ctx, 'POST', '/tasks', body);

		return {
			success: true,
			data,
		};
	}

}

export class CloseHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex) as string;

		const responseData = await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}/close`);

		return {
			success: true,
			data: null,
		};
	}

}

export class DeleteHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex) as string;

		const responseData = await todoistApiRequest.call(ctx, 'DELETE', `/tasks/${id}`);

		return {
			success: true,
			data: null,
		};
	}
}

export class GetHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		const id = ctx.getNodeParameter('taskId', itemIndex) as string;

		const responseData = await todoistApiRequest.call(ctx, 'GET', `/tasks/${id}`);
		return {
			success: true,
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
		const sections = await this.getSections(ctx, filters.projectId as string);
		for (const task of responseData) {
			task.section = sections.get(task.section_id as string);
		}

		if (!returnAll) {
			const limit = ctx.getNodeParameter('limit', itemIndex) as number;
			responseData = responseData.splice(0, limit);
		}

		return {
			success: true,
			data: responseData,
		};
	}

	private async getSections(ctx: Context, projectId: string): Promise<Map<string, string>> {
		const sections: Section[] = await todoistApiRequest.call(ctx, 'GET', '/sections', {}, {project_id: projectId});
		return new Map(sections.map(s => [s.id, s.name]));
	}
}

export class ReopenHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://developer.todoist.com/rest/v1/#get-an-active-task
		const id = ctx.getNodeParameter('taskId', itemIndex) as string;

		const responseData = await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}/reopen`);
		return {
			success: true,
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
			body.due_datetime = updateFields.dueDateTime as string;
		}

		if (updateFields.dueString) {
			body.due_string = updateFields.dueString as string;
		}

		if (updateFields.labels !== undefined &&
			Array.isArray(updateFields.labels) &&
			updateFields.labels.length !== 0) {
			body.label_ids = updateFields.labels as number[];
		}

		await todoistApiRequest.call(ctx, 'POST', `/tasks/${id}`, body);

		return {success: true, data: null};
	}
}

export class MoveHandler implements OperationHandler {
	async handleOperation(ctx: Context, itemIndex: number): Promise<TodoistResponse> {
		//https://api.todoist.com/sync/v8/sync
		const taskId = ctx.getNodeParameter('taskId', itemIndex) as string;
		const section = ctx.getNodeParameter('section', itemIndex) as string;

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

		return {success: true, data: null};
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
}

export interface Command {
	type: CommandType;
	uuid: string;
	args: {};
}

export enum CommandType {
	ITEM_MOVE = 'item_move',
}
