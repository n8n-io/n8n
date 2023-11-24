import * as Logger from './LoggerProxy';
import type { Event } from '@sentry/node';

export type ReportableErrorOptions = {
	level?: 'warning' | 'error' | 'fatal';
} & Pick<Event, 'extra'>;

interface ErrorReporter {
	report: (error: Error | string, options?: ReportableErrorOptions) => void;
}

export class ReportableError extends Error {
	constructor(
		message: string,
		public options: Partial<ErrorOptions> & ReportableErrorOptions,
	) {
		super(message, options);
	}
}

const instance: ErrorReporter = {
	report: (error) => {
		if (error instanceof Error) {
			let e = error;
			do {
				const meta = e instanceof ReportableError ? e.options.extra : undefined;
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

export const error = (e: unknown, options?: ReportableErrorOptions) => {
	const toReport = wrap(e);
	if (toReport) instance.report(toReport, options);
};

export const warn = (warning: Error | string, options?: ReportableErrorOptions) =>
	error(warning, { level: 'warning', ...options });
