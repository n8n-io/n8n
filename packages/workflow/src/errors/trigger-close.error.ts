import type { INode } from '../interfaces';
import { OperationalError, type OperationalErrorOptions } from './base/operational.error';

interface TriggerCloseErrorOptions extends ErrorOptions {
	level: OperationalErrorOptions['level'];
}

export class TriggerCloseError extends OperationalError {
	constructor(
		readonly node: INode,
		{ cause, level }: TriggerCloseErrorOptions,
	) {
		super('Trigger Close Failed', { cause, level, extra: { nodeName: node.name } });
	}
}
