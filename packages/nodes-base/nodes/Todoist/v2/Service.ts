import type { IDataObject } from 'n8n-workflow';

import {
	CloseHandler,
	CreateHandler,
	DeleteHandler,
	GetAllHandler,
	GetHandler,
	MoveHandler,
	QuickAddHandler,
	ReopenHandler,
	UpdateHandler,
	// Project handlers
	ProjectCreateHandler,
	ProjectDeleteHandler,
	ProjectGetHandler,
	ProjectGetAllHandler,
	ProjectUpdateHandler,
	ProjectArchiveHandler,
	ProjectUnarchiveHandler,
	ProjectGetCollaboratorsHandler,
	// Section handlers
	SectionCreateHandler,
	SectionDeleteHandler,
	SectionGetHandler,
	SectionGetAllHandler,
	SectionUpdateHandler,
	// Comment handlers
	CommentCreateHandler,
	CommentDeleteHandler,
	CommentGetHandler,
	CommentGetAllHandler,
	CommentUpdateHandler,
	// Label handlers
	LabelCreateHandler,
	LabelDeleteHandler,
	LabelGetHandler,
	LabelGetAllHandler,
	LabelUpdateHandler,
	// Reminder handlers
	ReminderCreateHandler,
	ReminderDeleteHandler,
	ReminderGetAllHandler,
	ReminderUpdateHandler,
} from './OperationHandler';
import type { Context } from '../GenericFunctions';

export class TodoistService implements Service {
	async executeTask(
		ctx: Context,
		operation: TaskOperationType,
		itemIndex: number,
	): Promise<TodoistResponse> {
		return await this.handlers[operation].handleOperation(ctx, itemIndex);
	}

	private handlers = {
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

	private projectHandlers = {
		create: new ProjectCreateHandler(),
		delete: new ProjectDeleteHandler(),
		get: new ProjectGetHandler(),
		getAll: new ProjectGetAllHandler(),
		update: new ProjectUpdateHandler(),
		archive: new ProjectArchiveHandler(),
		unarchive: new ProjectUnarchiveHandler(),
		getCollaborators: new ProjectGetCollaboratorsHandler(),
	};

	private sectionHandlers = {
		create: new SectionCreateHandler(),
		delete: new SectionDeleteHandler(),
		get: new SectionGetHandler(),
		getAll: new SectionGetAllHandler(),
		update: new SectionUpdateHandler(),
	};

	private commentHandlers = {
		create: new CommentCreateHandler(),
		delete: new CommentDeleteHandler(),
		get: new CommentGetHandler(),
		getAll: new CommentGetAllHandler(),
		update: new CommentUpdateHandler(),
	};

	private labelHandlers = {
		create: new LabelCreateHandler(),
		delete: new LabelDeleteHandler(),
		get: new LabelGetHandler(),
		getAll: new LabelGetAllHandler(),
		update: new LabelUpdateHandler(),
	};

	private reminderHandlers = {
		create: new ReminderCreateHandler(),
		delete: new ReminderDeleteHandler(),
		getAll: new ReminderGetAllHandler(),
		update: new ReminderUpdateHandler(),
	};

	async executeProject(
		ctx: Context,
		operation: ProjectOperationType,
		itemIndex: number,
	): Promise<TodoistResponse> {
		return await this.projectHandlers[operation].handleOperation(ctx, itemIndex);
	}

	async executeSection(
		ctx: Context,
		operation: SectionOperationType,
		itemIndex: number,
	): Promise<TodoistResponse> {
		return await this.sectionHandlers[operation].handleOperation(ctx, itemIndex);
	}

	async executeComment(
		ctx: Context,
		operation: CommentOperationType,
		itemIndex: number,
	): Promise<TodoistResponse> {
		return await this.commentHandlers[operation].handleOperation(ctx, itemIndex);
	}

	async executeLabel(
		ctx: Context,
		operation: LabelOperationType,
		itemIndex: number,
	): Promise<TodoistResponse> {
		return await this.labelHandlers[operation].handleOperation(ctx, itemIndex);
	}

	async executeReminder(
		ctx: Context,
		operation: ReminderOperationType,
		itemIndex: number,
	): Promise<TodoistResponse> {
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
] as const;

const PROJECT_OPERATIONS = [
	'create',
	'delete',
	'get',
	'getAll',
	'update',
	'archive',
	'unarchive',
	'getCollaborators',
] as const;

const SECTION_OPERATIONS = ['create', 'delete', 'get', 'getAll', 'update'] as const;

const COMMENT_OPERATIONS = ['create', 'delete', 'get', 'getAll', 'update'] as const;

const LABEL_OPERATIONS = ['create', 'delete', 'get', 'getAll', 'update'] as const;

const REMINDER_OPERATIONS = ['create', 'delete', 'getAll', 'update'] as const;

// Derive types from arrays
export type TaskOperationType = (typeof TASK_OPERATIONS)[number];
export type ProjectOperationType = (typeof PROJECT_OPERATIONS)[number];
export type SectionOperationType = (typeof SECTION_OPERATIONS)[number];
export type CommentOperationType = (typeof COMMENT_OPERATIONS)[number];
export type LabelOperationType = (typeof LABEL_OPERATIONS)[number];
export type ReminderOperationType = (typeof REMINDER_OPERATIONS)[number];

// Type guards using the same arrays
export function isTaskOperationType(operation: string): operation is TaskOperationType {
	return TASK_OPERATIONS.includes(operation as TaskOperationType);
}

export function isProjectOperationType(operation: string): operation is ProjectOperationType {
	return PROJECT_OPERATIONS.includes(operation as ProjectOperationType);
}

export function isSectionOperationType(operation: string): operation is SectionOperationType {
	return SECTION_OPERATIONS.includes(operation as SectionOperationType);
}

export function isCommentOperationType(operation: string): operation is CommentOperationType {
	return COMMENT_OPERATIONS.includes(operation as CommentOperationType);
}

export function isLabelOperationType(operation: string): operation is LabelOperationType {
	return LABEL_OPERATIONS.includes(operation as LabelOperationType);
}

export function isReminderOperationType(operation: string): operation is ReminderOperationType {
	return REMINDER_OPERATIONS.includes(operation as ReminderOperationType);
}

export interface Section {
	name: string;
	id: string;
}

export interface Service {
	executeTask(
		ctx: Context,
		operation: TaskOperationType,
		itemIndex: number,
	): Promise<TodoistResponse>;
	executeProject(
		ctx: Context,
		operation: ProjectOperationType,
		itemIndex: number,
	): Promise<TodoistResponse>;
	executeSection(
		ctx: Context,
		operation: SectionOperationType,
		itemIndex: number,
	): Promise<TodoistResponse>;
	executeComment(
		ctx: Context,
		operation: CommentOperationType,
		itemIndex: number,
	): Promise<TodoistResponse>;
	executeLabel(
		ctx: Context,
		operation: LabelOperationType,
		itemIndex: number,
	): Promise<TodoistResponse>;
	executeReminder(
		ctx: Context,
		operation: ReminderOperationType,
		itemIndex: number,
	): Promise<TodoistResponse>;
}

export interface TodoistProjectType {
	id: number;
	name: string;
}

export interface TodoistResponse {
	success?: boolean;
	data?: IDataObject;
}
