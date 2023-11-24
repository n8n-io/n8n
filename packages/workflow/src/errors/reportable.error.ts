import type { Event } from '@sentry/node';

type Level = 'warning' | 'error' | 'fatal';

export type ReportingOptions = {
	level?: Level;
} & Pick<Event, 'tags' | 'extra'>;

export type ReportableErrorOptions = Partial<ErrorOptions> & ReportingOptions;

export class ReportableError extends Error {
	readonly level: Level;

	readonly tags?: Event['tags'];

	readonly extra?: Event['extra'];

	constructor(message: string, { level, tags, extra, ...rest }: ReportableErrorOptions) {
		super(message, rest);
		this.level = level ?? 'error';
		this.tags = tags;
		this.extra = extra;
	}
}
