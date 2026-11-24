/**
 * Logger Utility - Centralized logging with verbose mode support.
 */

export interface LoggerOptions {
	verbose?: boolean;
	prefix?: string;
}

export class Logger {
	private verbose: boolean;
	private prefix: string;

	constructor(options: LoggerOptions = {}) {
		this.verbose = options.verbose ?? false;
		this.prefix = options.prefix ?? '';
	}

	info(message: string): void {
		const output = this.prefix ? `${this.prefix} ${message}` : message;
		console.log(output);
	}

	debug(message: string): void {
		if (!this.verbose) return;
		const output = this.prefix ? `${this.prefix} ${message}` : message;
		console.log(output);
	}

	warn(message: string): void {
		const output = this.prefix ? `${this.prefix} ${message}` : message;
		console.warn(output);
	}

	error(message: string): void {
		const output = this.prefix ? `${this.prefix} ${message}` : message;
		console.error(output);
	}

	success(message: string): void {
		this.info(`\u2713 ${message}`);
	}

	fail(message: string): void {
		this.info(`\u2717 ${message}`);
	}

	list(items: string[], indent = 2): void {
		const padding = ' '.repeat(indent);
		for (const item of items) {
			this.info(`${padding}- ${item}`);
		}
	}

	debugList(items: string[], indent = 2): void {
		if (!this.verbose) return;
		this.list(items, indent);
	}

	isVerbose(): boolean {
		return this.verbose;
	}
}

export function createLogger(options: LoggerOptions = {}): Logger {
	return new Logger(options);
}
