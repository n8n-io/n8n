/** Admin API test: a person approves through the resume endpoint. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'approve', method: 'POST' })],
	async run(ctx) {
		const answer = await ctx.approval({ name: 'Approve', message: 'Ship it?' });
		return { approved: answer.approved };
	},
});
