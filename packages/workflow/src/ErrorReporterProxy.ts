import type { Primitives } from './utils';
import * as Logger from './LoggerProxy';

export interface ReportingOptions {
	level?: 'warning' | 'error' | 'fatal';
	tags?: Record<string, Primitives>;
	extra?: Record<string, unknown>;
}

interface ErrorReporter {
	report: (error: Error | string, options?: ReportingOptions) => void;
}

const instance: ErrorReporter = {
	report: (error) => {
		if (error instanceof Error) {
			let e = error;
			do {
				Logger.error(`${e.constructor.name}: ${e.message}`);
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
