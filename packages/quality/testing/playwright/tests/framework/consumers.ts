import { marker, provision, record } from './support';
import { INSTANCE_MEMBER_CREDENTIALS, INSTANCE_OWNER_CREDENTIALS } from '../../config/test-users';
import { test as base, expect } from '../../fixtures/base';

let suppliedFrontendUrl: string;
const test = base.extend({
	n8nContainer: [
		async ({}, use) => {
			const { stack, frontendUrl } = await provision();
			suppliedFrontendUrl = frontendUrl;
			try {
				await use(stack);
			} finally {
				await stack.stop();
			}
		},
		{ scope: 'worker' },
	],
	frontendUrl: [
		async ({ n8nContainer }, use) => {
			void n8nContainer;
			await use(suppliedFrontendUrl);
		},
		{ scope: 'worker' },
	],
	quarantineList: async ({}, use) => {
		await use(new Set<string>());
	},
});

test.describe(
	'Harness consumers',
	{ annotation: { type: 'owner', description: 'Developer Platform' } },
	() => {
		test('api-only', async ({ api }) => {
			record({ type: 'body' });
			const response = await api.request.get('/identity');
			expect(response.ok()).toBe(true);
			expect(await response.json()).toEqual({ id: INSTANCE_OWNER_CREDENTIALS.email });
		});

		test('ui-only', async ({ n8n }) => {
			record({ type: 'body' });
			n8n.page.once('close', () => record({ type: 'page-closed' }));
			const response = await n8n.page.goto('/consumer');
			expect(response?.ok()).toBe(true);
			await expect(n8n.page.getByRole('heading')).toHaveText(INSTANCE_OWNER_CREDENTIALS.email);
		});

		test('combined', { tag: ['@db:reset', '@auth:member'] }, async ({ api, n8n }) => {
			record({ type: 'body' });
			const response = await api.request.get('/identity');
			expect(response.ok()).toBe(true);
			expect(await response.json()).toEqual({ id: INSTANCE_MEMBER_CREDENTIALS[0].email });
			await n8n.page.goto('/consumer');
			await expect(n8n.page.getByRole('heading')).toHaveText(INSTANCE_MEMBER_CREDENTIALS[0].email);
		});

		test('service-only', async ({ services }) => {
			record({ type: 'body' });
			await services.mailpit.clear();
			expect(await services.mailpit.list()).toEqual([]);
		});

		test('body-failure', async ({ n8n }) => {
			record({ type: 'body' });
			n8n.page.once('close', () => record({ type: 'page-closed' }));
			await n8n.page.goto('/consumer');
			const consoleEvent = n8n.page.waitForEvent(
				'console',
				(message) => message.text() === `${marker}:console-error`,
			);
			await n8n.page.evaluate((text) => console.error(text), `${marker}:console-error`);
			await consoleEvent;
			throw new Error(`${marker}:body-error`);
		});

		test('bootstrap-failure', async ({ api }) => {
			record({ type: 'body' });
			await api.request.get('/identity');
			throw new Error('Bootstrap failure must prevent this body from running');
		});
	},
);
