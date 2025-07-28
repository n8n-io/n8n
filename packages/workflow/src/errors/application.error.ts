import type { Event } from '@sentry/node';
import callsites from 'callsites';

import type { ErrorLevel, ReportingOptions } from './error.types';

/**
 * @deprecated Use `UserError`, `OperationalError` or `UnexpectedError` instead.
 */
export class ApplicationError extends Error {
	level: ErrorLevel;

	readonly tags: NonNullable<Event['tags']>;

	readonly extra?: Event['extra'];

	readonly packageName?: string;

	constructor(
		message: string,
		{ level, tags = {}, extra, ...rest }: ErrorOptions & ReportingOptions = {},
	) {
		super(message, rest);
		this.level = level ?? 'error';
		this.tags = tags;
		this.extra = extra;

		try {
			const filePath = callsites()[2].getFileName() ?? '';
			const match = /packages\/([^\/]+)\//.exec(filePath)?.[1];

			if (match) this.tags.packageName = match;
		} catch {}
	}
}
