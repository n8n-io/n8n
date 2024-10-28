import { ApplicationError, type ReportingOptions } from './errors/application.error';
import * as Logger from './LoggerProxy';

interface ErrorReporter {
	report: (error: Error | string, options?: ReportingOptions) => void;
}

const instance: ErrorReporter = {
	report: (error, options) => {
		if (error instanceof Error) {
			let e = error;

			const { executionId } = options ?? {};
			const context = executionId ? ` (execution ${executionId})` : '';

			do {
				const msg = [e.message + context, e.stack ? `\n${e.stack}\n` : ''].join('');
				const meta = e instanceof ApplicationError ? e.extra : undefined;
				Logger.error(msg, meta);
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
	instance.report(msg, { ...options, level: 'info' });
};

export const warn = (warning: Error | string, options?: ReportingOptions) =>
	error(warning, { ...options, level: 'warning' });
