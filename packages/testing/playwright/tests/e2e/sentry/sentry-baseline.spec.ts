import { test, expect } from '../../../fixtures/base';

test.use({ capability: 'kent' });

test.beforeEach(async ({ n8nContainer }) => {
	await n8nContainer.services.kent.clear();
});

test.describe('Sentry baseline', {
	annotation: [
		{ type: 'owner', description: 'Catalysts' },
	],
}, () => {
	test('frontend error is captured', async ({ n8n, n8nContainer }) => {
		const kent = n8nContainer.services.kent;
		await n8n.navigate.toHome();

		n8n.page.on('pageerror', () => {});
		await n8n.page.evaluate(() => {
			setTimeout(() => {
				throw new Error('Test frontend error');
			}, 0);
		});

		await expect
			.poll(
				async () =>
					await kent.getEvents({
						source: 'frontend',
						type: 'error',
						messageContains: 'Test frontend error',
					}),
				{ timeout: 10000 },
			)
			.toHaveLength(1);
	});

	test('backend transaction is captured', async ({ n8n, n8nContainer }) => {
		const kent = n8nContainer.services.kent;
		await n8n.navigate.toHome();

		await expect
			.poll(async () => await kent.getEvents({ source: 'backend', type: 'transaction' }), {
				timeout: 10000,
			})
			.not.toHaveLength(0);
	});

	test('events have deployment identification via server_name tag', async ({
		n8n,
		n8nContainer,
	}) => {
		const kent = n8nContainer.services.kent;
		await n8n.navigate.toHome();

		n8n.page.on('pageerror', () => {});
		await n8n.page.evaluate(() => {
			setTimeout(() => {
				throw new Error('Deployment test error');
			}, 0);
		});

		await expect
			.poll(
				async () =>
					await kent.getEvents({ source: 'frontend', messageContains: 'Deployment test error' }),
				{ timeout: 10000 },
			)
			.toHaveLength(1);

		const [frontendError] = await kent.getEvents({
			source: 'frontend',
			messageContains: 'Deployment test error',
		});

		expect(kent.getTags(frontendError)?.server_name).toBe('e2e-test-deployment');
	});
});
