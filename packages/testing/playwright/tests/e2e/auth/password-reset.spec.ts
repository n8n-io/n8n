import { test, expect } from '../../../fixtures/base';

test.use({ capability: 'email' });

test('Password reset email is delivered @capability:email', async ({ api, n8nContainer }) => {
	const ownerEmail = 'nathan@n8n.io';
	const res = await api.request.post('/rest/forgot-password', {
		data: { email: ownerEmail },
	});
	expect(res.ok()).toBeTruthy();

	const msg = await n8nContainer.services.mailpit.waitForMessage({
		to: ownerEmail,
		subject: /password reset/i,
	});
	expect(msg).toBeTruthy();
});
