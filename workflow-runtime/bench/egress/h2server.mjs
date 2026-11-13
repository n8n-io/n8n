// HTTP/2 behaviours for the egress test, with Node's own http2 session API:
// a low stream limit, GOAWAY, RST_STREAM, PING, trailers, a header block
// that needs CONTINUATION, an interim 103, and bodies larger than the
// stream window.
// usage: node h2server.mjs <dir with cert.pem and key.pem> <port>
import { readFileSync } from 'node:fs';
import http2 from 'node:http2';

const [dir, port] = process.argv.slice(2);
const { HTTP2_HEADER_STATUS: STATUS, NGHTTP2_REFUSED_STREAM, NGHTTP2_CANCEL } = http2.constants;
let refused = 0;
let sessions = 0;
// Streams that arrive on a session after it sent GOAWAY (the client must not open them).
const goneAway = new WeakSet();
let late = 0;

const server = http2.createSecureServer({
	cert: readFileSync(`${dir}/cert.pem`),
	key: readFileSync(`${dir}/key.pem`),
	settings: { maxConcurrentStreams: 4, initialWindowSize: 65535 },
});
server.on('session', () => sessions++);
server.on('stream', (stream, headers) => {
	// Streams that this server resets report it as an error.
	stream.on('error', () => {});
	const session = stream.session;
	if (goneAway.has(session)) late++;
	const url = new URL(headers[':path'], 'https://x');
	const chunks = [];
	stream.on('data', (c) => chunks.push(c));
	stream.on('end', () => {
		const body = Buffer.concat(chunks);
		const json = (o, extra = {}) => {
			stream.respond({ [STATUS]: 200, 'content-type': 'application/json', ...extra });
			stream.end(JSON.stringify(o));
		};
		switch (url.pathname) {
			case '/ok':
				return json({ ok: true, sessions, late });
			case '/slow':
				return setTimeout(() => json({ slow: true, sessions }), Number(url.searchParams.get('ms') ?? '200'));
			case '/echo':
				return json({ length: body.length, sum: body.reduce((a, b) => (a + b) % 65521, 0) });
			case '/big': {
				const n = Number(url.searchParams.get('kb') ?? '3000') * 1024;
				stream.respond({ [STATUS]: 200, 'content-type': 'application/octet-stream' });
				return stream.end(Buffer.alloc(n, 'q'));
			}
			case '/rst':
				return stream.close(NGHTTP2_CANCEL);
			case '/refuse':
				// The first request is refused; the client sends it again.
				if (refused++ % 2 === 0) return stream.close(NGHTTP2_REFUSED_STREAM);
				return json({ refusedBefore: true });
			case '/goaway':
				json({ goaway: true, sessions });
				return setTimeout(() => {
					goneAway.add(session);
					session.goaway(0);
				}, 10);
			case '/ping':
				stream.session.ping(Buffer.from('12345678'), () => json({ pinged: true }));
				return;
			case '/trailers':
				stream.respond({ [STATUS]: 200, 'content-type': 'text/plain' }, { waitForTrailers: true });
				stream.on('wantTrailers', () => stream.sendTrailers({ 'x-checksum': 'abc' }));
				return stream.end('with trailers');
			case '/headers': {
				// About 40 KB of headers: more than one frame, so CONTINUATION.
				const h = { [STATUS]: 200, 'content-type': 'text/plain' };
				for (let i = 0; i < 100; i++) h[`x-h${i}`] = `${i}-${'v'.repeat(400)}`;
				stream.respond(h);
				return stream.end('many headers');
			}
			case '/interim':
				stream.additionalHeaders({ [STATUS]: 103, link: '</a.css>; rel=preload' });
				return json({ afterInterim: true });
			case '/429':
				stream.respond({ [STATUS]: 429, 'retry-after': '1', 'content-type': 'text/plain' });
				return stream.end('slow down');
			default:
				stream.respond({ [STATUS]: 404 });
				return stream.end('not found');
		}
	});
});
server.listen(Number(port), '127.0.0.1', () => console.log('h2 behaviour upstream ready'));
