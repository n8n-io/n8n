import { test, expect } from '../../../fixtures/base';

test.use({ capability: 'email' });

test('Password reset email is delivered @capability:email', {
	annotation: [
		{ type: 'owner', description: 'Identity & Access' },
	],
}, async ({ api, services }) => {
	const ownerEmail = 'nathan@n8n.io';
	const res = await api.request.post('/rest/forgot-password', {
		data: { email: ownerEmail },
	});
	expect(res.ok()).toBeTruthy();

	const msg = await services.mailpit.waitForMessage({
		to: ownerEmail,
		subject: /password reset/i,
	});
	expect(msg).toBeTruthy();
});
