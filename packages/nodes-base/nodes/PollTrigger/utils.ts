import { createHash } from 'crypto';
import { DateTime } from 'luxon';

export type ApiStyle =
	| 'latest'
	| 'newestFirstDate'
	| 'newestFirstId'
	| 'oldestFirstSince'
	| 'oldestFirstDate'
	| 'oldestFirstId';

export type PaginationMode = 'none' | 'cursor' | 'offset' | 'pageNumber' | 'nextUrl';

export const usesDate = (style: ApiStyle) =>
	style === 'newestFirstDate' || style === 'oldestFirstSince' || style === 'oldestFirstDate';

export const usesId = (style: ApiStyle) => style === 'newestFirstId' || style === 'oldestFirstId';

export const SECONDS_THRESHOLD_MS = 1e11;

/** Returns epoch milliseconds, or an error message for the user. */
export function parseDate(value: unknown): number | string {
	let ms: number;
	if (DateTime.isDateTime(value)) {
		ms = value.toMillis();
	} else if (value instanceof Date) {
		ms = value.getTime();
	} else if (typeof value === 'number') {
		if (Number.isFinite(value) && value < SECONDS_THRESHOLD_MS) {
			return `The date ${value} looks like seconds. Multiply it by 1000 to get milliseconds.`;
		}
		ms = value;
	} else if (typeof value === 'string' && value.trim() !== '') {
		ms = DateTime.fromISO(value.trim(), { setZone: true }).toMillis();
		if (Number.isNaN(ms)) ms = Date.parse(value);
	} else {
		return `The date is empty or not a date: ${JSON.stringify(value) ?? String(value)}`;
	}
	if (!Number.isFinite(ms)) {
		return `The date could not be parsed: ${JSON.stringify(value) ?? String(value)}`;
	}
	return ms;
}

/** Returns the ID as a number, or an error message for the user. */
export function parseId(value: unknown): number | string {
	const id =
		typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
	if (!Number.isFinite(id) || (typeof value === 'string' && value.trim() === '')) {
		return `The ID is not a number: ${JSON.stringify(value) ?? String(value)}`;
	}
	return id;
}

export function linkHeaderNext(headers: Record<string, unknown>): string | undefined {
	const raw = headers.link ?? headers.Link;
	const header = Array.isArray(raw) ? raw.join(',') : raw;
	if (typeof header !== 'string') return undefined;
	for (const [, url, params] of header.matchAll(/<([^>]*)>([^<]*)/g)) {
		const rel = /rel\s*=\s*"?([^";,]*)"?/i.exec(params);
		if (rel?.[1].trim().toLowerCase().split(/\s+/).includes('next')) return url;
	}
	return undefined;
}

export const REQUIRED_VARIABLE: Record<'offset' | 'pageNumber' | 'cursor', string> = {
	offset: '$page.offset',
	pageNumber: '$page.number',
	cursor: '$page.cursor',
};

const PAGINATION_LABEL: Record<keyof typeof REQUIRED_VARIABLE, string> = {
	offset: 'Offset',
	pageNumber: 'Page Number',
	cursor: 'Cursor',
};

/** Whether the source uses the variable itself, not a longer name that starts with it. */
export function usesVariable(source: string, variable: string): boolean {
	for (let i = source.indexOf(variable); i >= 0; i = source.indexOf(variable, i + 1)) {
		if (!/[\w$]/.test(source.charAt(i + variable.length))) return true;
	}
	return false;
}

/** Lists the variables the chosen types need that the raw request source does not use. */
export function missingRequestVariables(
	source: string,
	style: ApiStyle,
	pagination: PaginationMode,
): string[] {
	const problems: string[] = [];
	if (pagination === 'offset' || pagination === 'pageNumber' || pagination === 'cursor') {
		const variable = REQUIRED_VARIABLE[pagination];
		if (!usesVariable(source, variable)) {
			problems.push(
				`Pagination is ${PAGINATION_LABEL[pagination]}, but the request does not use {{ ${variable} }}`,
			);
		}
	}
	if (style === 'oldestFirstSince' && !usesVariable(source, '$cursor.since')) {
		problems.push(
			'API style is Oldest First, Filtered by Date, but the request does not use {{ $cursor.since }}',
		);
	}
	return problems;
}

export const hashScope = (parts: unknown): string =>
	createHash('sha256').update(JSON.stringify(parts)).digest('hex');
