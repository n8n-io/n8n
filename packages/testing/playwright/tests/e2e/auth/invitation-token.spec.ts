import { expect, test } from '../../../fixtures/base';

test.describe('Invitation Token Acceptance', () => {
	test('should accept invitation using token-based endpoint', async ({ api }) => {
		// Invite a user (creates a user shell)
		const inviteResponse = await api.request.post('/rest/invitations', {
			data: [{ email: `testuser${Date.now()}@test.com`, role: 'global:member' }],
		});
		expect(inviteResponse.ok()).toBe(true);

		const inviteData = await inviteResponse.json();
		const { id: inviteeId } = inviteData.data[0].user;

		// Generate invite link with token
		const generateLinkResponse = await api.request.post(`/rest/users/${inviteeId}/invite-link`);
		expect(generateLinkResponse.ok()).toBe(true);

		const linkData = await generateLinkResponse.json();
		const inviteLink = linkData.link;

		// Extract token from URL
		const url = new URL(inviteLink);
		const token = url.searchParams.get('token');
		expect(token).toBeTruthy();

		// Accept invitation using token-based endpoint
		const acceptResponse = await api.request.post('/rest/invitations/accept', {
			data: {
				token,
				firstName: 'John',
				lastName: 'Doe',
				password: 'TestPassword123!',
			},
		});
		expect(acceptResponse.ok()).toBe(true);

		const acceptData = await acceptResponse.json();
		const user = acceptData.data;

		expect(user.id).toBe(inviteeId);
		expect(user.firstName).toBe('John');
		expect(user.lastName).toBe('Doe');
		expect(user.role).toBe('global:member');
	});

	test('should fail when token is missing', async ({ api }) => {
		const acceptResponse = await api.request.post('/rest/invitations/accept', {
			data: {
				firstName: 'John',
				lastName: 'Doe',
				password: 'TestPassword123!',
			},
		});
		expect(acceptResponse.status()).toBe(400);

		const errorData = await acceptResponse.json();
		expect(errorData.message).toContain('Token is required');
	});

	test('should fail with invalid token', async ({ api }) => {
		const acceptResponse = await api.request.post('/rest/invitations/accept', {
			data: {
				token: 'invalid-token',
				firstName: 'John',
				lastName: 'Doe',
				password: 'TestPassword123!',
			},
		});
		expect(acceptResponse.status()).toBe(400);

		const errorData = await acceptResponse.json();
		expect(errorData.message).toContain('Invalid invite URL');
	});

	test('should fail when invitation already accepted', async ({ api }) => {
		// Invite a user
		const inviteResponse = await api.request.post('/rest/invitations', {
			data: [{ email: `testuser${Date.now()}@test.com`, role: 'global:member' }],
		});
		expect(inviteResponse.ok()).toBe(true);

		const inviteData = await inviteResponse.json();
		const { id: inviteeId } = inviteData.data[0].user;

		// Generate invite link with token
		const generateLinkResponse = await api.request.post(`/rest/users/${inviteeId}/invite-link`);
		expect(generateLinkResponse.ok()).toBe(true);

		const linkData = await generateLinkResponse.json();
		const inviteLink = linkData.link;

		// Extract token from URL
		const url = new URL(inviteLink);
		const token = url.searchParams.get('token');
		expect(token).toBeTruthy();

		// Accept invitation first time
		const acceptResponse1 = await api.request.post('/rest/invitations/accept', {
			data: {
				token,
				firstName: 'John',
				lastName: 'Doe',
				password: 'TestPassword123!',
			},
		});
		expect(acceptResponse1.ok()).toBe(true);

		// Try to accept again with the same token
		const acceptResponse2 = await api.request.post('/rest/invitations/accept', {
			data: {
				token,
				firstName: 'Jane',
				lastName: 'Smith',
				password: 'TestPassword456!',
			},
		});
		expect(acceptResponse2.status()).toBe(400);

		const errorData = await acceptResponse2.json();
		expect(errorData.message).toContain('This invite has been accepted already');
	});

	test('should fail with missing required fields', async ({ api }) => {
		// Invite a user
		const inviteResponse = await api.request.post('/rest/invitations', {
			data: [{ email: `testuser${Date.now()}@test.com`, role: 'global:member' }],
		});
		expect(inviteResponse.ok()).toBe(true);

		const inviteData = await inviteResponse.json();
		const { id: inviteeId } = inviteData.data[0].user;

		// Generate invite link with token
		const generateLinkResponse = await api.request.post(`/rest/users/${inviteeId}/invite-link`);
		expect(generateLinkResponse.ok()).toBe(true);

		const linkData = await generateLinkResponse.json();
		const inviteLink = linkData.link;

		// Extract token from URL
		const url = new URL(inviteLink);
		const token = url.searchParams.get('token');
		expect(token).toBeTruthy();

		// Try to accept without firstName
		const acceptResponse1 = await api.request.post('/rest/invitations/accept', {
			data: {
				token,
				lastName: 'Doe',
				password: 'TestPassword123!',
			},
		});
		expect(acceptResponse1.status()).toBe(400);

		// Try to accept without lastName
		const acceptResponse2 = await api.request.post('/rest/invitations/accept', {
			data: {
				token,
				firstName: 'John',
				password: 'TestPassword123!',
			},
		});
		expect(acceptResponse2.status()).toBe(400);

		// Try to accept without password
		const acceptResponse3 = await api.request.post('/rest/invitations/accept', {
			data: {
				token,
				firstName: 'John',
				lastName: 'Doe',
			},
		});
		expect(acceptResponse3.status()).toBe(400);
	});

	test('should accept invitation and set authentication cookie', async ({ api }) => {
		// Invite a user
		const inviteResponse = await api.request.post('/rest/invitations', {
			data: [{ email: `testuser${Date.now()}@test.com`, role: 'global:member' }],
		});
		expect(inviteResponse.ok()).toBe(true);

		const inviteData = await inviteResponse.json();
		const { id: inviteeId } = inviteData.data[0].user;

		// Generate invite link with token
		const generateLinkResponse = await api.request.post(`/rest/users/${inviteeId}/invite-link`);
		expect(generateLinkResponse.ok()).toBe(true);

		const linkData = await generateLinkResponse.json();
		const inviteLink = linkData.link;

		// Extract token from URL
		const url = new URL(inviteLink);
		const token = url.searchParams.get('token');
		expect(token).toBeTruthy();

		// Accept invitation using token-based endpoint
		const acceptResponse = await api.request.post('/rest/invitations/accept', {
			data: {
				token,
				firstName: 'John',
				lastName: 'Doe',
				password: 'TestPassword123!',
			},
		});
		expect(acceptResponse.ok()).toBe(true);

		// Verify authentication cookie is set
		const setCookieHeader = acceptResponse.headers()['set-cookie'];
		expect(setCookieHeader).toBeTruthy();
		expect(String(setCookieHeader)).toContain('n8n-auth');
	});
});
