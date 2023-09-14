import type { INode } from './Interfaces';
import { ExecutionBaseError, type Severity } from './NodeErrors';

interface WorkflowActivationErrorOptions {
	cause?: Error;
	node?: INode;
	severity?: Severity;
}

/**
 * Class for instantiating an workflow activation error
 */
export class WorkflowActivationError extends ExecutionBaseError {
	node: INode | undefined;

	constructor(message: string, { cause, node, severity }: WorkflowActivationErrorOptions) {
		let error = cause as Error;
		if (cause instanceof ExecutionBaseError) {
			error = new Error(cause.message);
			error.constructor = cause.constructor;
			error.name = cause.name;
			error.stack = cause.stack;
		}
		super(message, { cause: error });
		this.node = node;
		this.message = message;
		if (severity) this.severity = severity;
	}
}

export class WebhookPathAlreadyTakenError extends WorkflowActivationError {
	constructor(webhookData: { node: string }, cause?: Error) {
		super(
			`The URL path that the "${webhookData.node}" node uses is already taken. Please change it to something else.`,
			{ severity: 'warning', cause },
		);
	}
}
