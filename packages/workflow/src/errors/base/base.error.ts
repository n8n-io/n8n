import type { Event } from '@sentry/node';
import callsites from 'callsites';

import type { ErrorTags, ErrorLevel, ReportingOptions } from '@n8n/errors';

export type BaseErrorOptions = { description?: string | undefined | null } & ErrorOptions &
	ReportingOptions;
/**
 * Base class for all errors
 */
export abstract class BaseError extends Error {
	/**
	 * Error level. Defines which level the error should be logged/reported
	 * @default 'error'
	 */
	level: ErrorLevel;

	/** Explicit `shouldReport` override passed at construction, if any. */
	private readonly shouldReportOverride?: boolean;

	/**
	 * Whether the error should be reported to Sentry. Derived from `level`
	 * unless explicitly overridden at construction. Read lazily so subclasses
	 * (e.g. `NodeApiError`) that assign `level` after `super()` stay consistent
	 * with their final level instead of the constructor default.
	 * @default true
	 */
	get shouldReport(): boolean {
		return this.shouldReportOverride ?? (this.level === 'error' || this.level === 'fatal');
	}

	readonly description: string | null | undefined;

	readonly tags: ErrorTags;

	readonly extra?: Event['extra'];

	readonly packageName?: string;

	constructor(
		message: string,
		{
			level = 'error',
			description,
			shouldReport,
			tags = {},
			extra,
			...rest
		}: BaseErrorOptions = {},
	) {
		super(message, rest);

		this.level = level;
		this.shouldReportOverride = shouldReport;
		this.description = description;
		this.tags = tags;
		this.extra = extra;

		try {
			const filePath = callsites()[2].getFileName() ?? '';
			const match = /packages\/([^\/]+)\//.exec(filePath)?.[1];

			if (match) this.tags.packageName = match;
		} catch {}
	}
}
