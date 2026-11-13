/** W3 for the egress load test: one GET to the stub on port 19391. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ id: string }>({ path: 'w3' })],
	durability: 'steps',
	async run(ctx, trigger) {
		const r = await ctx.http({ name: 'Call', method: 'GET', url: 'http://127.0.0.1:19391/stub', idempotent: true });
		return { id: trigger.body.id, upstream: r.status, ok: trigger.body.id };
	},
});
