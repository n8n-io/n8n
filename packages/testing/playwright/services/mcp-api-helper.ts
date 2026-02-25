import type { APIResponse } from '@playwright/test';
import * as http from 'http';
import * as https from 'https';
import { nanoid } from 'nanoid';

import type { ApiHelpers } from './api-helper';
import { N8N_AUTH_COOKIE } from '../config/constants';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

interface SseConnection {
	sessionId: string;
	postUrl: string;
	response: http.IncomingMessage | null;
	pendingMessages: Map<
		string,
		{ resolve: (value: unknown) => void; reject: (error: Error) => void }
	>;
	onMessage: (data: string) => void;
}

export interface McpSession {
	sessionId: string;
	transport: 'sse' | 'streamableHttp';
	postUrl?: string; // For SSE transport - the URL to POST messages to
}

export interface McpToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export interface McpToolCallResponse {
	content: Array<{
		type: string;
		text: string;
	}>;
	isError?: boolean;
}

interface TriggerOptions {
	method?: HttpMethod;
	headers?: Record<string, string>;
	data?: unknown;
	maxNotFoundRetries?: number;
	notFoundRetryDelayMs?: number;
}

interface McpJsonRpcRequest {
	jsonrpc: '2.0';
	id: string;
	method: string;
	params?: unknown;
}

interface McpJsonRpcResponse {
	jsonrpc: '2.0';
	id: string;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

/** Internal MCP session for the /mcp-server/http endpoint */
export interface InternalMcpSession {
	apiKey: string;
}

/** Response from the internal MCP tools/list */
export interface InternalMcpToolsListResult {
	tools: McpToolDefinition[];
}

/** Response from search_workflows tool */
export interface SearchWorkflowsResult {
	data: Array<{
		id: string;
		name: string | null;
		description?: string | null;
		active: boolean | null;
		createdAt: string | null;
		updatedAt: string | null;
		triggerCount: number | null;
		nodes: Array<{ name: string; type: string }>;
		scopes: string[];
		canExecute: boolean;
	}>;
	count: number;
}

/** Response from get_workflow_details tool */
export interface WorkflowDetailsResult {
	workflow: {
		id: string;
		name: string;
		active: boolean;
		isArchived: boolean;
		versionId: string;
		triggerCount: number;
		createdAt: string;
		updatedAt: string;
		settings: Record<string, unknown> | null;
		connections: Record<string, unknown>;
		nodes: Array<Record<string, unknown>>;
		tags: Array<{ id: string; name: string }>;
		meta: Record<string, unknown> | null;
		parentFolderId: string | null;
		description?: string;
		scopes: string[];
		canExecute: boolean;
	};
	triggerInfo: unknown;
}

/** Response from execute_workflow tool */
export interface ExecuteWorkflowResult {
	success: boolean;
	executionId: string | null;
	result?: unknown;
	error?: unknown;
}

/**
 * Helper class for interacting with MCP Server endpoints.
 * Supports both SSE and Streamable HTTP transports.
 */
export class McpApiHelper {
	private sseConnections = new Map<string, SseConnection>();

	constructor(private readonly api: ApiHelpers) {}

	// ===== SSE Transport Methods =====

	/**
	 * Establishes an SSE connection with the MCP server using Node.js native http.
	 * This implementation uses streaming to handle the persistent SSE connection
	 * without blocking on the full response.
	 *
	 * @param path - The webhook path (e.g., 'webhook/mcp-basic')
	 * @param options - Optional headers for authentication
	 * @returns McpSession with sessionId and postUrl for sending messages
	 */
	async sseSetup(
		path: string,
		options?: { headers?: Record<string, string> },
	): Promise<McpSession> {
		// Get base URL and auth cookie from Playwright context
		const storageState = await this.api.request.storageState();
		const authCookie = storageState.cookies.find((c) => c.name === N8N_AUTH_COOKIE);

		// Construct full URL - handle both absolute and relative paths
		let fullUrl: string;
		if (path.startsWith('http://') || path.startsWith('https://')) {
			fullUrl = path;
		} else {
			// Get base URL from a test request
			const testResponse = await this.api.request.get('/healthz');
			const testUrl = testResponse.url();
			const baseUrl = new URL(testUrl).origin;
			fullUrl = `${baseUrl}/${path.replace(/^\//, '')}`;
		}

		const url = new URL(fullUrl);
		const httpModule = url.protocol === 'https:' ? https : http;

		const headers: Record<string, string> = {
			Accept: 'text/event-stream',
			'Cache-Control': 'no-cache',
			...options?.headers,
		};

		if (authCookie) {
			headers.Cookie = `${authCookie.name}=${authCookie.value}`;
		}

		return await new Promise((resolve, reject) => {
			const req = httpModule.request(
				url,
				{
					method: 'GET',
					headers,
				},
				(res) => {
					let buffer = '';
					let resolved = false;

					const sseConn: SseConnection = {
						sessionId: '',
						postUrl: '',
						response: res,
						pendingMessages: new Map(),
						onMessage: () => {},
					};

					// Handler for processing incoming SSE messages
					sseConn.onMessage = (data: string) => {
						this.handleSseMessage(sseConn, data);
					};

					res.on('data', (chunk: Buffer) => {
						buffer += chunk.toString();

						// Parse complete SSE events (separated by \n\n)
						const events = buffer.split('\n\n');
						buffer = events.pop() ?? '';

						for (const event of events) {
							if (!event.trim()) continue;

							const parsed = this.parseSseEvent(event);
							if (parsed.type === 'endpoint' && !resolved) {
								const match = parsed.data.match(/sessionId=([a-f0-9-]+)/);
								if (match) {
									sseConn.sessionId = match[1];
									sseConn.postUrl = `${path}?sessionId=${match[1]}`;

									// Store connection and resolve
									this.sseConnections.set(match[1], sseConn);
									resolved = true;
									clearTimeout(timeout);
									resolve({
										sessionId: match[1],
										transport: 'sse',
										postUrl: sseConn.postUrl,
									});
								}
							} else if (parsed.type === 'message' && parsed.data) {
								// Handle response messages
								sseConn.onMessage(parsed.data);
							}
						}
					});

					res.on('error', (error) => {
						if (!resolved) {
							reject(error);
						}
						// Reject any pending messages
						for (const [, pending] of sseConn.pendingMessages) {
							pending.reject(error);
						}
						sseConn.pendingMessages.clear();
					});

					res.on('end', () => {
						if (!resolved) {
							reject(new Error('SSE connection closed before receiving session ID'));
						}
						// Reject any pending messages
						for (const [, pending] of sseConn.pendingMessages) {
							pending.reject(new Error('SSE connection closed'));
						}
						sseConn.pendingMessages.clear();
					});
				},
			);

			req.on('error', reject);

			// Timeout after 10 seconds
			const timeout = setTimeout(() => {
				if (!req.destroyed) {
					req.destroy();
					reject(new Error('SSE setup timeout'));
				}
			}, 10000);

			// Clear timeout on success (handled in resolve)
			req.on('close', () => clearTimeout(timeout));

			req.end();
		});
	}

	/**
	 * Handles incoming SSE messages and resolves pending requests.
	 */
	private handleSseMessage(conn: SseConnection, data: string): void {
		try {
			const message = JSON.parse(data) as McpJsonRpcResponse;
			const msgId = message.id;
			if (msgId && conn.pendingMessages.has(msgId)) {
				const pending = conn.pendingMessages.get(msgId)!;
				conn.pendingMessages.delete(msgId);
				if (message.error) {
					pending.reject(new Error(`MCP Error ${message.error.code}: ${message.error.message}`));
				} else {
					pending.resolve(message.result);
				}
			}
		} catch {
			// Ignore parse errors for non-JSON messages
		}
	}

	/**
	 * Parses an SSE event string into type and data components.
	 */
	private parseSseEvent(event: string): { type: string; data: string } {
		let type = 'message';
		let data = '';
		for (const line of event.split('\n')) {
			if (line.startsWith('event:')) {
				type = line.slice(6).trim();
			} else if (line.startsWith('data:')) {
				data = line.slice(5).trim();
			}
		}
		return { type, data };
	}

	/**
	 * Closes an SSE connection.
	 *
	 * @param session - The MCP session to close
	 */
	sseClose(session: McpSession): void {
		const conn = this.sseConnections.get(session.sessionId);
		if (conn?.response) {
			conn.response.destroy();
			this.sseConnections.delete(session.sessionId);
		}
	}

	/**
	 * Sends a JSON-RPC message via SSE transport (POST to the message endpoint).
	 * The actual response comes back via the SSE stream, not the POST response.
	 *
	 * @param session - The MCP session from sseSetup
	 * @param message - The JSON-RPC message to send
	 * @returns The API response (note: will be 202 Accepted, actual result comes via stream)
	 */
	async sseSendMessage(session: McpSession, message: unknown): Promise<APIResponse> {
		if (session.transport !== 'sse' || !session.postUrl) {
			throw new Error('Invalid SSE session: missing postUrl');
		}

		return await this.trigger(session.postUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			data: message,
		});
	}

	/**
	 * Sends a JSON-RPC message via SSE and waits for the response on the SSE stream.
	 *
	 * @param session - The MCP session from sseSetup
	 * @param message - The JSON-RPC message to send (must have an id field)
	 * @returns The result from the JSON-RPC response
	 */
	async sseSendAndWait<T>(session: McpSession, message: McpJsonRpcRequest): Promise<T> {
		const conn = this.sseConnections.get(session.sessionId);
		if (!conn) {
			throw new Error('SSE connection not found for session');
		}

		// Set up promise to wait for response
		const responsePromise = new Promise<T>((resolve, reject) => {
			conn.pendingMessages.set(message.id, {
				resolve: resolve as (value: unknown) => void,
				reject,
			});

			// Timeout after 30 seconds
			setTimeout(() => {
				if (conn.pendingMessages.has(message.id)) {
					conn.pendingMessages.delete(message.id);
					reject(new Error('SSE response timeout'));
				}
			}, 30000);
		});

		// Send the message
		await this.sseSendMessage(session, message);

		// Wait for response via SSE stream
		return await responsePromise;
	}

	/**
	 * Sends a JSON-RPC message to a specific path (different main) and waits for
	 * the response on this helper's SSE stream. Used for cross-main testing.
	 *
	 * @param session - The MCP session from sseSetup
	 * @param targetPath - The path to POST to (can be on a different main)
	 * @param message - The JSON-RPC message to send (must have an id field)
	 * @returns The result from the JSON-RPC response
	 */
	async sseSendAndWaitCrossMain<T>(
		session: McpSession,
		targetPath: string,
		message: McpJsonRpcRequest,
	): Promise<T> {
		const conn = this.sseConnections.get(session.sessionId);
		if (!conn) {
			throw new Error(
				'SSE connection not found for session. For cross-main testing, ' +
					'ensure sseSetup was called on THIS API helper instance.',
			);
		}

		// Set up promise to wait for response
		const responsePromise = new Promise<T>((resolve, reject) => {
			conn.pendingMessages.set(message.id, {
				resolve: resolve as (value: unknown) => void,
				reject,
			});

			// Timeout after 30 seconds
			setTimeout(() => {
				if (conn.pendingMessages.has(message.id)) {
					conn.pendingMessages.delete(message.id);
					reject(new Error('SSE response timeout'));
				}
			}, 30000);
		});

		// Send the message to the target path (different main) with session ID
		const pathWithSession = `${targetPath}?sessionId=${session.sessionId}`;
		await this.trigger(pathWithSession, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			data: message,
		});

		// Wait for response via SSE stream (on this helper's connection)
		return await responsePromise;
	}

	// ===== Streamable HTTP Transport Methods =====

	/**
	 * Initializes a Streamable HTTP session with the MCP server.
	 *
	 * @param path - The webhook path (e.g., 'webhook/mcp-basic')
	 * @param options - Optional headers for authentication
	 * @returns McpSession with sessionId
	 */
	async streamableHttpInitialize(
		path: string,
		options?: { headers?: Record<string, string> },
	): Promise<McpSession> {
		const initMessage = this.createMessage('initialize', {
			protocolVersion: '2024-11-05',
			capabilities: {},
			clientInfo: { name: 'n8n-e2e-test', version: '1.0.0' },
		});

		const response = await this.trigger(path, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
				...options?.headers,
			},
			data: initMessage,
		});

		const sessionId = response.headers()['mcp-session-id'];
		if (!sessionId) {
			const body = await response.text();
			throw new Error(`Streamable HTTP init failed: No mcp-session-id header returned: ${body}`);
		}

		return {
			sessionId,
			transport: 'streamableHttp',
		};
	}

	/**
	 * Sends a JSON-RPC message via Streamable HTTP transport.
	 *
	 * @param session - The MCP session from streamableHttpInitialize
	 * @param path - The webhook path
	 * @param message - The JSON-RPC message to send
	 * @returns The API response
	 */
	async streamableHttpSendMessage(
		session: McpSession,
		path: string,
		message: unknown,
	): Promise<APIResponse> {
		if (session.transport !== 'streamableHttp') {
			throw new Error('Invalid Streamable HTTP session');
		}

		return await this.trigger(path, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
				'mcp-session-id': session.sessionId,
			},
			data: message,
		});
	}

	/**
	 * Closes a Streamable HTTP session via DELETE request.
	 *
	 * @param session - The MCP session to close
	 * @param path - The webhook path
	 * @returns The API response
	 */
	async streamableHttpDelete(session: McpSession, path: string): Promise<APIResponse> {
		if (session.transport !== 'streamableHttp') {
			throw new Error('Invalid Streamable HTTP session');
		}

		return await this.trigger(path, {
			method: 'DELETE',
			headers: {
				'mcp-session-id': session.sessionId,
			},
		});
	}

	// ===== High-level MCP Protocol Methods =====

	/**
	 * Lists all available tools from the MCP server.
	 *
	 * @param session - The MCP session
	 * @param path - The webhook path (required for Streamable HTTP)
	 * @returns Array of tool definitions
	 */
	async listTools(session: McpSession, path: string): Promise<McpToolDefinition[]> {
		const message = this.createMessage('tools/list');

		if (session.transport === 'sse') {
			// For SSE, response comes via the stream
			const result = await this.sseSendAndWait<{ tools: McpToolDefinition[] }>(session, message);
			return result.tools;
		} else {
			const response = await this.streamableHttpSendMessage(session, path, message);
			const result = await this.parseResponse<{ tools: McpToolDefinition[] }>(response);
			return result.tools;
		}
	}

	/**
	 * Calls a tool on the MCP server.
	 *
	 * @param session - The MCP session
	 * @param path - The webhook path (required for Streamable HTTP)
	 * @param toolName - The name of the tool to call
	 * @param args - The arguments to pass to the tool
	 * @returns The tool call response
	 */
	async callTool(
		session: McpSession,
		path: string,
		toolName: string,
		args: Record<string, unknown>,
	): Promise<McpToolCallResponse> {
		const message = this.createMessage('tools/call', {
			name: toolName,
			arguments: args,
		});

		if (session.transport === 'sse') {
			// For SSE, response comes via the stream
			return await this.sseSendAndWait<McpToolCallResponse>(session, message);
		} else {
			const response = await this.streamableHttpSendMessage(session, path, message);
			return await this.parseResponse<McpToolCallResponse>(response);
		}
	}

	/**
	 * Calls a tool via cross-main SSE transport.
	 * Use this when testing multi-main setups where:
	 * - This API helper holds the SSE connection (established via sseSetup)
	 * - The POST request should go to a different main's endpoint
	 * - The response comes back via this helper's SSE stream
	 *
	 * @param session - The MCP session (with SSE transport)
	 * @param targetPath - The target path to POST to (e.g., 'webhook/mcp-basic')
	 * @param toolName - The name of the tool to call
	 * @param args - The arguments to pass to the tool
	 * @returns The tool call response
	 */
	async callToolCrossMain(
		session: McpSession,
		targetPath: string,
		toolName: string,
		args: Record<string, unknown>,
	): Promise<McpToolCallResponse> {
		const message = this.createMessage('tools/call', {
			name: toolName,
			arguments: args,
		});

		return await this.sseSendAndWaitCrossMain<McpToolCallResponse>(session, targetPath, message);
	}

	/**
	 * Lists tools via cross-main SSE transport.
	 * Use this when testing multi-main setups where:
	 * - This API helper holds the SSE connection (established via sseSetup)
	 * - The POST request should go to a different main's endpoint
	 * - The response comes back via this helper's SSE stream
	 *
	 * @param session - The MCP session (with SSE transport)
	 * @param targetPath - The target path to POST to
	 * @returns Array of tool definitions
	 */
	async listToolsCrossMain(session: McpSession, targetPath: string): Promise<McpToolDefinition[]> {
		const message = this.createMessage('tools/list');

		const result = await this.sseSendAndWaitCrossMain<{ tools: McpToolDefinition[] }>(
			session,
			targetPath,
			message,
		);
		return result.tools;
	}

	// ===== Helper Methods =====

	/**
	 * Creates a JSON-RPC 2.0 message.
	 *
	 * @param method - The method name (e.g., 'tools/list', 'tools/call')
	 * @param params - Optional parameters for the method
	 * @param id - Optional message ID (auto-generated if not provided)
	 * @returns The JSON-RPC message object
	 */
	createMessage(method: string, params?: unknown, id?: string): McpJsonRpcRequest {
		return {
			jsonrpc: '2.0',
			id: id ?? nanoid(),
			method,
			...(params !== undefined && { params }),
		};
	}

	/**
	 * Parses a JSON-RPC response from an API response.
	 * Handles both direct JSON responses and SSE event streams.
	 *
	 * @param response - The API response to parse
	 * @returns The parsed result
	 */
	async parseResponse<T>(response: APIResponse): Promise<T> {
		const contentType = response.headers()['content-type'] ?? '';
		const body = await response.text();

		// Handle SSE event stream responses
		if (contentType.includes('text/event-stream')) {
			return this.parseSSEResponse<T>(body);
		}

		// Handle JSON responses
		const parsed = JSON.parse(body) as McpJsonRpcResponse;

		if (parsed.error) {
			throw new Error(`MCP Error ${parsed.error.code}: ${parsed.error.message}`);
		}

		return parsed.result as T;
	}

	/**
	 * Parses an SSE event stream to extract the JSON-RPC response.
	 *
	 * @param body - The SSE event stream body
	 * @returns The parsed result
	 */
	private parseSSEResponse<T>(body: string): T {
		// SSE format: event: message\ndata: {...}\n\n
		const lines = body.split('\n');
		let jsonData = '';

		for (const line of lines) {
			if (line.startsWith('data:')) {
				jsonData = line.slice(5).trim();
				break;
			}
		}

		if (!jsonData) {
			throw new Error(`Could not extract data from SSE response: ${body}`);
		}

		const parsed = JSON.parse(jsonData) as McpJsonRpcResponse;

		if (parsed.error) {
			throw new Error(`MCP Error ${parsed.error.code}: ${parsed.error.message}`);
		}

		return parsed.result as T;
	}

	/**
	 * Parses an SSE event stream for tool call responses.
	 * Extracts the McpToolCallResponse from the SSE body.
	 */
	private parseSSEToolResponse(body: string): McpToolCallResponse {
		const lines = body.split('\n');
		let jsonData = '';

		for (const line of lines) {
			if (line.startsWith('data:')) {
				jsonData = line.slice(5).trim();
				break;
			}
		}

		if (!jsonData) {
			throw new Error(`Could not extract data from SSE response: ${body}`);
		}

		const parsed = JSON.parse(jsonData) as McpJsonRpcResponse;

		if (parsed.error) {
			throw new Error(`MCP Error ${parsed.error.code}: ${parsed.error.message}`);
		}

		return parsed.result as McpToolCallResponse;
	}

	/**
	 * Triggers an HTTP request to the MCP endpoint with retry logic for 404s.
	 * Based on WebhookApiHelper.trigger().
	 */
	private async trigger(path: string, options?: TriggerOptions): Promise<APIResponse> {
		const maxNotFoundRetries = options?.maxNotFoundRetries ?? 5;
		const notFoundRetryDelayMs = options?.notFoundRetryDelayMs ?? 500;

		let lastResponse: APIResponse | undefined;

		for (let attempt = 0; attempt <= maxNotFoundRetries; attempt++) {
			lastResponse = await this.api.request.fetch(path, {
				method: options?.method ?? 'GET',
				headers: options?.headers,
				data: options?.data,
				maxRetries: 3,
			});

			if (lastResponse.status() !== 404 || attempt === maxNotFoundRetries) {
				return lastResponse;
			}

			await new Promise((resolve) => setTimeout(resolve, notFoundRetryDelayMs));
		}

		return lastResponse!;
	}

	// ===== Internal MCP Service Methods (/mcp-server/http) =====

	/**
	 * Sends a JSON-RPC message to the internal MCP service endpoint.
	 * This endpoint uses Bearer token authentication (API key).
	 *
	 * @param apiKey - The MCP API key for authentication
	 * @param message - The JSON-RPC message to send
	 * @returns The API response
	 */
	async internalMcpSendMessage(apiKey: string, message: unknown): Promise<APIResponse> {
		return await this.api.request.fetch('/mcp-server/http', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
				Authorization: `Bearer ${apiKey}`,
			},
			data: message,
		});
	}

	/**
	 * Sends a raw request to the internal MCP service without authentication.
	 * Useful for testing authentication rejection.
	 *
	 * @param message - The JSON-RPC message to send
	 * @param headers - Optional custom headers
	 * @returns The API response
	 */
	async internalMcpSendMessageNoAuth(
		message: unknown,
		headers?: Record<string, string>,
	): Promise<APIResponse> {
		return await this.api.request.fetch('/mcp-server/http', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
				...headers,
			},
			data: message,
		});
	}

	/**
	 * Lists all available tools from the internal MCP service.
	 *
	 * @param apiKey - The MCP API key for authentication
	 * @returns Array of tool definitions
	 */
	async internalMcpListTools(apiKey: string): Promise<McpToolDefinition[]> {
		const message = this.createMessage('tools/list');
		const response = await this.internalMcpSendMessage(apiKey, message);
		const result = await this.parseResponse<InternalMcpToolsListResult>(response);
		return result.tools;
	}

	/**
	 * Calls search_workflows tool on the internal MCP service.
	 *
	 * @param apiKey - The MCP API key for authentication
	 * @param args - Search arguments (limit, query, projectId)
	 * @returns Search results with workflow data
	 */
	async internalMcpSearchWorkflows(
		apiKey: string,
		args: { limit?: number; query?: string; projectId?: string } = {},
	): Promise<SearchWorkflowsResult> {
		const message = this.createMessage('tools/call', {
			name: 'search_workflows',
			arguments: args,
		});
		const response = await this.internalMcpSendMessage(apiKey, message);
		const contentType = response.headers()['content-type'] ?? '';
		const body = await response.text();

		// Parse the response (handles both SSE and JSON)
		let result: McpToolCallResponse;
		if (contentType.includes('text/event-stream')) {
			result = this.parseSSEToolResponse(body);
		} else {
			const parsed = JSON.parse(body) as { result?: McpToolCallResponse; error?: unknown };
			if (parsed.error) {
				throw new Error(`MCP Error: ${JSON.stringify(parsed.error)}`);
			}
			result = parsed.result as McpToolCallResponse;
		}

		// The tool returns structuredContent with the data, or text content with JSON
		if (result?.content?.[0]?.text) {
			return JSON.parse(result.content[0].text) as SearchWorkflowsResult;
		}
		throw new Error(
			`Unexpected response format from search_workflows: ${JSON.stringify(result ?? body)}`,
		);
	}

	/**
	 * Calls get_workflow_details tool on the internal MCP service.
	 *
	 * @param apiKey - The MCP API key for authentication
	 * @param workflowId - The workflow ID to get details for
	 * @returns Workflow details
	 */
	async internalMcpGetWorkflowDetails(
		apiKey: string,
		workflowId: string,
	): Promise<WorkflowDetailsResult> {
		const message = this.createMessage('tools/call', {
			name: 'get_workflow_details',
			arguments: { workflowId },
		});
		const response = await this.internalMcpSendMessage(apiKey, message);
		const contentType = response.headers()['content-type'] ?? '';
		const body = await response.text();

		// Parse the response (handles both SSE and JSON)
		let result: McpToolCallResponse;
		if (contentType.includes('text/event-stream')) {
			result = this.parseSSEToolResponse(body);
		} else {
			const parsed = JSON.parse(body) as { result?: McpToolCallResponse; error?: unknown };
			if (parsed.error) {
				throw new Error(`MCP Error: ${JSON.stringify(parsed.error)}`);
			}
			result = parsed.result as McpToolCallResponse;
		}

		if (result?.content?.[0]?.text) {
			return JSON.parse(result.content[0].text) as WorkflowDetailsResult;
		}
		throw new Error(
			`Unexpected response format from get_workflow_details: ${JSON.stringify(result ?? body)}`,
		);
	}

	/**
	 * Calls execute_workflow tool on the internal MCP service.
	 *
	 * @param apiKey - The MCP API key for authentication
	 * @param workflowId - The workflow ID to execute
	 * @param inputs - Optional inputs for the workflow
	 * @returns Execution result
	 */
	async internalMcpExecuteWorkflow(
		apiKey: string,
		workflowId: string,
		inputs?: Record<string, unknown>,
	): Promise<ExecuteWorkflowResult> {
		const args: Record<string, unknown> = { workflowId };
		if (inputs) {
			args.inputs = inputs;
		}
		const message = this.createMessage('tools/call', {
			name: 'execute_workflow',
			arguments: args,
		});
		const response = await this.internalMcpSendMessage(apiKey, message);
		const contentType = response.headers()['content-type'] ?? '';
		const body = await response.text();

		// Parse the response (handles both SSE and JSON)
		let result: McpToolCallResponse;
		if (contentType.includes('text/event-stream')) {
			result = this.parseSSEToolResponse(body);
		} else {
			const parsed = JSON.parse(body) as { result?: McpToolCallResponse; error?: unknown };
			if (parsed.error) {
				throw new Error(`MCP Error: ${JSON.stringify(parsed.error)}`);
			}
			result = parsed.result as McpToolCallResponse;
		}

		if (result?.content?.[0]?.text) {
			return JSON.parse(result.content[0].text) as ExecuteWorkflowResult;
		}
		throw new Error(
			`Unexpected response format from execute_workflow: ${JSON.stringify(result ?? body)}`,
		);
	}
}
