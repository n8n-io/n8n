/**
 * The workflow of the static data tests of wfrt (src/shell/static_data_test.zig).
 * Each run counts in the global static data; with `host`, a host step gets
 * the document and may change it.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ host?: boolean; fail?: boolean }>({ path: 'sd' })],
	async run(ctx, trigger) {
		const g = ctx.staticData('global');
		g.count = (typeof g.count === 'number' ? g.count : 0) + 1;
		if (trigger.body.host) {
			await ctx.node({ name: 'Host', type: 'n8n-nodes-base.noOp', parameters: {}, items: [], staticData: true });
			// The host step may have replaced the document: read it again.
			const after = ctx.staticData('global');
			return { count: after.count, fromHost: after.fromHost ?? null };
		}
		if (trigger.body.fail) throw new Error('fails after the change');
		return { count: g.count };
	},
});
