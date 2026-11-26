/** An error with a message for the user. The CLI prints it without a stack trace. */
export class RigError extends Error {
	constructor(
		message: string,
		readonly hint?: string,
	) {
		super(message);
		this.name = 'RigError';
	}
}

/** The user cancelled a prompt. The prompt already said so. */
export class CancelledError extends RigError {
	constructor() {
		super('Cancelled.');
		this.name = 'CancelledError';
	}
}
