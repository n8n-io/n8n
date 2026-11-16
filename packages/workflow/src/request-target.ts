import { UserError } from './errors';
import { toPathSegment } from './url';

declare const requestPathBrand: unique symbol;
declare const requestUrlBrand: unique symbol;

abstract class RequestTarget {
	constructor(readonly value: string) {}

	toString() {
		return this.value;
	}

	toJSON() {
		return this.value;
	}
}

export class RequestPath extends RequestTarget {
	declare readonly [requestPathBrand]: true;
}

export class RequestUrl extends RequestTarget {
	declare readonly [requestUrlBrand]: true;
}

type Zone = 'authority' | 'path' | 'query';

const SCHEME = /^https?:\/\//i;
const HOST_NAME = /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*$/;
const IPV6 = /^\[[0-9A-Fa-f:.]+\]$/;
const PORT = /^\d{1,5}$/;
const PATH_START = /^[/?#]/;
const OPEN_HOST = /[/.@]$/;
const SEGMENT_SAFE = /%(?:3A|40|3D|2C|24|26)/g;
const ENCODED_RUN = /(?:%[0-9A-Fa-f]{2})+/g;

function isRootedPath(value: unknown): value is RequestPath {
	return value instanceof RequestPath && value.value.startsWith('/');
}

function decodeRun(run: string): string {
	try {
		return decodeURIComponent(run);
	} catch {
		return run;
	}
}

export function decodePathValue(value: string): string;
export function decodePathValue(value: unknown): unknown;
export function decodePathValue(value: unknown): unknown {
	return typeof value === 'string' ? value.replace(ENCODED_RUN, decodeRun) : value;
}

function encodeSegment(value: unknown, isFirstSegment = false): string {
	if (value instanceof RequestPath) return value.value;
	const encoded = toPathSegment(value).replace(SEGMENT_SAFE, decodeURIComponent);
	return isFirstSegment ? encoded.replaceAll(':', '%3A') : encoded;
}

function toBaseUrl(base: unknown): string {
	let parsed: URL;
	try {
		parsed = new URL(String(base));
	} catch {
		throw new UserError('Invalid base URL');
	}
	if (!/^https?:$/.test(parsed.protocol) || parsed.search || parsed.hash) {
		throw new UserError('Invalid base URL');
	}
	const password = parsed.password ? `:${parsed.password}` : '';
	const userInfo = parsed.username || parsed.password ? `${parsed.username}${password}@` : '';
	return `${parsed.protocol}//${userInfo}${parsed.host}${parsed.pathname.replace(/\/+$/, '')}`;
}

function nextZone(zone: Zone, text: string): Zone {
	if (zone === 'authority') {
		const boundary = text.search(/[/?#]/);
		if (boundary === -1) return zone;
		return text[boundary] === '/' ? nextZone('path', text.slice(boundary + 1)) : 'query';
	}
	return zone === 'path' && /[?#]/.test(text) ? 'query' : zone;
}

function encodeAuthorityHole(value: unknown, before: string, after: string, ends: boolean): string {
	const text = String(value);
	if (before.endsWith(':')) {
		if (!PORT.test(text) || !(ends || PATH_START.test(after))) {
			throw new UserError(`Invalid port: "${text}"`);
		}
		return text;
	}
	if (!HOST_NAME.test(text) && !IPV6.test(text)) {
		throw new UserError(`Invalid host: "${text}"`);
	}
	return text;
}

function openRequestUrl(strings: TemplateStringsArray, values: unknown[]) {
	if (strings[0] !== '') {
		if (!SCHEME.test(strings[0])) {
			throw new UserError('A request URL must start with "http://" or "https://"');
		}
		if (strings[0].replace(SCHEME, '').startsWith('/')) {
			throw new UserError('A request URL must have a host');
		}
		return { result: '', zone: 'authority' as Zone, first: 0 };
	}
	const result = toBaseUrl(values[0]);
	const next = strings[1] ?? '';
	if (!PATH_START.test(next) && !(next === '' && (values.length <= 1 || isRootedPath(values[1])))) {
		throw new UserError('A base URL must be followed by "/", "?" or "#"');
	}
	return { result, zone: 'path' as Zone, first: 1 };
}

function toRequestUrl(result: string): RequestUrl {
	try {
		new URL(result);
	} catch {
		throw new UserError('Invalid request URL');
	}
	return new RequestUrl(result);
}

export function requestPath(strings: TemplateStringsArray, ...values: unknown[]): RequestPath {
	return new RequestPath(
		strings.reduce(
			(result, text, i) =>
				result +
				text +
				(i < values.length ? encodeSegment(values[i], !(result + text).includes('/')) : ''),
			'',
		),
	);
}

export function requestUrl(strings: TemplateStringsArray, ...values: unknown[]): RequestUrl {
	const opened = openRequestUrl(strings, values);
	let { result, zone } = opened;

	for (let i = opened.first; i < strings.length; i++) {
		const text = strings[i];
		result += text;
		zone = nextZone(zone, i === 0 ? text.replace(SCHEME, '') : text);
		if (i >= values.length) continue;

		const value = values[i];
		if (zone === 'authority' && value instanceof RequestPath) {
			if (!isRootedPath(value) || OPEN_HOST.test(result)) {
				throw new UserError('A request path must follow a complete host');
			}
			result += value.value;
			zone = nextZone('path', value.value);
		} else if (zone === 'authority') {
			const after = strings[i + 1];
			const ends = after === '' && (i + 1 === values.length || isRootedPath(values[i + 1]));
			result += encodeAuthorityHole(value, result, after, ends);
		} else if (zone === 'path') {
			result += encodeSegment(value);
		} else {
			throw new UserError('Pass query values through the "qs" option');
		}
	}

	return toRequestUrl(result);
}
