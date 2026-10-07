import { UnexpectedError, UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { z } from 'zod';

import { FakeFsError, InMemoryFileSystem } from './fake-sandbox.fs';

const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 20 * 1024 * 1024;

export type FakeSandboxOptions = {
	/** Port to bind. 0 (the default) lets the OS pick a free port. */
	port?: number;
	/** Receives one line for each request. Silent by default. */
	log?: (line: string) => void;
};

export type FakeSandboxService = {
	/** Server origin, for example `http://127.0.0.1:5798`. Use it as `N8N_SANDBOX_SERVICE_URL`. */
	url: string;
	/** The address that the server listens on, as `server.address()` gives it. */
	host: string;
	port: number;
	/** The commands that the sandboxes ran, oldest first. */
	commands: () => string[];
	/** The ids of the sandboxes that exist now. */
	sandboxIds: () => string[];
	stop: () => Promise<void>;
};

type SandboxState = {
	id: string;
	ephemeral: boolean;
	createdAt: number;
	fs: InMemoryFileSystem;
};

type ServiceState = {
	sandboxes: Map<string, SandboxState>;
	commands: string[];
	log?: (line: string) => void;
};

type RequestContext = {
	req: IncomingMessage;
	res: ServerResponse;
	url: URL;
	state: ServiceState;
	sandboxId: string;
};

type RouteHandler = (context: RequestContext) => Promise<void>;

/** A request error that the client caused. */
class HttpError extends UserError {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

const createSchema = z
	.object({ id: z.string().min(1).optional(), ephemeral: z.boolean().optional() })
	.passthrough();
const execSchema = z
	.object({ command: z.string().min(1), exec_id: z.string().min(1).optional() })
	.passthrough();

function sendJson(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
}

function sendEmpty(res: ServerResponse): void {
	res.writeHead(204);
	res.end();
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
	const chunks: Buffer[] = [];
	let size = 0;
	// Read to the end also when the body is too large, so that the client gets the 413 reply.
	for await (const chunk of req) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
		size += buffer.length;
		if (size <= MAX_BODY_BYTES) chunks.push(buffer);
	}
	if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request body is too large');
	return Buffer.concat(chunks);
}

async function readJson<T>(req: IncomingMessage, schema: z.ZodType<T>): Promise<T> {
	const text = (await readBody(req)).toString('utf8');
	let json: unknown;
	try {
		json = text.trim() === '' ? {} : JSON.parse(text);
	} catch {
		throw new HttpError(400, 'Request body is not valid JSON');
	}
	const result = schema.safeParse(json);
	if (!result.success) throw new HttpError(400, `Invalid request body: ${result.error.message}`);
	return result.data;
}

function requiredParam(url: URL, name: string): string {
	const value = url.searchParams.get(name);
	if (!value) throw new HttpError(400, `Query parameter "${name}" is required`);
	return value;
}

function flag(url: URL, name: string, fallback = false): boolean {
	const value = url.searchParams.get(name);
	return value === null ? fallback : value === 'true';
}

function requireSandbox({ state, sandboxId }: RequestContext): SandboxState {
	const sandbox = state.sandboxes.get(sandboxId);
	if (!sandbox) throw new HttpError(404, `Sandbox ${sandboxId} does not exist`);
	return sandbox;
}

function toRecord(sandbox: SandboxState) {
	return {
		id: sandbox.id,
		status: 'running',
		created_at: sandbox.createdAt,
		last_active_at: sandbox.createdAt,
		ephemeral: sandbox.ephemeral,
	};
}

async function createSandbox({ req, res, state }: RequestContext): Promise<void> {
	const body = await readJson(req, createSchema);
	const id = body.id ?? `fake-sandbox-${randomUUID()}`;
	const existing = state.sandboxes.get(id);
	const sandbox = existing ?? {
		id,
		ephemeral: body.ephemeral === true,
		createdAt: Math.floor(Date.now() / 1000),
		fs: new InMemoryFileSystem(),
	};
	state.sandboxes.set(id, sandbox);
	sendJson(res, existing ? 200 : 201, toRecord(sandbox));
}

async function getSandbox(context: RequestContext): Promise<void> {
	sendJson(context.res, 200, toRecord(requireSandbox(context)));
}

async function deleteSandbox(context: RequestContext): Promise<void> {
	requireSandbox(context);
	context.state.sandboxes.delete(context.sandboxId);
	sendEmpty(context.res);
}

/** Answer every command with exit code 0 and no output, as an NDJSON event stream. */
async function runExecution(context: RequestContext): Promise<void> {
	requireSandbox(context);
	const body = await readJson(context.req, execSchema);
	context.state.commands.push(body.command);
	const execId = body.exec_id ?? randomUUID();
	const events = [
		{ type: 'started', seq: 0, exec_id: execId },
		{
			type: 'exit',
			seq: 1,
			exit_code: 0,
			success: true,
			execution_time_ms: 0,
			timed_out: false,
			killed: false,
		},
	];
	context.res.writeHead(200, { 'content-type': 'application/x-ndjson' });
	context.res.end(events.map((event) => `${JSON.stringify(event)}\n`).join(''));
}

async function deleteExecution(context: RequestContext): Promise<void> {
	requireSandbox(context);
	sendEmpty(context.res);
}

async function readFile(context: RequestContext): Promise<void> {
	const content = requireSandbox(context).fs.readFile(requiredParam(context.url, 'path'));
	context.res.writeHead(200, { 'content-type': 'application/octet-stream' });
	context.res.end(content);
}

async function writeFile(context: RequestContext): Promise<void> {
	const { fs } = requireSandbox(context);
	const path = requiredParam(context.url, 'path');
	fs.writeFile(path, await readBody(context.req), flag(context.url, 'overwrite', true));
	sendEmpty(context.res);
}

async function appendFile(context: RequestContext): Promise<void> {
	const { fs } = requireSandbox(context);
	fs.appendFile(requiredParam(context.url, 'path'), await readBody(context.req));
	sendEmpty(context.res);
}

async function deleteFile(context: RequestContext): Promise<void> {
	requireSandbox(context).fs.remove(requiredParam(context.url, 'path'), {
		recursive: flag(context.url, 'recursive'),
		force: flag(context.url, 'force'),
	});
	sendEmpty(context.res);
}

async function listFiles(context: RequestContext): Promise<void> {
	const path = context.url.searchParams.get('path') ?? '/';
	const entries = requireSandbox(context).fs.list(path, flag(context.url, 'recursive'));
	sendJson(context.res, 200, entries);
}

async function makeDirectory(context: RequestContext): Promise<void> {
	requireSandbox(context).fs.mkdir(
		requiredParam(context.url, 'path'),
		flag(context.url, 'recursive'),
	);
	sendEmpty(context.res);
}

async function statFile(context: RequestContext): Promise<void> {
	sendJson(context.res, 200, requireSandbox(context).fs.stat(requiredParam(context.url, 'path')));
}

const ROUTES = new Map<string, RouteHandler>([
	['POST /sandboxes', createSandbox],
	['GET /sandboxes/:id', getSandbox],
	['DELETE /sandboxes/:id', deleteSandbox],
	['POST /sandboxes/:id/executions', runExecution],
	['DELETE /sandboxes/:id/executions/:exec', deleteExecution],
	['GET /sandboxes/:id/files/content', readFile],
	['PUT /sandboxes/:id/files', writeFile],
	['POST /sandboxes/:id/files', appendFile],
	['DELETE /sandboxes/:id/files', deleteFile],
	['GET /sandboxes/:id/files', listFiles],
	['POST /sandboxes/:id/mkdir', makeDirectory],
	['GET /sandboxes/:id/stat', statFile],
]);

/** Build the route key, for example `GET /sandboxes/:id/files`, and read the sandbox id. */
export function matchRoute(
	method: string,
	pathname: string,
): { key: string; sandboxId: string } | undefined {
	const segments = pathname.split('/').filter((segment) => segment.length > 0);
	if (segments[0] !== 'sandboxes' || segments.length > 4) return undefined;
	const pattern = segments.map((segment, index) => {
		if (index === 1) return ':id';
		if (index === 3 && segments[2] === 'executions') return ':exec';
		return segment;
	});
	return { key: `${method} /${pattern.join('/')}`, sandboxId: segments[1] ?? '' };
}

function toErrorStatus(error: unknown): number {
	if (error instanceof HttpError || error instanceof FakeFsError) return error.status;
	return 500;
}

function sendFailure(res: ServerResponse, error: unknown): void {
	const message = error instanceof Error ? error.message : String(error);
	if (res.headersSent) res.end();
	else sendJson(res, toErrorStatus(error), { error: message });
}

async function handle(req: IncomingMessage, res: ServerResponse, state: ServiceState) {
	const method = req.method ?? '';
	const url = new URL(req.url ?? '/', `http://${HOST}`);
	try {
		const match = matchRoute(method, url.pathname);
		const handler = match && ROUTES.get(match.key);
		if (!match || !handler) throw new HttpError(404, `No route for ${method} ${url.pathname}`);
		state.log?.(`[fake-sandbox] ${match.key}`);
		await handler({ req, res, url, state, sandboxId: match.sandboxId });
	} catch (error) {
		sendFailure(res, error);
	}
}

async function listen(server: Server, port: number): Promise<AddressInfo> {
	return await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, HOST, () => {
			server.off('error', reject);
			const address = server.address();
			if (address === null || typeof address === 'string') {
				reject(new UnexpectedError('Fake sandbox server has no TCP address'));
				return;
			}
			resolve(address);
		});
	});
}

function createStop(server: Server): () => Promise<void> {
	let closing: Promise<void> | undefined;
	return async () => {
		closing ??= new Promise<void>((resolve, reject) => {
			if (!server.listening) {
				resolve();
				return;
			}
			server.close((error) => (error ? reject(error) : resolve()));
			// Keep-alive sockets would hold `close()` open until they time out.
			server.closeAllConnections();
		});
		await closing;
	};
}

/**
 * Start a fake n8n sandbox service. It keeps files in memory and answers every
 * command with exit code 0 and no output. Binds to 127.0.0.1 only.
 */
export async function startFakeSandbox(
	options: FakeSandboxOptions = {},
): Promise<FakeSandboxService> {
	const state: ServiceState = { sandboxes: new Map(), commands: [], log: options.log };
	const server = createServer((req, res) => {
		// `handle` answers its own errors. This catch only covers a failed error reply.
		handle(req, res, state).catch(() => res.destroy());
	});
	const { address: host, port } = await listen(server, options.port ?? 0);

	return {
		url: `http://${HOST}:${port}`,
		host,
		port,
		commands: () => [...state.commands],
		sandboxIds: () => [...state.sandboxes.keys()],
		stop: createStop(server),
	};
}
