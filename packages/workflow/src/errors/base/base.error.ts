import type { Event } from '@sentry/node';
import callsites from 'callsites';

import type { ErrorTags, ErrorLevel, ReportingOptions } from '@/errors/error.types';

export type BaseErrorOptions = { description?: undefined | null } & ErrorOptions & ReportingOptions;

/**
 * Base class for all errors
 */
export abstract class BaseError extends Error {
	readonly level: ErrorLevel;

	readonly tags: ErrorTags;

	readonly shouldReport: boolean;

	readonly description: string | null | undefined;

	readonly extra?: Event['extra'];

	readonly packageName?: string;

	constructor(
		message: string,
		{
			level = 'error',
			description,
			shouldReport = true,
			tags = {},
			extra,
			...rest
		}: BaseErrorOptions = {},
	) {
		super(message, rest);

		this.level = level;
		this.shouldReport = shouldReport;
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
