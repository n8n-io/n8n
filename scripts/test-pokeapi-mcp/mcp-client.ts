/**
 * Minimal MCP client for the Streamable HTTP transport (MCP 2024-11-05).
 * One shared session per process — call initSession() in beforeAll.
 */

const BASE_URL = process.env.MCP_URL ?? 'http://localhost:5678/mcp/pokeapi';

let sessionId: string | null = null;
let idCounter = 0;

function nextId() {
	return ++idCounter;
}

async function parseSSE(res: Response): Promise<{ result?: unknown; error?: { message: string } }> {
	const text = await res.text();
	const line = text.split('\n').find((l) => l.startsWith('data: '));
	if (!line) throw new Error(`No SSE data line in response:\n${text}`);
	return JSON.parse(line.slice('data: '.length)) as {
		result?: unknown;
		error?: { message: string };
	};
}

async function post(body: unknown, sid?: string): Promise<Response> {
	return fetch(BASE_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json, text/event-stream',
			...(sid ? { 'mcp-session-id': sid } : {}),
		},
		body: JSON.stringify(body),
	});
}

export async function initSession(): Promise<void> {
	const res = await post({
		jsonrpc: '2.0',
		id: nextId(),
		method: 'initialize',
		params: {
			protocolVersion: '2024-11-05',
			capabilities: {},
			clientInfo: { name: 'vitest-pokeapi', version: '1.0' },
		},
	});

	const sid = res.headers.get('mcp-session-id');
	if (!sid) throw new Error('No mcp-session-id in initialize response');
	await res.text(); // consume body

	// Notify the server that the client is ready
	await post({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, sid);

	sessionId = sid;
}

async function rpc(method: string, params: unknown): Promise<unknown> {
	if (!sessionId) throw new Error('Call initSession() before making RPC calls');
	const res = await post({ jsonrpc: '2.0', id: nextId(), method, params }, sessionId);
	const json = await parseSSE(res);
	if (json.error) throw new Error(`MCP error: ${json.error.message}`);
	return json.result;
}

export interface McpTool {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export async function listTools(): Promise<McpTool[]> {
	const result = (await rpc('tools/list', {})) as { tools: McpTool[] };
	return result.tools;
}

export async function callTool(name: string, args: Record<string, unknown>): Promise<unknown[]> {
	const result = (await rpc('tools/call', { name, arguments: args })) as {
		content: Array<{ type: string; text: string }>;
	};
	return JSON.parse(result.content[0].text) as unknown[];
}
