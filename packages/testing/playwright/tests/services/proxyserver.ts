/**
 * ProxyServer service helper functions for Playwright tests
 */

import { mockServerClient as proxyServerClient } from 'mockserver-client';
import type { MockServerClient, RequestResponse } from 'mockserver-client/mockServerClient';

export interface ProxyServerRequest {
	method: string;
	path: string;
	queryStringParameters?: Record<string, string[]>;
	headers?: Record<string, string[]>;
	body?: string | { type?: string; [key: string]: unknown };
}

export interface ProxyServerResponse {
	statusCode: number;
	headers?: Record<string, string[]>;
	body?: string;
	delay?: {
		timeUnit: 'MICROSECONDS' | 'MILLISECONDS' | 'SECONDS' | 'MINUTES';
		value: number;
	};
}

export interface ProxyServerExpectation {
	httpRequest: ProxyServerRequest;
	httpResponse: ProxyServerResponse;
	times?: {
		remainingTimes?: number;
		unlimited?: boolean;
	};
}

export interface RequestLog {
	method: string;
	path: string;
	headers: Record<string, string[]>;
	queryStringParameters?: Record<string, string[]>;
	body?: string;
	timestamp: string;
}

/**
 * Create a ProxyServer client instance from a URL
 */
function createProxyServerClient(proxyServerUrl: string): MockServerClient {
	const url = new URL(proxyServerUrl);
	return proxyServerClient(url.hostname, parseInt(url.port, 10));
}

/**
 * Create an expectation in ProxyServer
 */
export async function createExpectation(
	proxyServerUrl: string,
	expectation: ProxyServerExpectation,
): Promise<RequestResponse> {
	const client = createProxyServerClient(proxyServerUrl);

	try {
		return await client.mockAnyResponse({
			httpRequest: expectation.httpRequest,
			httpResponse: expectation.httpResponse,
			times: expectation.times,
		});
	} catch (error) {
		throw new Error(`Failed to create expectation: ${JSON.stringify(error)}`);
	}
}

/**
 * Verify that a request was received by ProxyServer
 */
export async function verifyRequest(
	proxyServerUrl: string,
	request: ProxyServerRequest,
): Promise<boolean> {
	const client = createProxyServerClient(proxyServerUrl);

	try {
		await client.verify(request, 2);
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Clear all expectations and logs from ProxyServer
 */
export async function clearProxyServer(proxyServerUrl: string): Promise<void> {
	const client = createProxyServerClient(proxyServerUrl);

	try {
		await client.clear(null, 'ALL');
	} catch (error) {
		throw new Error(`Failed to clear ProxyServer: ${JSON.stringify(error)}`);
	}
}

/**
 * Create a simple GET request expectation with JSON response
 */
export async function createGetExpectation(
	proxyServerUrl: string,
	path: string,
	responseBody: unknown,
	queryParams?: Record<string, string>,
	statusCode: number = 200,
): Promise<RequestResponse> {
	const queryStringParameters = queryParams
		? Object.entries(queryParams).reduce(
				(acc, [key, value]) => {
					acc[key] = [value];
					return acc;
				},
				{} as Record<string, string[]>,
			)
		: undefined;

	return await createExpectation(proxyServerUrl, {
		httpRequest: {
			method: 'GET',
			path,
			...(queryStringParameters && { queryStringParameters }),
		},
		httpResponse: {
			statusCode,
			headers: {
				'Content-Type': ['application/json'],
			},
			body: JSON.stringify(responseBody),
		},
	});
}

/**
 * Verify a GET request was made to ProxyServer
 */
export async function verifyGetRequest(
	proxyServerUrl: string,
	path: string,
	queryParams?: Record<string, string>,
): Promise<boolean> {
	const queryStringParameters = queryParams
		? Object.entries(queryParams).reduce(
				(acc, [key, value]) => {
					acc[key] = [value];
					return acc;
				},
				{} as Record<string, string[]>,
			)
		: undefined;

	return await verifyRequest(proxyServerUrl, {
		method: 'GET',
		path,
		...(queryStringParameters && { queryStringParameters }),
	});
}
