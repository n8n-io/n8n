/** Egress test: the request body holds the args of one http call. */
import { webhook, workflow } from '@n8n/workflow-lang';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'PATCH';

interface Args {
	method: Method;
	url: string;
	headers?: Record<string, string>;
	qs?: Record<string, unknown>;
	body?: unknown;
	cred?: boolean;
	timeoutMs?: number;
}

export default workflow({
	triggers: [webhook<Args>({ path: 'egress' })],
	credentials: { api: { type: 'httpHeaderAuth' } },
	async run(ctx, trigger) {
		const b = trigger.body;
		try {
			if (b.cred) {
				const r = await ctx.http({
					name: 'Call with credential',
					method: b.method,
					url: b.url,
					headers: b.headers,
					qs: b.qs,
					body: b.body,
					credential: 'api',
				});
				return { ok: true, status: r.status, headers: r.headers, body: r.body };
			}
			const r = await ctx.http({
				name: 'Call',
				method: b.method,
				url: b.url,
				headers: b.headers,
				qs: b.qs,
				body: b.body,
				timeoutMs: b.timeoutMs,
			});
			return { ok: true, status: r.status, headers: r.headers, body: r.body };
		} catch (e) {
			return { ok: false, error: e.message };
		}
	},
});
