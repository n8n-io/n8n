/** Admin API test, version 1: answers the webhook with its version. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ qty: number }>({ path: 'orders/:id', method: 'POST' })],
	async run(ctx, trigger) {
		const raw = JSON.parse(JSON.stringify(trigger));
		ctx.trace('Webhook', [{ json: raw.body }]);
		return { version: 1, id: raw.params.id, qty: trigger.body.qty };
	},
});
