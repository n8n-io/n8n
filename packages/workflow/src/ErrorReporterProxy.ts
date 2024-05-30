import * as Logger from './LoggerProxy';
import { ApplicationError, type ReportingOptions } from './errors/application.error';

interface ErrorReporter {
	report: (error: Error | string, options?: ReportingOptions) => void;
}

const instance: ErrorReporter = {
	report: (error) => {
		if (error instanceof Error) {
			let e = error;
			do {
				const meta = e instanceof ApplicationError ? e.extra : undefined;
				Logger.error(`${e.constructor.name}: ${e.message}`, meta);
				e = e.cause as Error;
			} while (e);
		}
	},
};

export function init(errorReporter: ErrorReporter) {
	instance.report = errorReporter.report;
}

const wrap = (e: unknown) => {
	if (e instanceof Error) return e;
	if (typeof e === 'string') return new ApplicationError(e);
	return;
};

export const error = (e: unknown, options?: ReportingOptions) => {
	const toReport = wrap(e);
	if (toReport) instance.report(toReport, options);
};

export const info = (msg: string, options?: ReportingOptions) => {
	Logger.info(msg);
	instance.report(msg, options);
};

export const warn = (warning: Error | string, options?: ReportingOptions) =>
	error(warning, { ...options, level: 'warning' });
