// A stand-in fallback host on a Unix socket (length-prefixed JSON frames)
// that answers each step with the credentials of its frame and the targets
// of its sub-nodes, and an
// HTTP server that echoes the authorization header.
import { createServer as createHttp } from 'node:http';
import { createServer } from 'node:net';

const [sock, port] = process.argv.slice(2);
/** Every frame the host got; `GET /frames` on the echo server lists them. */
const frames = [];

createServer((c) => {
	let buf = Buffer.alloc(0);
	c.on('data', (d) => {
		buf = Buffer.concat([buf, d]);
		while (buf.length >= 4) {
			const len = buf.readUInt32LE(0);
			if (buf.length < 4 + len) break;
			const frame = JSON.parse(buf.subarray(4, 4 + len).toString());
			buf = buf.subarray(4 + len);
			frames.push(frame);
			const fail = frame.args?.parameters?.fail === true;
			const out = Buffer.from(JSON.stringify(fail ? { id: frame.id, ok: false, error: 'send failed' } : { id: frame.id, ok: true, result: [{ json: { credential: frame.credential ?? null, credentials: frame.credentials ?? null, targets: (frame.args.subNodes ?? []).map((n) => n.target) } }] }));
			const head = Buffer.alloc(4);
			head.writeUInt32LE(out.length);
			c.write(Buffer.concat([head, out]));
		}
	});
}).listen(sock);

createHttp((req, res) => {
	res.setHeader('content-type', 'application/json');
	if (req.url === '/frames') return res.end(JSON.stringify(frames));
	res.end(JSON.stringify({ authorization: req.headers.authorization ?? null }));
}).listen(Number(port), '127.0.0.1');
