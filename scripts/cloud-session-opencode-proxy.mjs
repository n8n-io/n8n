// Keep browser authentication in this process. The browser URL contains no password.
import { createServer, request } from 'node:http';

export const basicAuth = (password) =>
	`Basic ${Buffer.from(`opencode:${password}`).toString('base64')}`;

// Set `targetPort` on the result once the tunnel port is known. Requests before that get 503.
export async function openCodeProxy({ password, port = 0 }) {
	const sockets = new Set();
	const authorization = basicAuth(password);
	let host;
	let origin;
	const proxy = {
		targetPort: undefined,
		close: () => {
			for (const socket of sockets) socket.destroy();
			server.close();
		},
	};
	const allowed = (req) =>
		req.headers.host === host &&
		(!req.headers.origin || req.headers.origin === origin) &&
		(!req.headers['sec-fetch-site'] ||
			['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) &&
		req.url.startsWith('/') &&
		!req.url.startsWith('//');
	const upstream = (req) =>
		request({
			hostname: '127.0.0.1',
			port: proxy.targetPort,
			path: req.url,
			method: req.method,
			headers: { ...req.headers, authorization },
		});
	const waiting = 'OpenCode is still connecting. Retry in a moment.';
	const server = createServer((req, res) => {
		if (!allowed(req)) {
			res.writeHead(403).end('Use the local OpenCode URL printed by pnpm session:opencode.');
			return;
		}
		if (!proxy.targetPort) {
			res.writeHead(503).end(waiting);
			return;
		}
		const remote = upstream(req);
		remote.on('response', (response) => {
			res.writeHead(response.statusCode, response.headers);
			response.on('error', () => res.destroy());
			response.pipe(res);
		});
		remote.on('error', () => {
			if (!res.headersSent) res.writeHead(502);
			res.end('The OpenCode connection is unavailable. Run the session command again.');
		});
		res.on('close', () => remote.destroy());
		req.pipe(remote);
	});
	// The web terminal uses WebSockets. Stream uploads and events without buffering.
	server.on('upgrade', (req, socket, head) => {
		if (!allowed(req)) {
			socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
			return;
		}
		if (!proxy.targetPort) {
			socket.end(`HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n${waiting}`);
			return;
		}
		const remote = upstream(req);
		remote.on('upgrade', (response, peer, remoteHead) => {
			sockets.add(peer);
			peer.on('close', () => {
				sockets.delete(peer);
				socket.destroy();
			});
			peer.on('error', () => socket.destroy());
			socket.on('close', () => peer.destroy());
			socket.on('error', () => peer.destroy());
			const headers = response.rawHeaders;
			socket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`);
			for (let index = 0; index < headers.length; index += 2)
				socket.write(`${headers[index]}: ${headers[index + 1]}\r\n`);
			socket.write('\r\n');
			if (remoteHead.length) socket.write(remoteHead);
			if (head.length) peer.write(head);
			socket.pipe(peer).pipe(socket);
		});
		remote.on('response', (response) => {
			response.resume();
			socket.end(
				`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\nConnection: close\r\n\r\n`,
			);
		});
		remote.on('error', () => socket.destroy());
		socket.on('close', () => remote.destroy());
		remote.end();
	});
	server.on('connection', (socket) => {
		sockets.add(socket);
		socket.on('close', () => sockets.delete(socket));
	});
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, '127.0.0.1', resolve);
	});
	host = `127.0.0.1:${server.address().port}`;
	origin = `http://${host}`;
	proxy.origin = origin;
	return proxy;
}
