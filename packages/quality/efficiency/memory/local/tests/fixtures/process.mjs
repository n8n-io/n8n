import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

// A minimal stand-in for n8n's diagnostics routes, with a controllable allocation.
const processStartId = randomUUID();
let heap;
let buffer;

const server = createServer((request, response) => {
	const send = (data) => response.end(JSON.stringify({ data }));
	if (request.url === '/rest/e2e/internals') {
		send({
			version: 1,
			hostId: 'main-fixture',
			processStartId,
			instanceType: 'main',
			isLeader: true,
			memory: process.memoryUsage(),
			resources: {},
			collections: {},
		});
	} else if (request.url === '/rest/e2e/gc' && request.method === 'POST') {
		global.gc();
		global.gc();
		send({ success: true });
	} else {
		response.statusCode = 404;
		response.end();
	}
});

process.on('message', (message) => {
	if (message === 'allocate') {
		heap = new Array(1024 * 1024).fill(42);
		buffer = Buffer.alloc(16 * 1024 * 1024, 1);
	} else {
		heap = undefined;
		buffer = undefined;
	}
	process.send({ event: message });
});

server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
