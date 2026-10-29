import { nanoid } from 'nanoid';

import {
	FORM_TITLE,
	SOURCE_KINDS,
	expect,
	expectTriggerRefusals,
	loginThroughTrigger,
	publishFormTrigger,
	test,
	withTrigger,
} from './fixtures';

test.use({ capability: 'trusted-sources' });

test.describe(
	'Inbound auth: Form trigger @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		for (const kind of SOURCE_KINDS) {
			test.describe(`with the ${kind} source`, () => {
				test("should send the visitor to the source's login page and render the form after the login", async ({
					api,
					caller,
					member,
					sources,
				}) => {
					await withTrigger(
						api,
						publishFormTrigger(api, sources[kind].id, sources[kind].loginWebhookId('form')),
						async (trigger) => {
							const source = sources[kind];
							const token = await loginThroughTrigger(source, trigger, 'n8n-form-oauth');

							const form = await source.visitor.webhooks.trigger(trigger.path);
							expect(form.status()).toBe(200);
							expect(await form.text()).toContain(FORM_TITLE);

							// The form page sends the token from the login with its POST.
							const submitted = await caller.webhooks.trigger(trigger.path, {
								method: 'POST',
								headers: { 'x-auth-token': token },
								multipart: { 'field-0': 'Ada' },
							});
							expect(submitted.status()).toBe(200);
							// The form output names the user who signed in.
							const execution = await api.workflows.waitForExecution(trigger.workflowId, 20_000);
							const { data } = await api.workflows.getExecution(execution.id);
							expect(data).toContain(member.id);
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
					await withTrigger(
						api,
						publishFormTrigger(api, sources[kind].id, nanoid()),
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
										multipart: { 'field-0': 'Ada' },
									}),
							);
						},
					);
				});
			});
		}
	},
);
