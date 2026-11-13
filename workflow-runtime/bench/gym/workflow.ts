/** Gym test: an HTTPS call to a vendor host that the ai-gym simulates. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ url: string }>({ path: 'gym', method: 'POST' })],
	async run(ctx, trigger) {
		try {
			const r = await ctx.http({ name: 'Call', method: 'GET', url: trigger.body.url });
			return { status: r.status, body: r.body };
		} catch (e) {
			return { error: String((e as { message?: string }).message) };
		}
	},
});
