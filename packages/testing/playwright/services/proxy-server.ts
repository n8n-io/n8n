/**
 * ProxyServer service helper functions for Playwright tests
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import type { Expectation, RequestDefinition } from 'mockserver-client';
import { mockServerClient as proxyServerClient } from 'mockserver-client';
import type { HttpRequest, HttpResponse } from 'mockserver-client/mockServer';
import type {
	MockServerClient,
	PathOrRequestDefinition,
	RequestResponse,
} from 'mockserver-client/mockServerClient';
import { join } from 'path';

export type RequestMade = {
	httpRequest?: HttpRequest;
	httpResponse?: HttpResponse;
	timestamp?: string;
};

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
	 * Load all expectations from the specified subfolder and mock them
	 */
	async loadExpectations(folderName: string): Promise<void> {
		try {
			const targetDir = join(this.expectationsDir, folderName);
			const files = await fs.readdir(targetDir);
			const jsonFiles = files.filter((file) => file.endsWith('.json'));
			const expectations: Expectation[] = [];

			for (const file of jsonFiles) {
				try {
					const filePath = join(targetDir, file);
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
	async verifyRequest(request: RequestDefinition, numberOfRequests: number): Promise<boolean> {
		try {
			await this.client.verify(request, numberOfRequests, numberOfRequests);
			return true;
		} catch (error) {
			console.log('error', error);
			return false;
		}
	}

	/**
	 * Clear all expectations and logs from ProxyServer
	 */
	async clearAllExpectations(): Promise<void> {
		try {
			await this.client.clear('', 'ALL');
		} catch (error) {
			throw new Error(`Failed to clear ProxyServer: ${JSON.stringify(error)}`);
		}
	}

	/**
	 * Create a request expectation with JSON response
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
	 * Verify a request was made to ProxyServer
	 */
	async wasRequestMade(request: RequestDefinition, numberOfRequests = 1): Promise<boolean> {
		return await this.verifyRequest(request, numberOfRequests);
	}

	async getAllRequestsMade(): Promise<RequestMade[]> {
		// @ts-expect-error mockserver types seem to be messed up
		return await this.client.retrieveRecordedRequestsAndResponses('');
	}

	/**
	 * Retrieve recorded expectations and write to files
	 *
	 * @param folderName - Target folder name for saving expectation files
	 * @param options - Optional configuration
	 * @param options.pathOrRequestDefinition - Filter expectations by path or request definition
	 * @param options.host - Filter expectations by host name (partial match)
	 * @param options.dedupe - Remove duplicate expectations based  on request
	 * @param options.raw - Save full original requests (true) or cleaned requests (false, default)
	 *   - raw: false (default) - Saves only essential fields: method, path, queryStringParameters (GET), body (POST/PUT)
	 *   - raw: true - Saves complete original request including all headers and metadata
	 */
	async recordExpectations(
		folderName: string,
		options?: {
			pathOrRequestDefinition?: PathOrRequestDefinition;
			host?: string;
			dedupe?: boolean;
			raw?: boolean;
		},
	): Promise<void> {
		try {
			// Retrieve recorded expectations from the mock server
			const recordedExpectations = await this.client.retrieveRecordedExpectations(
				options?.pathOrRequestDefinition,
			);

			// Create target directory path
			const targetDir = join(this.expectationsDir, folderName);

			// Ensure target directory exists
			await fs.mkdir(targetDir, { recursive: true });
			const seenRequests = new Set<string>();

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

				// Extract host for filename and filtering
				const headers = expectation.httpRequest.headers ?? {};
				const hostHeader = 'Host' in headers ? headers?.Host : undefined;
				const hostName = Array.isArray(hostHeader) ? hostHeader[0] : (hostHeader ?? 'unknown-host');

				if (options?.host && typeof hostName === 'string' && !hostName.includes(options.host)) {
					continue;
				}

				const method = expectation.httpRequest.method;
				let requestForProcessing: Record<string, unknown> | HttpRequest;

				if (options?.raw) {
					// Use raw request without cleaning
					requestForProcessing = expectation.httpRequest;
				} else {
					// Clean up the request data
					const cleanedRequest: Record<string, unknown> = {
						method: expectation.httpRequest.method,
						path: expectation.httpRequest.path,
					};

					// Include different fields based on method
					if (method === 'GET') {
						// For GET requests, include queryStringParameters if present
						if (expectation.httpRequest.queryStringParameters) {
							cleanedRequest.queryStringParameters = expectation.httpRequest.queryStringParameters;
						}
					} else if (method === 'POST' || method === 'PUT') {
						// For POST/PUT requests, include body if present
						if (expectation.httpRequest.body) {
							cleanedRequest.body = expectation.httpRequest.body;
						}
					}

					requestForProcessing = cleanedRequest;
				}

				// Dedupe expectations if requested
				if (options?.dedupe) {
					const dedupeKey = JSON.stringify(requestForProcessing);

					if (seenRequests.has(dedupeKey)) {
						continue;
					}

					seenRequests.add(dedupeKey);
				}

				// Create expectation (cleaned or raw)
				const processedExpectation: Expectation = {
					...expectation,
					httpRequest: requestForProcessing,
					times: {
						unlimited: true,
					},
				};

				// Generate unique filename based on request details
				const hash = crypto
					.createHash('sha256')
					.update(JSON.stringify(requestForProcessing))
					.digest('hex')
					.substring(0, 8);

				const filename = `${Date.now()}-${hostName}-${method}-${expectation.httpRequest.path.replace(/[^a-zA-Z0-9]/g, '_')}-${hash}.json`;
				processedExpectation.id = filename;
				const filePath = join(targetDir, filename);

				// Write expectation to JSON file
				await fs.writeFile(filePath, JSON.stringify(processedExpectation, null, 2));
			}
		} catch (error) {
			throw new Error(`Failed to record expectations: ${JSON.stringify(error)}`);
		}
	}

	async getActiveExpectations() {
		return await this.client.retrieveActiveExpectations({ method: 'GET' });
	}
}
