/** Admin API test: a 16 MB multipart upload. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'big', method: 'POST' })],
	async run(ctx, trigger) {
		// @ts-expect-error `$binary` is not in the SDK's WebhookEvent type yet.
		const file = trigger.$binary.file;
		return { fileName: file.fileName, bytes: file.bytes, base64: file.data.length, tail: file.data.slice(-8) };
	},
});
