import * as Logger from './LoggerProxy';
import { ReportableError, type ReportingOptions } from './errors/reportable.error';

interface ErrorReporter {
	report: (error: Error | string, options?: ReportingOptions) => void;
}

const instance: ErrorReporter = {
	report: (error) => {
		if (error instanceof Error) {
			let e = error;
			do {
				const meta = e instanceof ReportableError ? e.extra : undefined;
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
	if (typeof e === 'string') return new Error(e);
	return;
};

export const error = (e: unknown, options?: ReportingOptions) => {
	const toReport = wrap(e);
	if (toReport) instance.report(toReport, options);
};

export const warn = (warning: Error | string, options?: ReportingOptions) =>
	error(warning, { level: 'warning', ...options });
