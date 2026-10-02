import { randomUUID } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename } from 'node:path';
import { writeHeapSnapshot } from 'node:v8';

const hostId = randomUUID();
const processStartId = randomUUID();
let heap;
let buffer;
const snapshots = new Map();
const server = createServer((request, response) => {
	response.setHeader('Content-Type', 'application/json');
	const send = (data) => response.end(JSON.stringify({ data }));
	if (request.url === '/rest/e2e/internals') {
		send({
			version: 1,
			processStartId,
			hostId,
			instanceType: 'main',
			isLeader: true,
			memory: process.memoryUsage(),
			resources: {},
			collections: { fixture: heap ? 1 : 0 },
		});
	} else if (request.url === '/rest/e2e/gc' && request.method === 'POST') {
		global.gc();
		global.gc();
		send({ success: true });
	} else if (request.url === '/rest/e2e/heap-snapshot' && request.method === 'POST') {
		const path = writeHeapSnapshot();
		const name = basename(path);
		snapshots.set(name, path);
		send({ success: true, filePath: name, sizeBytes: statSync(path).size });
	} else if (request.url?.startsWith('/rest/e2e/heap-snapshot/')) {
		const name = decodeURIComponent(request.url.split('/').at(-1));
		const path = snapshots.get(name);
		if (!path) {
			response.statusCode = 404;
			response.end();
			return;
		}
		response.setHeader('Content-Type', 'application/octet-stream');
		createReadStream(path).pipe(response);
	} else {
		response.statusCode = 404;
		response.end();
	}
});

process.on('message', (message) => {
	if (message === 'allocate') {
		heap = new Array(1024 * 1024).fill(42);
		buffer = Buffer.alloc(16 * 1024 * 1024, 1);
	} else if (message === 'release') {
		heap = undefined;
		buffer = undefined;
	}
	process.send({ event: message });
});

server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
