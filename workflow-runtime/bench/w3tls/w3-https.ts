/** W3 with a compiled module: one GET to the local stub over https. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ id: string }>({ path: 'w3' })],
	durability: 'steps',
	async run(ctx, trigger) {
		const r = await ctx.http({ name: 'Call', method: 'GET', url: 'https://127.0.0.1:19443/stub', idempotent: true });
		return { id: trigger.body.id, upstream: r.status, ok: trigger.body.id };
	},
});
