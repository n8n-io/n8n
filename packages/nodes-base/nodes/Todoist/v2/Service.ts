import type { IDataObject } from 'n8n-workflow';

import {
	CloseHandler,
	CreateHandler,
	DeleteHandler,
	GetAllHandler,
	GetHandler,
	MoveHandler,
	ReopenHandler,
	SyncHandler,
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
} from './OperationHandler';
import type { Context } from '../GenericFunctions';

export class TodoistService implements Service {
	async execute(
		ctx: Context,
		operation: OperationType,
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
		sync: new SyncHandler(),
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
}

export type OperationType =
	| 'create'
	| 'close'
	| 'delete'
	| 'get'
	| 'getAll'
	| 'reopen'
	| 'update'
	| 'move'
	| 'sync';

export type ProjectOperationType =
	| 'create'
	| 'delete'
	| 'get'
	| 'getAll'
	| 'update'
	| 'archive'
	| 'unarchive'
	| 'getCollaborators';

export type SectionOperationType = 'create' | 'delete' | 'get' | 'getAll' | 'update';

export type CommentOperationType = 'create' | 'delete' | 'get' | 'getAll' | 'update';

export type LabelOperationType = 'create' | 'delete' | 'get' | 'getAll' | 'update';

export interface Section {
	name: string;
	id: string;
}

export interface Service {
	execute(ctx: Context, operation: OperationType, itemIndex: number): Promise<TodoistResponse>;
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
}

export interface TodoistProjectType {
	id: number;
	name: string;
}

export interface TodoistResponse {
	success?: boolean;
	data?: IDataObject;
}
