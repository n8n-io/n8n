export interface IReportingOptions {
	tags: Record<string, string>;
	extra: Record<string, unknown>;
}

interface ErrorReporter {
	error: (error: Error, options?: IReportingOptions) => void;
	warn: (warning: string, options?: IReportingOptions) => void;
}

class ErrorReporterProxy {
	constructor(readonly reporter: ErrorReporter) {}
}

const isProduction = process.env.NODE_ENV === 'production';
const consoleReporter: ErrorReporter = {
	error: (error) => isProduction && console.error('ERROR', error.message, error.stack),
	warn: (warning) => isProduction && console.warn('WARN', warning),
};

let instance: ErrorReporterProxy;
export function getInstance(): ErrorReporter {
	if (instance) return instance.reporter;

	if (isProduction) {
		console.warn('ErrorReporterProxy is not yet initialized');
	}
	return consoleReporter;
}

export function init(errorReporter: ErrorReporter) {
	instance = new ErrorReporterProxy(errorReporter);
}
