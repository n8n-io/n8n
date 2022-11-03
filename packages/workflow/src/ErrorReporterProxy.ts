import type { Primitives } from './utils';

export interface ReportingOptions {
	tags?: Record<string, Primitives>;
	extra?: Record<string, unknown>;
}

interface ErrorReporter {
	error: (error: Error, options?: ReportingOptions) => void;
	warn: (warning: Error | string, options?: ReportingOptions) => void;
}

const isProduction = process.env.NODE_ENV === 'production';

const instance: ErrorReporter = {
	error: (error) => isProduction && console.error('ERROR', error.message, error.stack),
	warn: (warning) => isProduction && console.warn('WARN', warning),
};

export function init(errorReporter: ErrorReporter) {
	instance.error = errorReporter.error;
	instance.warn = errorReporter.warn;
}

export const error = (e: unknown, options?: ReportingOptions) => {
	if (e instanceof Error) instance.error(e, options);
};

export const warn = (warning: Error | string, options?: ReportingOptions) =>
	instance.warn(warning, options);
