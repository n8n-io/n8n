import { ExecutionBaseError } from './abstract/execution-base.error';

export class NodeSslError extends ExecutionBaseError {
	constructor(cause: Error) {
		super("SSL Issue: consider using the 'Ignore SSL issues' option", { cause });
	}
}
