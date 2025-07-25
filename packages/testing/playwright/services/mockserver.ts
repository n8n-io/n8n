/* eslint-disable @typescript-eslint/naming-convention */
/**
 * MockServer service helper functions for Playwright tests
 */

import { mockServerClient, type MockServerClient } from 'mockserver-client';

export interface MockServerRequest {
	method: string;
	path: string;
	queryStringParameters?: Record<string, string[]>;
	headers?: Record<string, string[]>;
	body?: string | { type?: string; [key: string]: any };
}

export interface MockServerResponse {
	statusCode: number;
	headers?: Record<string, string[]>;
	body?: string;
	delay?: {
		timeUnit: 'MICROSECONDS' | 'MILLISECONDS' | 'SECONDS' | 'MINUTES';
		value: number;
	};
}

export interface MockServerExpectation {
	httpRequest: MockServerRequest;
	httpResponse: MockServerResponse;
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
 * Create a MockServer client instance from a URL
 */
function createMockServerClient(mockServerUrl: string): MockServerClient {
	const url = new URL(mockServerUrl);
	return mockServerClient(url.hostname, parseInt(url.port, 10));
}

/**
 * Create an expectation in MockServer
 */
export async function createExpectation(
	mockServerUrl: string,
	expectation: MockServerExpectation,
): Promise<void> {
	const client = createMockServerClient(mockServerUrl);

	try {
		await client.mockAnyResponse({
			httpRequest: expectation.httpRequest,
			httpResponse: expectation.httpResponse,
			times: expectation.times,
		});
	} catch (error) {
		throw new Error(`Failed to create expectation: ${error}`);
	}
}

/**
 * Verify that a request was received by MockServer
 */
export async function verifyRequest(
	mockServerUrl: string,
	request: MockServerRequest,
): Promise<boolean> {
	const client = createMockServerClient(mockServerUrl);

	try {
		await client.verify(request, 1);
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Clear all expectations and logs from MockServer
 */
export async function clearMockServer(mockServerUrl: string): Promise<void> {
	const client = createMockServerClient(mockServerUrl);

	try {
		await client.clear(null, 'ALL');
	} catch (error) {
		throw new Error(`Failed to clear MockServer: ${error}`);
	}
}

/**
 * Create a simple GET request expectation with JSON response
 */
export async function createGetExpectation(
	mockServerUrl: string,
	path: string,
	responseBody: any,
	queryParams?: Record<string, string>,
	statusCode: number = 200,
): Promise<void> {
	const queryStringParameters = queryParams
		? Object.entries(queryParams).reduce(
				(acc, [key, value]) => {
					acc[key] = [value];
					return acc;
				},
				{} as Record<string, string[]>,
			)
		: undefined;

	await createExpectation(mockServerUrl, {
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
 * Verify a GET request was made to MockServer
 */
export async function verifyGetRequest(
	mockServerUrl: string,
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

	return await verifyRequest(mockServerUrl, {
		method: 'GET',
		path,
		...(queryStringParameters && { queryStringParameters }),
	});
}
