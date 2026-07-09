import { ExecutionBaseError } from './abstract/execution-base.error';
import type { ErrorLevel } from '@n8n/errors';
import type { INode } from '../interfaces';

interface WorkflowActivationErrorOptions {
	cause?: Error;
	node?: INode;
	level?: ErrorLevel;
	workflowId?: string;
}

/**
 * Class for instantiating an workflow activation error
 */
export class WorkflowActivationError extends ExecutionBaseError {
	node: INode | undefined;

	workflowId: string | undefined;

	constructor(
		message: string,
		{ cause, node, level, workflowId }: WorkflowActivationErrorOptions = {},
	) {
		let error = cause as Error;
		if (cause instanceof ExecutionBaseError) {
			error = new Error(cause.message);
			error.constructor = cause.constructor;
			error.name = cause.name;
			error.stack = cause.stack;
		}
		super(message, { cause: error });
		this.node = node;
		this.workflowId = workflowId;
		this.message = message;
		if (cause && !this.description) {
			this.description =
				'description' in cause && typeof cause.description === 'string'
					? cause.description
					: cause.message;
		}
		this.setLevel(level);
	}

	private setLevel(level?: ErrorLevel) {
		if (level) {
			this.level = level;
			return;
		}

		if (
			[
				'etimedout', // Node.js
				'econnrefused', // Node.js
				'eauth', // OAuth
				'temporary authentication failure', // IMAP server
				'invalid credentials',
			].some((str) => this.message.toLowerCase().includes(str))
		) {
			this.level = 'warning';
			return;
		}

		this.level = 'error';
	}
}
