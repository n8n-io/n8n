/** Admin API test: per-workflow credentials for HTTP and the fallback host. */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ url: string }>({ path: 'creds', method: 'POST' })],
	credentials: { api: { type: 'httpHeaderAuth' }, model: { type: 'openAiApi' }, tool: { type: 'postgres' } },
	async run(ctx, trigger) {
		const echo = await ctx.http({ name: 'Call', method: 'GET', url: trigger.body.url, credential: 'api' });
		const host = await ctx.node({
			name: 'Legacy',
			type: 'n8n-nodes-base.noLibraryNode',
			parameters: {},
			credential: 'api',
			subNodes: [
				{ name: 'Model', type: 'n8n-nodes-base.lmChat', typeVersion: 1, parameters: {}, credential: 'model', connection: 'ai_languageModel', target: 'Legacy' },
				{ name: 'Model 2', type: 'n8n-nodes-base.lmChat', typeVersion: 1, parameters: {}, credential: 'api', connection: 'ai_languageModel', target: 'Legacy', slots: ['tool', 'model'] },
			],
		});
		await ctx.respond({ name: 'Respond', status: 200, body: { echo: echo.body, host } });
		return 'done';
	},
});
