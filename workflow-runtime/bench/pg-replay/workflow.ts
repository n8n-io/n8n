import { webhook, workflow } from '@n8n/workflow-lang';

// Forwards one posted `sql` call to the runtime and answers with its result.
// `replay.mts` posts the recorded calls of the Postgres library node to it.
export default workflow({
	triggers: [webhook<{ slot: string; call: any }>({ path: 'replay', method: 'POST' })],
	credentials: {
		db: { type: 'postgres' },
		badport: { type: 'postgres' },
		badpass: { type: 'postgres' },
	},
	async run(ctx, trigger) {
		const call = trigger.body.call;
		let out: unknown;
		try {
			if (trigger.body.slot === 'badport') {
				out = await ctx.sql({
					name: 'Bad port',
					credential: 'badport',
					dialect: 'postgres',
					mode: call.mode,
					statements: call.statements,
					largeNumbers: call.largeNumbers,
					dates: call.dates,
				});
			} else if (trigger.body.slot === 'badpass') {
				out = await ctx.sql({
					name: 'Bad password',
					credential: 'badpass',
					dialect: 'postgres',
					mode: call.mode,
					statements: call.statements,
					largeNumbers: call.largeNumbers,
					dates: call.dates,
				});
			} else {
				out = await ctx.sql({
					name: 'Call',
					credential: 'db',
					dialect: 'postgres',
					mode: call.mode,
					statements: call.statements,
					largeNumbers: call.largeNumbers,
					dates: call.dates,
				});
			}
		} catch (error) {
			out = { $error: (error as Error).message };
		}
		await ctx.respond({ name: 'Reply', status: 200, body: out });
	},
});
