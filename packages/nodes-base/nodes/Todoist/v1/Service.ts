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

export interface Section {
	name: string;
	id: string;
}

export interface Service {
	execute(ctx: Context, operation: OperationType, itemIndex: number): Promise<TodoistResponse>;
}

export interface TodoistResponse {
	success?: boolean;
	data?: IDataObject;
}
