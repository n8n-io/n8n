import crypto from 'crypto';
import { promises as fs } from 'fs';
import type { Expectation, RequestDefinition } from 'mockserver-client';
import { mockServerClient } from 'mockserver-client';
import type { HttpRequest, HttpResponse } from 'mockserver-client/mockServer';
import type {
	MockServerClient,
	PathOrRequestDefinition,
	RequestResponse,
} from 'mockserver-client/mockServerClient';
import { join } from 'path';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

const HOSTNAME = 'proxyserver';
const PORT = 1080;

export interface ProxyMeta {
	host: string;
	port: number;
	internalUrl: string;
}

export type ProxyResult = ServiceResult<ProxyMeta>;

export const proxy: Service<ProxyResult> = {
	description: 'HTTP proxy server',

	extraEnv(result: ProxyResult, external?: boolean): Record<string, string> {
		const url = external
			? `http://${result.container.getHost()}:${result.container.getMappedPort(PORT)}`
			: result.meta.internalUrl;
		return {
			HTTP_PROXY: url,
			HTTPS_PROXY: url,
			NODE_TLS_REJECT_UNAUTHORIZED: '0',
		};
	},

	async start(network, projectName): Promise<ProxyResult> {
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.mockserver)
				.withNetwork(network)
				.withNetworkAliases(HOSTNAME)
				.withExposedPorts(PORT)
				.withWaitStrategy(Wait.forLogMessage(`INFO ${PORT} started on port: ${PORT}`))
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': HOSTNAME,
				})
				.withName(`${projectName}-${HOSTNAME}`)
				.withReuse()
				.withLogConsumer(consumer)
				.start();

			return {
				container,
				meta: {
					host: HOSTNAME,
					port: PORT,
					internalUrl: `http://${HOSTNAME}:${PORT}`,
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},

	env(result: ProxyResult, external?: boolean): Record<string, string> {
		return {
			N8N_PROXY_HOST: external ? result.container.getHost() : result.meta.host,
			N8N_PROXY_PORT: external
				? String(result.container.getMappedPort(PORT))
				: String(result.meta.port),
		};
	},
};

// --- ProxyServer helper (MockServer API client) ---

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

	private expectationsDir: string;

	constructor(proxyServerUrl: string, expectationsDir = './expectations') {
		this.url = proxyServerUrl;
		this.expectationsDir = expectationsDir;
		const parsedURL = new URL(proxyServerUrl);
		this.client = mockServerClient(parsedURL.hostname, parseInt(parsedURL.port, 10));
	}

	async loadExpectations(
		folderName: string,
		options: { strictBodyMatching?: boolean } = {},
	): Promise<void> {
		try {
			const targetDir = join(this.expectationsDir, folderName);
			const files = await fs.readdir(targetDir);
			const jsonFiles = files.filter((file) => file.endsWith('.json'));
			const expectations: Expectation[] = [];

			for (const file of jsonFiles) {
				try {
					const filePath = join(targetDir, file);
					const fileContent = await fs.readFile(filePath, 'utf8');
					const expectation = JSON.parse(fileContent) as Expectation;

					if (
						options.strictBodyMatching &&
						expectation.httpRequest &&
						'body' in expectation.httpRequest
					) {
						(expectation.httpRequest as { body: { matchType: string } }).body.matchType = 'STRICT';
					}

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

	async verifyRequest(request: RequestDefinition, numberOfRequests: number): Promise<boolean> {
		try {
			await this.client.verify(request, numberOfRequests, numberOfRequests);
			return true;
		} catch (error) {
			console.log('error', error);
			return false;
		}
	}

	async clearAllExpectations(): Promise<void> {
		try {
			await this.client.clear('', 'ALL');
		} catch (error) {
			throw new Error(`Failed to clear ProxyServer: ${JSON.stringify(error)}`);
		}
	}

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

	async wasRequestMade(request: RequestDefinition, numberOfRequests = 1): Promise<boolean> {
		return await this.verifyRequest(request, numberOfRequests);
	}

	async getAllRequestsMade(): Promise<RequestMade[]> {
		// @ts-expect-error mockserver types seem to be messed up
		return await this.client.retrieveRecordedRequestsAndResponses('');
	}

	async recordExpectations(
		folderName: string,
		options?: {
			pathOrRequestDefinition?: PathOrRequestDefinition;
			host?: string;
			dedupe?: boolean;
			raw?: boolean;
			transform?: (expectation: Expectation) => Expectation;
		},
	): Promise<void> {
		try {
			const recordedExpectations = await this.client.retrieveRecordedExpectations(
				options?.pathOrRequestDefinition,
			);

			const targetDir = join(this.expectationsDir, folderName);

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

				const headers = (expectation.httpRequest.headers ?? {}) as Record<string, unknown>;
				const hostHeader = 'Host' in headers ? (headers.Host as string | string[]) : undefined;
				const hostName = Array.isArray(hostHeader) ? hostHeader[0] : (hostHeader ?? 'unknown-host');

				if (options?.host && typeof hostName === 'string' && !hostName.includes(options.host)) {
					continue;
				}

				const method = expectation.httpRequest.method;
				let requestForProcessing: Record<string, unknown> | HttpRequest;

				if (options?.raw) {
					requestForProcessing = expectation.httpRequest;
				} else {
					const cleanedRequest: Record<string, unknown> = {
						method: expectation.httpRequest.method,
						path: expectation.httpRequest.path,
					};

					if (method === 'GET') {
						if (expectation.httpRequest.queryStringParameters) {
							cleanedRequest.queryStringParameters = expectation.httpRequest.queryStringParameters;
						}
					} else if (method === 'POST' || method === 'PUT') {
						if (expectation.httpRequest.body) {
							cleanedRequest.body = expectation.httpRequest.body;
						}
					}

					requestForProcessing = cleanedRequest;
				}

				if (options?.dedupe) {
					const dedupeKey = JSON.stringify(requestForProcessing);

					if (seenRequests.has(dedupeKey)) {
						continue;
					}

					seenRequests.add(dedupeKey);
				}

				let processedExpectation: Expectation = {
					...expectation,
					httpRequest: requestForProcessing,
					times: {
						unlimited: true,
					},
				};

				if (options?.transform) {
					processedExpectation = options.transform(processedExpectation);
				}

				const hash = crypto
					.createHash('sha256')
					.update(JSON.stringify(requestForProcessing))
					.digest('hex')
					.substring(0, 8);

				const filename = `${Date.now()}-${hostName}-${method}-${expectation.httpRequest.path.replace(/[^a-zA-Z0-9]/g, '_')}-${hash}.json`;
				processedExpectation.id = filename;
				const filePath = join(targetDir, filename);

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

export function createProxyHelper(ctx: HelperContext): ProxyServer {
	const result = ctx.serviceResults.proxy as ProxyResult | undefined;
	if (!result) {
		throw new Error('Proxy service not found in context');
	}
	const url = `http://${result.container.getHost()}:${result.container.getMappedPort(PORT)}`;
	return new ProxyServer(url);
}

declare module './types' {
	interface ServiceHelpers {
		proxy: ProxyServer;
	}
}
