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

export class ProxyServer {
	private client: MockServerClient;
	url: string;

	/**
	 * Create a ProxyServer client instance from a URL
	 */
	constructor(proxyServerUrl: string = '') {
		this.url = proxyServerUrl;
		const parsedURL = new URL(proxyServerUrl);
		this.client = proxyServerClient(parsedURL.hostname, parseInt(parsedURL.port, 10));
	}

	/**
	 * Create an expectation in ProxyServer
	 */
	async createExpectation(expectation: ProxyServerExpectation): Promise<RequestResponse> {
		try {
			return await this.client.mockAnyResponse({
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
	async verifyRequest(request: ProxyServerRequest): Promise<boolean> {
		try {
			await this.client.verify(request, 1);
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Clear all expectations and logs from ProxyServer
	 */
	async clearProxyServer(): Promise<void> {
		try {
			await this.client.clear(null, 'ALL');
		} catch (error) {
			throw new Error(`Failed to clear ProxyServer: ${JSON.stringify(error)}`);
		}
	}

	/**
	 * Create a simple GET request expectation with JSON response
	 */
	async createGetExpectation(
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

		return await this.createExpectation({
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
	async verifyGetRequest(path: string, queryParams?: Record<string, string>): Promise<boolean> {
		const queryStringParameters = queryParams
			? Object.entries(queryParams).reduce(
					(acc, [key, value]) => {
						acc[key] = [value];
						return acc;
					},
					{} as Record<string, string[]>,
				)
			: undefined;

		return await this.verifyRequest({
			method: 'GET',
			path,
			...(queryStringParameters && { queryStringParameters }),
		});
	}
}
