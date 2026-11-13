/** Admin API test: uploaded files and binary bodies of a webhook. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'upload', method: 'POST' })],
	async run(ctx, trigger) {
		// `$binary` is not in the SDK's WebhookEvent type yet.
		const raw = JSON.parse(JSON.stringify(trigger));
		return { body: raw.body, binary: raw.$binary };
	},
});
