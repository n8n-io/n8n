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

	/**
	 * Whether the error should be reported to Sentry.
	 * @default true
	 */
	readonly shouldReport: boolean;

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
		this.shouldReport = shouldReport ?? (level === 'error' || level === 'fatal');
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
