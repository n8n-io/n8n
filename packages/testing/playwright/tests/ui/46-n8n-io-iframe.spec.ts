import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

const telemetryDisabledRequirements: TestRequirements = {
	config: {
		settings: {
			telemetry: { enabled: false },
		},
	},
	storage: {
		'n8n-telemetry': JSON.stringify({ enabled: false }),
	},
};

const telemetryEnabledRequirements: TestRequirements = {
	config: {
		settings: {
			telemetry: { enabled: true },
			instanceId: 'test-instance-id',
		},
	},
	storage: {
		'n8n-telemetry': JSON.stringify({ enabled: true }),
		'n8n-instance-id': 'test-instance-id',
	},
	intercepts: {
		iframeRequest: {
			url: 'https://n8n.io/self-install*',
			response: '<html><body>Test iframe content</body></html>',
			contentType: 'text/html',
		},
	},
};

test.describe('n8n.io iframe', () => {
	test.describe('when telemetry is disabled', () => {
		test('should not load the iframe when visiting /home/workflows', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(telemetryDisabledRequirements);

			await n8n.page.goto('/');
			await n8n.page.waitForLoadState();
			await expect(n8n.iframe.getIframe()).not.toBeAttached();
		});
	});

	test.describe('when telemetry is enabled', () => {
		test('should load the iframe when visiting /home/workflows @auth:owner', async ({
			n8n,
			setupRequirements,
			api,
		}) => {
			await setupRequirements(telemetryEnabledRequirements);

			// Get current user ID from the API
			const currentUser = await api.get('/rest/login');
			const testInstanceId = 'test-instance-id';
			const testUserId = currentUser.id;
			const iframeUrl = `https://n8n.io/self-install?instanceId=${testInstanceId}&userId=${testUserId}`;

			await n8n.page.goto('/');
			await n8n.page.waitForLoadState();

			const iframeElement = n8n.iframe.getIframeBySrc(iframeUrl);
			await expect(iframeElement).toBeAttached();

			await expect(iframeElement).toHaveAttribute('src', iframeUrl);
		});
	});
});
