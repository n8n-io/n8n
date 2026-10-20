import { testTriggerNode } from '@test/nodes/TriggerHelpers';
import nock from 'nock';
import { NodeOperationError, type NodeEgressFilter } from 'n8n-workflow';
import { lookup } from 'node:dns';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo, LookupFunction } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { mock } from 'vitest-mock-extended';

import { SseTrigger } from './SseTrigger.node';

describe('SseTrigger', () => {
	let server: Server;
	let port: number;
	let requestCount: number;
	let respond: (res: ServerResponse, requestNumber: number, req: IncomingMessage) => void;

	beforeAll(() => {
		nock.enableNetConnect('localhost');
	});

	afterAll(() => {
		nock.disableNetConnect();
	});

	beforeEach(async () => {
		for (const name of ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY']) {
			vi.stubEnv(name, '');
		}
		requestCount = 0;
		respond = (res) => {
			res.writeHead(200, { 'Content-Type': 'text/event-stream' });
			res.write('data: {"hello":"world"}\n\n');
		};
		server = createServer((req, res) => {
			requestCount += 1;
			respond(res, requestCount, req);
		});
		await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
		port = (server.address() as AddressInfo).port;
	});

	afterEach(async () => {
		vi.unstubAllEnvs();
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
	});

	function egressFilter(options: { allow: boolean; lookup?: LookupFunction }) {
		return mock<NodeEgressFilter>({
			validateUrl: async () =>
				options.allow
					? { ok: true, result: undefined }
					: { ok: false, error: new Error('blocked') },
			createSecureLookup: () => options.lookup ?? lookup,
		});
	}

	it('should not connect to a URL the egress filter rejects', async () => {
		await expect(
			testTriggerNode(SseTrigger, {
				node: { parameters: { url: `http://localhost:${port}/events` } },
				helpers: { getSecureEgressFilter: () => egressFilter({ allow: false }) },
			}),
		).rejects.toThrow(NodeOperationError);

		await sleep(200);
		expect(requestCount).toBe(0);
	});

	it('should resolve the connection through the egress filter lookup', async () => {
		const secureLookup = vi.fn<LookupFunction>((hostname, options, callback) =>
			lookup(hostname, options, callback),
		);

		const { emit, close } = await testTriggerNode(SseTrigger, {
			node: { parameters: { url: `http://localhost:${port}/events` } },
			helpers: {
				getSecureEgressFilter: () => egressFilter({ allow: true, lookup: secureLookup }),
			},
		});

		await vi.waitFor(() => expect(emit).toHaveBeenCalled());
		await close();

		expect(secureLookup).toHaveBeenCalledWith('localhost', expect.anything(), expect.anything());
		expect(emit).toHaveBeenCalledWith([[{ json: { hello: 'world' } }]]);
	});

	it('should send URL credentials as a Basic auth header', async () => {
		let authorization: string | undefined;
		respond = (res, _requestNumber, req) => {
			authorization = req.headers.authorization;
			res.writeHead(200, { 'Content-Type': 'text/event-stream' });
			res.write('data: {"hello":"world"}\n\n');
		};

		const { emit, close } = await testTriggerNode(SseTrigger, {
			node: { parameters: { url: `http://user:p%40ss@localhost:${port}/events` } },
			helpers: { getSecureEgressFilter: () => egressFilter({ allow: true }) },
		});

		await vi.waitFor(() => expect(emit).toHaveBeenCalled());
		await close();

		expect(authorization).toBe(`Basic ${Buffer.from('user:p@ss').toString('base64')}`);
	});

	it('should fail activation when the first connection is rejected', async () => {
		respond = (res) => res.writeHead(404).end();

		await expect(
			testTriggerNode(SseTrigger, {
				node: { parameters: { url: `http://localhost:${port}/events` } },
				helpers: { getSecureEgressFilter: () => egressFilter({ allow: true }) },
			}),
		).rejects.toThrow('The SSE connection failed (HTTP 404)');

		await sleep(200);
		expect(requestCount).toBe(1);
	});

	it('should activate when the first connection fails with a server error', async () => {
		respond = (res) => res.writeHead(503).end();

		const { emitError, close } = await testTriggerNode(SseTrigger, {
			node: { parameters: { url: `http://localhost:${port}/events` } },
			helpers: { getSecureEgressFilter: () => egressFilter({ allow: true }) },
		});
		await close();

		expect(emitError).not.toHaveBeenCalled();
	});

	it('should reconnect with the last event ID after a server error', async () => {
		let lastEventId: string | string[] | undefined;
		respond = (res, requestNumber, req) => {
			if (requestNumber === 2) return res.writeHead(502).end();
			if (requestNumber === 3) lastEventId = req.headers['last-event-id'];
			res.writeHead(200, { 'Content-Type': 'text/event-stream' });
			res.end(`retry: 10\nid: ${requestNumber}\ndata: {"hello":"world"}\n\n`);
		};

		const { emitError, close } = await testTriggerNode(SseTrigger, {
			node: { parameters: { url: `http://localhost:${port}/events` } },
			helpers: { getSecureEgressFilter: () => egressFilter({ allow: true }) },
		});

		await vi.waitFor(() => expect(requestCount).toBeGreaterThanOrEqual(3));
		await close();

		expect(lastEventId).toBe('1');
		expect(emitError).not.toHaveBeenCalled();
	});

	it('should emit an error when a reconnect is rejected', async () => {
		respond = (res, requestNumber) => {
			if (requestNumber > 1) return res.writeHead(404).end();
			res.writeHead(200, { 'Content-Type': 'text/event-stream' });
			res.end('retry: 10\ndata: {"hello":"world"}\n\n');
		};

		const { emitError, close } = await testTriggerNode(SseTrigger, {
			node: { parameters: { url: `http://localhost:${port}/events` } },
			helpers: { getSecureEgressFilter: () => egressFilter({ allow: true }) },
		});

		await vi.waitFor(() => expect(emitError).toHaveBeenCalled());
		await close();

		const error = emitError.mock.calls[0][0];
		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error.message).toBe('The SSE connection failed (HTTP 404)');
	});
});
