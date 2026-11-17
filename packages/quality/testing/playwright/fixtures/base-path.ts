import type { APIRequestContext } from '@playwright/test';

const API_REQUEST_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'fetch', 'head'] as const;

export function getUrlOrigin(url: string): string {
	return new URL(url).origin;
}

export function getBasePath(url: string): string {
	const { pathname } = new URL(url);
	return pathname === '/' ? '' : pathname.replace(/\/+$/, '');
}

const API_REQUEST_METHOD_SET = new Set<string>(API_REQUEST_METHODS);

export function withBasePathRequest(
	context: APIRequestContext,
	basePath: string,
): APIRequestContext {
	if (!basePath) return context;

	const prefix = (url: unknown) =>
		typeof url === 'string' && url.startsWith('/') && !url.startsWith(`${basePath}/`)
			? `${basePath}${url}`
			: url;

	return new Proxy(context, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver);

			if (typeof value !== 'function') return value;
			if (typeof prop !== 'string' || !API_REQUEST_METHOD_SET.has(prop)) {
				return value.bind(target);
			}

			return (url: unknown, ...args: unknown[]) =>
				(value as (...a: unknown[]) => unknown).call(target, prefix(url), ...args);
		},
	});
}
