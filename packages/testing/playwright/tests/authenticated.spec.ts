import { test, expect } from '../fixtures/base';

test('default signin is as owner', async ({ n8n }) => {
	await n8n.goHome();
	await expect(n8n.page).toHaveURL(/\/workflow/);
});

test('owner can access dashboard @auth:owner', async ({ n8n }) => {
	await n8n.goHome();
	await expect(n8n.page).toHaveURL(/\/workflow/);
});

test('admin can access dashboard @auth:admin', async ({ n8n }) => {
	await n8n.goHome();
	await expect(n8n.page).toHaveURL(/\/workflow/);
});

test('member can access dashboard @auth:member', async ({ n8n }) => {
	await n8n.goHome();
	await expect(n8n.page).toHaveURL(/\/workflow/);
});

test('no auth can not access dashboard @auth:none', async ({ n8n }) => {
	await n8n.goHome();
	await expect(n8n.page).toHaveURL(/\/signin/);
});
