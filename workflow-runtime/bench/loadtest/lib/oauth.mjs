// Refreshes the OAuth2 access tokens of a `wfrt` credentials document with
// their refresh tokens, as packages/@n8n/workflow-lang/scripts/gym/oauth-refresh.ts
// does, but in process: requests go straight to the gym's HTTPS listener
// with the vendor name for TLS.
import fs from 'node:fs';
import https from 'node:https';

const GYM_HTTPS = Number(process.env.GYM_HTTPS_PORT ?? 47443);

function post(url, headers, body, ca) {
	const u = new URL(url);
	return new Promise((resolve, reject) => {
		const req = https.request(
			{ host: '127.0.0.1', port: GYM_HTTPS, servername: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { ...headers, host: u.host, 'content-length': Buffer.byteLength(body) }, ca, timeout: 15000 },
			(res) => {
				let text = '';
				res.on('data', (d) => (text += d));
				res.on('end', () => resolve({ status: res.statusCode, text }));
			},
		);
		req.on('error', reject);
		req.on('timeout', () => req.destroy(new Error('timeout')));
		req.end(body);
	});
}

/** Refreshes each credential with a refresh token, in place. Returns a report by slot. */
export async function refreshOAuth(doc, caFile) {
	const ca = fs.readFileSync(caFile);
	const report = {};
	for (const [slot, entry] of Object.entries(doc)) {
		const data = entry?.data;
		const token = data?.oauthTokenData;
		if (!token?.refresh_token || typeof data.accessTokenUrl !== 'string') continue;
		const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refresh_token });
		const headers = { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };
		const id = typeof data.clientId === 'string' ? data.clientId : '';
		const secret = typeof data.clientSecret === 'string' ? data.clientSecret : '';
		if (data.authentication === 'header') headers.authorization = `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
		else {
			form.set('client_id', id);
			form.set('client_secret', secret);
		}
		try {
			const r = await post(data.accessTokenUrl, headers, form.toString(), ca);
			const body = JSON.parse(r.text);
			if (r.status === 200 && typeof body.access_token === 'string') {
				data.oauthTokenData = { ...token, ...body };
				report[slot] = 'ok';
			} else report[slot] = `failed ${r.status}`;
		} catch (e) {
			report[slot] = `failed ${e.message}`;
		}
	}
	return report;
}
