import {
	SOURCE_KINDS,
	expect,
	expectExecuteGate,
	expectTriggerRefusals,
	publishWebhookTrigger,
	test,
	withTrigger,
} from './fixtures';

test.use({ capability: 'trusted-sources' });

test.describe(
	'Inbound auth: Webhook trigger @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		for (const kind of SOURCE_KINDS) {
			test.describe(`with the ${kind} source`, () => {
				test('should run as the member only while the member can execute the workflow', async ({
					api,
					memberApi,
					caller,
					sources,
				}) => {
					await withTrigger(api, publishWebhookTrigger(api, sources[kind].id), async (trigger) => {
						const post = async (headers: Record<string, string>) =>
							await caller.webhooks.trigger(trigger.path, { method: 'POST', headers, data: {} });

						await expectExecuteGate(api, memberApi, sources[kind], trigger, {
							run: async (headers) => expect((await post(headers)).status()).toBe(200),
							send: post,
						});
					});
				});

				test('should challenge, refuse the other source and list only this source', async ({
					api,
					caller,
					sources,
				}) => {
					await withTrigger(api, publishWebhookTrigger(api, sources[kind].id), async (trigger) => {
						await expectTriggerRefusals(
							api,
							trigger,
							sources,
							kind,
							async (token) =>
								await caller.webhooks.trigger(trigger.path, {
									method: 'POST',
									headers: token ? { Authorization: `Bearer ${token}` } : {},
									data: {},
								}),
						);
					});
				});
			});
		}
	},
);
