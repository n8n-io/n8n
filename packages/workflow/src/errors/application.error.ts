import type { Event } from '@sentry/node';
import callsites from 'callsites';

export type Level = 'warning' | 'error' | 'fatal' | 'info';

export type ReportingOptions = {
	level?: Level;
} & Pick<Event, 'tags' | 'extra'>;

export class ApplicationError extends Error {
	level: Level;

	readonly tags: NonNullable<Event['tags']>;

	readonly extra?: Event['extra'];

	readonly packageName?: string;

	constructor(
		message: string,
		{ level, tags = {}, extra, ...rest }: Partial<ErrorOptions> & ReportingOptions = {},
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
