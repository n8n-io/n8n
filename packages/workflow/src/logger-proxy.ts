import type { Logger } from './interfaces';

const noOp = () => {};
export let error: Logger['error'] = noOp;
export let warn: Logger['warn'] = noOp;
export let info: Logger['info'] = noOp;
export let debug: Logger['debug'] = noOp;

export const init = (logger: Logger) => {
	error = (message, meta) => logger.error(message, meta);
	warn = (message, meta) => logger.warn(message, meta);
	info = (message, meta) => logger.info(message, meta);
	debug = (message, meta) => logger.debug(message, meta);
};
