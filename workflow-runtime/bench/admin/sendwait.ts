/** Admin API test: ctx.execution(), ctx.vars() and a send-and-wait approval. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ fail?: boolean }>({ path: 'sendwait', method: 'POST' })],
	async run(ctx, trigger) {
		const ex = ctx.execution();
		const answer = await ctx.approval({
			name: 'Ask',
			message: 'Ship it?',
			node: {
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				parameters: { text: ex.resumeUrl, fail: trigger.body.fail === true },
			},
		});
		return { ex, vars: ctx.vars(), approved: answer.approved };
	},
});
