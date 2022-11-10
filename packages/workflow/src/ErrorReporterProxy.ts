import type { Primitives } from './utils';
import * as Logger from './LoggerProxy';

export interface ReportingOptions {
	level?: 'warning' | 'error';
	tags?: Record<string, Primitives>;
	extra?: Record<string, unknown>;
}

interface ErrorReporter {
	report: (error: Error | string, options?: ReportingOptions) => void;
}

const isProduction = process.env.NODE_ENV === 'production';

const instance: ErrorReporter = {
	report: (error, options) => isProduction && Logger.error('ERROR', { error, options }),
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
