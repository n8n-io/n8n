// Responses that come in several TLS records and reads must all complete:
// headers then body after a pause (chunked over HTTP/1.1), and many small
// records in one TCP segment. Each call has 5 s; one that does not answer
// is a hang. Sequential calls reuse one connection; concurrent calls open
// several (HTTP/1.1) or share streams (HTTP/2).
// usage: node hangcheck.mjs <serve port> <go upstream port>
const [serve, port] = process.argv.slice(2).map(Number);
const up = `https://127.0.0.1:${port}`;

async function call(args) {
	const ctl = new AbortController();
	const t = setTimeout(() => ctl.abort(), 5000);
	try {
		const res = await fetch(`http://127.0.0.1:${serve}/egress`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(args),
			signal: ctl.signal,
		});
		return JSON.parse(await res.text());
	} catch (e) {
		return { hang: e.name === 'AbortError', error: String(e) };
	} finally {
		clearTimeout(t);
	}
}

function check(r, path) {
	if (r.hang) return 'hang';
	if (!r.ok) return `error: ${r.error}`;
	if (path.startsWith('/split') && !(r.body && r.body.done === true)) return `bad body ${JSON.stringify(r.body)}`;
	if (path === '/records' && r.body !== 'r'.repeat(20)) return `bad body ${JSON.stringify(r.body)}`;
	return null;
}

let bad = 0;
const paths = ['/split?ms=20', '/records', '/split?ms=0'];
for (const path of paths) {
	for (let i = 0; i < 30; i++) {
		const why = check(await call({ method: 'GET', url: `${up}${path}` }), path);
		if (why) {
			bad++;
			console.log(`FAIL sequential ${path} #${i}: ${why}`);
		}
	}
	const rs = await Promise.all(Array.from({ length: 60 }, () => call({ method: 'GET', url: `${up}${path}` })));
	rs.forEach((r, i) => {
		const why = check(r, path);
		if (why) {
			bad++;
			console.log(`FAIL concurrent ${path} #${i}: ${why}`);
		}
	});
}
console.log(bad === 0 ? 'all split-response checks passed' : `${bad} split-response check(s) failed`);
process.exit(bad === 0 ? 0 : 1);
