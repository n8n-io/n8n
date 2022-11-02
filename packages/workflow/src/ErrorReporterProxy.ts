export interface IReportingOptions {
	tags: Record<string, string>;
	extra: Record<string, unknown>;
}

interface ErrorReporter {
	error: (error: Error, options?: IReportingOptions) => void;
	warn: (warning: string, options?: IReportingOptions) => void;
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

export const error = (e: unknown, options?: IReportingOptions) => {
	if (e instanceof Error) instance.error(e, options);
};

export const warn = (warning: string, options?: IReportingOptions) =>
	instance.warn(warning, options);
