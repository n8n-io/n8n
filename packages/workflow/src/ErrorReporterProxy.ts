export interface IReportingOptions {
	tags: Record<string, string>;
	extra: Record<string, unknown>;
}

interface IErrorReporter {
	error: (error: Error, options?: IReportingOptions) => void;
	warn: (warning: string, options?: IReportingOptions) => void;
}

class ErrorReporterProxy {
	constructor(private reporter: IErrorReporter) {}

	error(error: Error) {
		this.reporter.error(error);
	}

	warn(warning: string) {
		this.reporter.warn(warning);
	}
}

const stub = new ErrorReporterProxy({
	error: (error: Error) => console.trace('ERROR', error.message, error.stack),
	warn: (warning) => console.trace('WARN', warning),
});

let instance: ErrorReporterProxy;
export function getInstance(): ErrorReporterProxy {
	if (instance) return instance;

	console.warn('ErrorReporterProxy is not yet initialized');
	return stub;
}

export function init(errorReporter: IErrorReporter) {
	instance = new ErrorReporterProxy(errorReporter);
}
