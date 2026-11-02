import { ExecutionBaseError } from './abstract/execution-base.error';
import type { ErrorLevel } from '@n8n/errors';
import { errorChain, isObjectLike } from '@n8n/utils/errors/error-chain';
import type { ActionableCause } from './failure';
import type { INode } from '../interfaces';

/** Declared failure causes that make an activation error a warning. */
const WARNING_FAILURE_CAUSES: readonly ActionableCause[] = [
	'credential-invalid',
	'configuration-invalid',
];

function hasWarningFailure(cause: Error | undefined): boolean {
	return errorChain(cause).some(
		({ failure }) =>
			isObjectLike(failure) && WARNING_FAILURE_CAUSES.some((warning) => warning === failure.cause),
	);
}

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
			// Defined, not assigned: a fresh `Error` has no own `constructor`/`name`, so
			// assignment throws when `Error.prototype` is frozen (task runner secure mode)
			Object.defineProperties(error, {
				constructor: {
					value: cause.constructor,
					writable: true,
					enumerable: true,
					configurable: true,
				},
				name: { value: cause.name, writable: true, enumerable: true, configurable: true },
			});
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
		this.setLevel(level, cause);
	}

	private setLevel(level?: ErrorLevel, cause?: Error) {
		if (level) {
			this.level = level;
			return;
		}

		if (hasWarningFailure(cause)) {
			this.level = 'warning';
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
