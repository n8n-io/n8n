import { UnexpectedError, UserError } from 'n8n-workflow';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { recordUse, selectReply } from './scripted-llm.matcher';
import {
	estimateTokens,
	formatSseEvent,
	toJsonMessage,
	toReplyBlocks,
	toSseEvents,
	type ScriptedMessage,
} from './scripted-llm.sse';
import {
	messagesRequestSchema,
	parseScript,
	type MessagesRequest,
	type Script,
	type ScriptedLlmRequestRecord,
	type ScriptInput,
	type SelectedReply,
} from './scripted-llm.types';

const HOST = '127.0.0.1';
const MESSAGES_PATH = '/v1/messages';
// The Assistant sends large system prompts and tool lists. This limit only stops runaway bodies.
const MAX_BODY_BYTES = 20 * 1024 * 1024;

export type ScriptedLlmOptions = {
	script: ScriptInput;
	/** Port to bind. 0 (the default) lets the OS pick a free port. */
	port?: number;
	/** Receives one line for each answered request. Silent by default. */
	log?: (line: string) => void;
};

export type ScriptedLlm = {
	/** Server origin, for example `http://127.0.0.1:4010`. Use it as the Anthropic SDK `baseURL`. */
	url: string;
	/**
	 * `url` + `/v1`. Use it as `N8N_INSTANCE_AI_MODEL_URL`. n8n does not add `/v1` when
	 * HTTP(S)_PROXY is set. The other n8n code path adds `/v1` only when it is missing.
	 */
	modelUrl: string;
	port: number;
	requests: () => ScriptedLlmRequestRecord[];
	stop: () => Promise<void>;
};

type ServerState = {
	script: Script;
	usage: Map<string, number>;
	records: ScriptedLlmRequestRecord[];
	counters: { message: number; tool: number };
	log?: (line: string) => void;
};

/** An error reply in the Anthropic error shape. */
type ErrorReply = { status: number; errorType: string; message: string };

/** A request error that the client caused (bad route, bad body). */
class HttpError extends UserError {
	constructor(
		readonly status: number,
		readonly errorType: string,
		message: string,
	) {
		super(message);
	}
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, reply: ErrorReply): void {
	sendJson(res, reply.status, {
		type: 'error',
		error: { type: reply.errorType, message: reply.message },
	});
}

async function readBody(req: IncomingMessage): Promise<string> {
	const chunks: Buffer[] = [];
	let size = 0;
	// Read to the end also when the body is too large, so that the client gets the 413 reply.
	for await (const chunk of req) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
		size += buffer.length;
		if (size <= MAX_BODY_BYTES) chunks.push(buffer);
	}
	if (size > MAX_BODY_BYTES) {
		throw new HttpError(413, 'request_too_large', 'Request body is too large');
	}
	return Buffer.concat(chunks).toString('utf8');
}

function parseRequest(body: string): MessagesRequest {
	let json: unknown;
	try {
		json = JSON.parse(body);
	} catch {
		throw new HttpError(400, 'invalid_request_error', 'Request body is not valid JSON');
	}
	const result = messagesRequestSchema.safeParse(json);
	if (!result.success) {
		const problems = result.error.issues
			.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
			.join('; ');
		throw new HttpError(400, 'invalid_request_error', `Invalid Messages request: ${problems}`);
	}
	return result.data;
}

function buildMessage(
	state: ServerState,
	request: MessagesRequest,
	selected: SelectedReply,
	rawBody: string,
): ScriptedMessage {
	state.counters.message += 1;
	const content = toReplyBlocks(selected.text, selected.toolCalls, () => {
		state.counters.tool += 1;
		return `toolu_scripted_${state.counters.tool}`;
	});
	return {
		id: `msg_scripted_${state.counters.message}`,
		model: request.model,
		content,
		inputTokens: estimateTokens(rawBody),
	};
}

function record(state: ServerState, request: MessagesRequest, selected: SelectedReply): void {
	const { lastUserText, lastToolResult } = selected.context;
	const stream = request.stream === true;
	state.records.push({
		ruleId: selected.ruleId,
		stream,
		model: request.model,
		...(lastUserText !== undefined ? { lastUserText } : {}),
		...(lastToolResult !== undefined ? { lastToolResult } : {}),
		skippedTools: selected.skippedTools,
	});
	const skipped =
		selected.skippedTools.length > 0 ? ` skipped=${selected.skippedTools.join(',')}` : '';
	state.log?.(`[scripted-llm] rule=${selected.ruleId} stream=${stream}${skipped}`);
}

function sendMessage(res: ServerResponse, message: ScriptedMessage, stream: boolean): void {
	if (!stream) {
		sendJson(res, 200, toJsonMessage(message));
		return;
	}
	res.writeHead(200, {
		'content-type': 'text/event-stream',
		'cache-control': 'no-cache',
		connection: 'keep-alive',
	});
	res.end(toSseEvents(message).map(formatSseEvent).join(''));
}

function assertMessagesRoute(req: IncomingMessage): void {
	const path = new URL(req.url ?? '/', `http://${HOST}`).pathname;
	if (req.method !== 'POST' || path !== MESSAGES_PATH) {
		throw new HttpError(404, 'not_found_error', `No route for ${req.method ?? ''} ${path}`);
	}
}

function toErrorReply(error: unknown): ErrorReply {
	if (error instanceof HttpError) {
		return { status: error.status, errorType: error.errorType, message: error.message };
	}
	// An unexpected failure is a server fault, so it is not an `HttpError`.
	const message = error instanceof Error ? error.message : String(error);
	return { status: 500, errorType: 'api_error', message };
}

function sendFailure(res: ServerResponse, error: unknown): void {
	if (res.headersSent) res.end();
	else sendError(res, toErrorReply(error));
}

async function handle(req: IncomingMessage, res: ServerResponse, state: ServerState) {
	try {
		assertMessagesRoute(req);
		const body = await readBody(req);
		const request = parseRequest(body);
		const selected = selectReply(state.script, request, state.usage);
		recordUse(state.usage, selected.ruleId);
		const message = buildMessage(state, request, selected, body);
		record(state, request, selected);
		sendMessage(res, message, request.stream === true);
	} catch (error) {
		sendFailure(res, error);
	}
}

async function listen(server: Server, port: number): Promise<number> {
	return await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, HOST, () => {
			server.off('error', reject);
			const address = server.address();
			if (address === null || typeof address === 'string') {
				reject(new UnexpectedError('Scripted LLM server has no TCP address'));
				return;
			}
			resolve(address.port);
		});
	});
}

async function close(server: Server): Promise<void> {
	if (!server.listening) return;
	await new Promise<void>((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
		// Keep-alive sockets would hold `close()` open until they time out.
		server.closeAllConnections();
	});
}

/** Return a `stop()` that shares one close. `server.listening` is false before the sockets close. */
function createStop(server: Server): () => Promise<void> {
	let closing: Promise<void> | undefined;
	return async () => {
		closing ??= close(server);
		await closing;
	};
}

/** Start an Anthropic Messages API server that answers from a script. Binds to 127.0.0.1 only. */
export async function startScriptedLlm(options: ScriptedLlmOptions): Promise<ScriptedLlm> {
	const state: ServerState = {
		script: parseScript(options.script),
		usage: new Map(),
		records: [],
		counters: { message: 0, tool: 0 },
		log: options.log,
	};
	const server = createServer((req, res) => {
		// `handle` answers its own errors. This catch only covers a failed error reply.
		handle(req, res, state).catch(() => res.destroy());
	});
	const port = await listen(server, options.port ?? 0);
	const url = `http://${HOST}:${port}`;

	return {
		url,
		modelUrl: `${url}/v1`,
		port,
		requests: () => structuredClone(state.records),
		stop: createStop(server),
	};
}
