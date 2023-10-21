import type { ILogger, LogTypes } from './Interfaces';

let logger: ILogger | undefined;

export function init<L extends ILogger>(loggerInstance: L) {
	logger = loggerInstance;
	return loggerInstance;
}

export function getInstance(): ILogger {
	if (logger === undefined) {
		throw new Error('LoggerProxy not initialized');
	}

	return logger;
}

export function log(type: LogTypes, message: string, meta: object = {}) {
	getInstance().log(type, message, meta);
}

// Convenience methods below

export function debug(message: string, meta: object = {}) {
	getInstance().debug(message, meta);
}

export function info(message: string, meta: object = {}) {
	getInstance().info(message, meta);
}

export function error(message: string, meta: object = {}) {
	getInstance().error(message, meta);
}

export function verbose(message: string, meta: object = {}) {
	getInstance().verbose(message, meta);
}

export function warn(message: string, meta: object = {}) {
	getInstance().warn(message, meta);
}
