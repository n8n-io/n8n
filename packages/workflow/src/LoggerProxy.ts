import { 
	ILogger, 
	LogTypes,
} from './Interfaces';


let instance: ILogger | undefined;

export function init(logger: ILogger) {
	instance = logger;
}

export function getInstance(): ILogger {
	if (instance === undefined) {
		throw new Error('Logger not initialized');
	}

	return instance;
}

export function log(type: LogTypes, message: string, meta: object = {}) {
	getInstance().log(type, message, meta);
}

// Convenience methods below

export function debug(message: string, meta: object = {}) {
	getInstance().log('debug', message, meta);
}

export function info(message: string, meta: object = {}) {
	getInstance().log('info', message, meta);
}

export function error(message: string, meta: object = {}) {
	getInstance().log('error', message, meta);
}

export function verbose(message: string, meta: object = {}) {
	getInstance().log('verbose', message, meta);
}

export function warn(message: string, meta: object = {}) {
	getInstance().log('warn', message, meta);
}
