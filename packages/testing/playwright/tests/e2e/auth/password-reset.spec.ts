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

test('Rate limits forgot-password requests by email @capability:email', async ({ api }) => {
	const testEmail = 'rate-limit-test@example.com';

	// Make 3 requests (the limit per hour per email)
	for (let i = 0; i < 3; i++) {
		const res = await api.request.post('/rest/forgot-password', {
			data: { email: testEmail },
		});
		expect(res.status()).toBe(200);
	}

	// 4th request should be rate limited
	const rateLimitedRes = await api.request.post('/rest/forgot-password', {
		data: { email: testEmail },
	});
	expect(rateLimitedRes.status()).toBe(429);

	const body = await rateLimitedRes.json();
	expect(body.message).toBe('Too many requests');
});

test('Different emails have separate rate limit buckets @capability:email', async ({ api }) => {
	const email1 = 'rate-bucket-1@example.com';
	const email2 = 'rate-bucket-2@example.com';

	// Exhaust rate limit for email1
	for (let i = 0; i < 3; i++) {
		await api.request.post('/rest/forgot-password', {
			data: { email: email1 },
		});
	}

	// email2 should still work (different bucket)
	const res = await api.request.post('/rest/forgot-password', {
		data: { email: email2 },
	});
	expect(res.status()).toBe(200);
});
