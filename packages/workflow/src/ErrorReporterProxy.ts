export interface IReportingOptions {
	tags: Record<string, string>;
	extra: Record<string, unknown>;
}

interface IErrorReporter {
	init: () => void;
	error: (error: Error, options?: IReportingOptions) => void;
	warn: (warning: string, options?: IReportingOptions) => void;
}

class ErrorReporterProxy {
	constructor(private reporter: IErrorReporter) {}

	init() {
		this.reporter.init();
	}

	error(error: Error) {
		this.reporter.error(error);
	}

	warn(warning: string) {
		this.reporter.warn(warning);
	}
}

const stub = new ErrorReporterProxy({
	init: () => {},
	error: (error: Error) => console.error('ERROR', error),
	warn: (warning) => console.warn('WARN', warning),
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
