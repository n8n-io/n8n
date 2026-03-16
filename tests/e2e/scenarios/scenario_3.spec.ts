import { test, expect } from '../../../packages/testing/playwright/fixtures/base';

/**
 * Scenario 3: Error Handling and Retry
 *
 * Tests:
 * - POST /rest/scenario/error-handling/execute
 * - GET /rest/scenario/error-handling/retry-demo
 * - GET /rest/scenario/error-handling/continue-demo
 */
test.describe('Scenario 3: Error Handling and Retry', () => {
	test('should retry failed nodes with backoff', async ({ api }) => {
		const response = await api.request.post('/rest/scenario/error-handling/execute', {
			data: {
				nodes: [
					{
						name: 'Flaky',
						shouldFail: true,
						settings: { continueOnFail: false, retryOnFail: true, maxTries: 3, waitBetweenTries: 1 },
					},
				],
			},
		});

		const body = await response.json();
		const result = body.data ?? body;
		expect(result.nodeResults[0].attempts).toBe(3);
		expect(result.nodeResults[0].status).toBe('error');
		expect(result.totalRetries).toBe(2);
	});

	test('should enforce max retries (capped at 5)', async ({ api }) => {
		const response = await api.request.post('/rest/scenario/error-handling/execute', {
			data: {
				nodes: [
					{
						name: 'MaxRetry',
						shouldFail: true,
						settings: { continueOnFail: false, retryOnFail: true, maxTries: 10, waitBetweenTries: 0 },
					},
				],
			},
		});

		const body = await response.json();
		const result = body.data ?? body;
		expect(result.nodeResults[0].attempts).toBe(5); // Capped at 5
	});

	test('should continue workflow when continueOnFail is enabled', async ({ api }) => {
		const response = await api.request.post('/rest/scenario/error-handling/execute', {
			data: {
				nodes: [
					{
						name: 'FailNode',
						shouldFail: true,
						settings: { continueOnFail: true, retryOnFail: false, maxTries: 1, waitBetweenTries: 0 },
					},
					{
						name: 'NextNode',
						shouldFail: false,
						settings: { continueOnFail: false, retryOnFail: false, maxTries: 1, waitBetweenTries: 0 },
					},
				],
			},
		});

		const body = await response.json();
		const result = body.data ?? body;
		expect(result.workflowStatus).toBe('success');
		expect(result.nodeResults).toHaveLength(2);
		expect(result.nodeResults[0].status).toBe('error');
		expect(result.nodeResults[0].data).toHaveProperty('continueOnFail', true);
		expect(result.nodeResults[1].status).toBe('success');
	});

	test('should stop workflow on error without continueOnFail', async ({ api }) => {
		const response = await api.request.post('/rest/scenario/error-handling/execute', {
			data: {
				nodes: [
					{
						name: 'FailNode',
						shouldFail: true,
						settings: { continueOnFail: false, retryOnFail: false, maxTries: 1, waitBetweenTries: 0 },
					},
					{
						name: 'Unreachable',
						shouldFail: false,
						settings: { continueOnFail: false, retryOnFail: false, maxTries: 1, waitBetweenTries: 0 },
					},
				],
			},
		});

		const body = await response.json();
		const result = body.data ?? body;
		expect(result.workflowStatus).toBe('error');
		expect(result.nodeResults).toHaveLength(1); // Second node not reached
		expect(result.nodeResults[0].error).toBeTruthy();
	});

	test('should capture error details in result', async ({ api }) => {
		const response = await api.request.get('/rest/scenario/error-handling/retry-demo');

		const body = await response.json();
		const result = body.data ?? body;
		expect(result.nodeResults[0].error).toContain('RetryNode');
		expect(result.nodeResults[0].error).toContain('failed');
	});

	test('should demo continueOnFail workflow', async ({ api }) => {
		const response = await api.request.get('/rest/scenario/error-handling/continue-demo');

		const body = await response.json();
		const result = body.data ?? body;
		expect(result.workflowStatus).toBe('success');
		expect(result.nodeResults).toHaveLength(2);
	});
});
