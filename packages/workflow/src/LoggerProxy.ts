import {
	ILogger,
	LogTypes,
} from './Interfaces';


let logger: ILogger | undefined;

export function init(loggerInstance: ILogger): void {
	logger = loggerInstance;
}

export function getInstance(): ILogger {
	if (logger === undefined) {
		throw new Error('LoggerProxy not initialized');
	}

	return logger;
}

export function log(type: LogTypes, message: string, meta: object = {}): void {
	getInstance().log(type, message, meta);
}

// Convenience methods below

export function debug(message: string, meta: object = {}): void {
	getInstance().log('debug', message, meta);
}

export function info(message: string, meta: object = {}): void {
	getInstance().log('info', message, meta);
}

export function error(message: string, meta: object = {}): void {
	getInstance().log('error', message, meta);
}

export function verbose(message: string, meta: object = {}): void {
	getInstance().log('verbose', message, meta);
}

export function warn(message: string, meta: object = {}): void {
	getInstance().log('warn', message, meta);
}
