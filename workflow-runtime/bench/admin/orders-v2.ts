/** Admin API test, version 2: traces each glue node. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ qty: number }>({ path: 'orders/:id', method: 'POST' })],
	async run(ctx, trigger) {
		const raw = JSON.parse(JSON.stringify(trigger));
		const items = [{ json: { id: raw.params.id, qty: trigger.body.qty, q: raw.query.q } }];
		ctx.trace('Webhook', items);
		const doubled = items.map((i) => ({ json: { ...i.json, qty: i.json.qty * 2 } }));
		ctx.trace('Set', doubled);
		return { version: 2, items: doubled };
	},
});
