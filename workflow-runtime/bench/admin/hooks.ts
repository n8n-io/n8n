/** Admin API test: a dynamic path with a webhook id, as n8n registers it. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'items/:id', method: 'GET', webhookId: 'abc-123' })],
	async run(ctx, trigger) {
		const raw = JSON.parse(JSON.stringify(trigger));
		return { params: raw.params, path: raw.path };
	},
});
