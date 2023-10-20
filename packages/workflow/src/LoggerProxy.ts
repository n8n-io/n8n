import createDebug from 'debug';
import type { ILogger } from './Interfaces';

export const debug = createDebug('n8n');
export const verbose = debug;

const noOp = () => {};
export let info: ILogger['info'] = noOp;
export let warn: ILogger['warn'] = noOp;
export let error: ILogger['error'] = noOp;

export const init = (logger: Pick<ILogger, 'info' | 'warn' | 'error'>) => {
	info = (message, meta) => logger.info(message, meta);
	warn = (message, meta) => logger.warn(message, meta);
	error = (message, meta) => logger.error(message, meta);
};
