import { nanoid } from 'nanoid';

import {
	SOURCE_KINDS,
	expect,
	expectTriggerRefusals,
	loginThroughTrigger,
	publishChatTrigger,
	test,
	withTrigger,
} from './fixtures';

test.use({ capability: 'trusted-sources' });

test.describe(
	'Inbound auth: Chat trigger @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		for (const kind of SOURCE_KINDS) {
			test.describe(`with the ${kind} source`, () => {
				test("should send the visitor to the source's login page and render the chat after the login", async ({
					api,
					sources,
				}) => {
					await withTrigger(
						api,
						publishChatTrigger(api, sources[kind].id, sources[kind].loginWebhookId('chat')),
						async (trigger) => {
							const source = sources[kind];
							await loginThroughTrigger(source, trigger, 'n8n-chat-oauth');

							const shell = await source.visitor.webhooks.trigger(trigger.path);
							expect(shell.status()).toBe(200);
							expect(await shell.text()).toContain("id='n8n-chat-frame'");
							// The shell shows no visitor details, so the binding is the identity check.
							await source.expectBinding();
						},
					);
				});

				test('should refuse a POST without a credential or from the other source', async ({
					api,
					caller,
					sources,
				}) => {
					// A GET without a session starts the login, so only the POST answers 401.
					// `caller` has no session cookie, so the POST cannot pass through a session.
					await withTrigger(
						api,
						publishChatTrigger(api, sources[kind].id, nanoid()),
						async (trigger) => {
							await expectTriggerRefusals(
								api,
								trigger,
								sources,
								kind,
								async (token) =>
									await caller.webhooks.trigger(trigger.path, {
										method: 'POST',
										headers: token ? { 'x-auth-token': token } : {},
										data: { action: 'sendMessage', sessionId: nanoid(), chatInput: 'hi' },
									}),
							);
						},
					);
				});
			});
		}
	},
);
