import { test, expect } from '../../../fixtures/base';
import { capabilities } from '../../../fixtures/capabilities';

test.use({ addContainerCapability: capabilities.email });

test('Password reset email is delivered @capability:email', async ({ api, chaos }) => {
	const ownerEmail = 'nathan@n8n.io';
	const res = await api.request.post('/rest/forgot-password', {
		data: { email: ownerEmail },
	});
	expect(res.ok()).toBeTruthy();

	const msg = await chaos.mail.waitForMessage({ to: ownerEmail, subject: /password reset/i });
	expect(msg).toBeTruthy();
});
