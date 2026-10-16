import { createServer } from 'node:http';
import { channel } from 'node:diagnostics_channel';

Reflect.set(globalThis, Symbol.for('n8n.memory-profiler.requests'), true);
const captures = new Map();
Reflect.set(globalThis, Symbol.for('n8n.memory-profiler.capture'), captures);

const startedAtMs = Date.now() - process.uptime() * 1000;
let retained = [];
let unavailable = false;
let requestId = 0;
const server = createServer((request, response) => {
	if (request.url === '/healthz') {
		response.end('ok');
		return;
	}
	if (request.url === '/allocate') {
		const event = {
			id: ++requestId,
			pid: process.pid,
			api: 'internal',
			method: 'POST',
			startedAtMs: Date.now(),
			route: '/rest/workflows/:id',
		};
		const requests = channel('n8n.memory-profiler.requests');
		requests.publish({ ...event, event: 'start' });
		retained.push(...Array.from({ length: 64 }, () => new Array(8192).fill(42)));
		response.end('ok');
		requests.publish({
			...event,
			event: 'finish',
			statusCode: 200,
			aborted: false,
			durationMs: Date.now() - event.startedAtMs,
			...([...captures.values()].some((capture) => capture.requestDetails)
				? {
						request: {
							url: '/allocate',
							headers: { text: '{}' },
							body: { text: '{"input":"sample-request"}' },
						},
					}
				: {}),
			...([...captures.values()].some((capture) => capture.responseDetails)
				? { response: { headers: { text: '{}' }, body: { text: 'ok' } } }
				: {}),
		});
		return;
	}
	if (request.url === '/unavailable') {
		unavailable = true;
		response.end('ok');
		return;
	}
	if (request.url === '/release') {
		retained = [];
		response.end('ok');
		return;
	}
	if (request.url !== '/metrics') {
		response.writeHead(404).end();
		return;
	}
	if (unavailable) {
		response.writeHead(503).end();
		return;
	}
	const memory = process.memoryUsage();
	response.setHeader('Content-Type', 'text/plain');
	response.end(
		[
			`n8n_process_resident_memory_bytes ${memory.rss}`,
			`n8n_nodejs_heap_size_used_bytes ${memory.heapUsed}`,
			`n8n_nodejs_heap_size_total_bytes ${memory.heapTotal}`,
			`n8n_nodejs_external_memory_bytes ${memory.external}`,
			`n8n_process_start_time_seconds ${startedAtMs / 1000}`,
		].join('\n') + '\n',
	);
});
server.listen(Number(process.argv[2] ?? 0), '127.0.0.1', () => {
	process.stdout.write(`${JSON.stringify({ url: `http://127.0.0.1:${server.address().port}` })}\n`);
});
