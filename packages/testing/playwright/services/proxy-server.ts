/**
 * ProxyServer service helper functions for Playwright tests
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import type { Expectation, HttpRequest } from 'mockserver-client';
import { mockServerClient as proxyServerClient } from 'mockserver-client';
import type { MockServerClient, RequestResponse } from 'mockserver-client/mockServerClient';
import { join } from 'path';

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
	private expectationsDir = './expectations';

	/**
	 * Create a ProxyServer client instance from a URL
	 */
	constructor(proxyServerUrl: string) {
		this.url = proxyServerUrl;
		const parsedURL = new URL(proxyServerUrl);
		this.client = proxyServerClient(parsedURL.hostname, parseInt(parsedURL.port, 10));
	}

	/**
	 * Load all expectations from the expectations directory and mock them
	 */
	async loadExpectations(): Promise<void> {
		try {
			const files = await fs.readdir(this.expectationsDir);
			const jsonFiles = files.filter((file) => file.endsWith('.json'));
			const expectations: Expectation[] = [];

			for (const file of jsonFiles) {
				try {
					const filePath = join(this.expectationsDir, file);
					const fileContent = await fs.readFile(filePath, 'utf8');
					const expectation = JSON.parse(fileContent);
					expectations.push(expectation);
				} catch (parseError) {
					console.log(`Error parsing expectation from ${file}:`, parseError);
				}
			}

			if (expectations.length > 0) {
				console.log('Loading expectations:', expectations.length);
				await this.client.mockAnyResponse(expectations);
			}
		} catch (error) {
			console.log('Error loading expectations:', error);
		}
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
			throw new Error(
				`Failed to create expectation: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Verify that a request was received by ProxyServer
	 */
	async verifyRequest(request: ProxyServerRequest, numberOfRequests: number): Promise<boolean> {
		try {
			await this.client.verify(request, numberOfRequests);
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
			? Object.entries(queryParams).reduce<Record<string, string[]>>((acc, [key, value]) => {
					acc[key] = [value];
					return acc;
				}, {})
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
	async wasGetRequestMade(
		path: string,
		queryParams?: Record<string, string>,
		numberOfRequests = 1,
	): Promise<boolean> {
		const queryStringParameters = queryParams
			? Object.entries(queryParams).reduce<Record<string, string[]>>((acc, [key, value]) => {
					acc[key] = [value];
					return acc;
				}, {})
			: undefined;

		return await this.verifyRequest(
			{
				method: 'GET',
				path,
				...(queryStringParameters && { queryStringParameters }),
			},
			numberOfRequests,
		);
	}

	/**
	 * Retrieve recorded expectations and write to files
	 */
	async recordExpectations(request?: HttpRequest): Promise<void> {
		try {
			// Retrieve recorded expectations from the mock server
			const recordedExpectations = await this.client.retrieveRecordedExpectations(request);

			// Ensure expectations directory exists
			await fs.mkdir(this.expectationsDir, { recursive: true });

			for (const expectation of recordedExpectations) {
				if (
					!expectation.httpRequest ||
					!(
						'method' in expectation.httpRequest &&
						typeof expectation.httpRequest.method === 'string' &&
						typeof expectation.httpRequest.path === 'string'
					)
				) {
					continue;
				}

				// Generate unique filename based on request details
				const requestData = {
					method: expectation.httpRequest?.method,
					path: expectation.httpRequest?.path,
					queryStringParameters: expectation.httpRequest?.queryStringParameters,
					headers: expectation.httpRequest?.headers,
				};

				const hash = crypto
					.createHash('sha256')
					.update(JSON.stringify(requestData))
					.digest('hex')
					.substring(0, 8);

				const filename = `${expectation.httpRequest?.method?.toString()}-${expectation.httpRequest?.path?.replace(/[^a-zA-Z0-9]/g, '_')}-${hash}.json`;
				const filePath = join(this.expectationsDir, filename);

				// Write expectation to JSON file
				await fs.writeFile(filePath, JSON.stringify(expectation, null, 2));
			}
		} catch (error) {
			throw new Error(`Failed to record expectations: ${JSON.stringify(error)}`);
		}
	}

	async getActiveExpectations() {
		return await this.client.retrieveActiveExpectations({ method: 'GET' });
	}
}
