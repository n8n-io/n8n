/** Admin API test: Respond to Webhook with a binary or JSON body and headers. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'file', method: 'GET' })],
	async run(ctx, trigger) {
		if (trigger.query.mode === 'json') {
			await ctx.respond({
				name: 'Respond JSON',
				status: 200,
				body: { ok: true },
				headers: { 'Access-Control-Allow-Origin': '*', 'X-Bad': 'a\r\nx-injected: 1' },
			});
			return 'json';
		}
		await ctx.respond({
			name: 'Respond',
			status: 201,
			body: null,
			headers: { 'Content-Type': 'text/csv', 'Cache-Control': 'no-store', 'Content-Length': '99' },
			binary: { data: 'aGVsbG8gYmluYXJ5', mimeType: 'text/plain', fileName: 'a.txt' },
		});
		return 'sent';
	},
});
