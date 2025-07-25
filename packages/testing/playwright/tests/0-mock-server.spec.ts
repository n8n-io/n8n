import { test, expect } from '../fixtures/base';

test.describe('Mock server', () => {
	test('should verify MockServer container is running @mode:mockserver @db:reset', async ({
		n8nContainer,
	}) => {
		// Verify MockServer is available
		const mockServerUrl = n8nContainer.mockServerUrl;
		// eslint-disable-next-line playwright/no-conditional-in-test
		if (!mockServerUrl) {
			throw new Error('MockServer URL not available');
		}

		// Test basic MockServer functionality
		const mockResponse = await fetch(`${mockServerUrl}/mockserver/expectation`, {
			method: 'PUT',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				httpRequest: {
					method: 'GET',
					path: '/health',
				},
				httpResponse: {
					statusCode: 200,
					body: JSON.stringify({ status: 'healthy' }),
				},
			}),
		});

		expect(mockResponse.ok).toBe(true);

		// Verify the mock endpoint works
		const healthResponse = await fetch(`${mockServerUrl}/health`);
		expect(healthResponse.ok).toBe(true);
		const healthData = await healthResponse.json();
		expect(healthData.status).toBe('healthy');
	});
});
