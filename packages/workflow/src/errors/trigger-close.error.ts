import { ApplicationError } from './application.error';
import type { ErrorLevel } from './error.types';
import type { INode } from '../interfaces';

interface TriggerCloseErrorOptions extends ErrorOptions {
	level: ErrorLevel;
}

export class TriggerCloseError extends ApplicationError {
	constructor(
		readonly node: INode,
		{ cause, level }: TriggerCloseErrorOptions,
	) {
		super('Trigger Close Failed', { cause, extra: { nodeName: node.name } });
		this.level = level;
	}
}
