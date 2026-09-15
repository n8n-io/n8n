import { afterEach, describe, expect, test, vi } from 'vitest';

import { startTelemetryContractServer, type TelemetryContractServer } from './telemetry-support';
import { TelemetryRecorder } from '../../../containers/telemetry';

let server: TelemetryContractServer | undefined;

afterEach(async () => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
	if (server) await server.close();
	server = undefined;
});

async function waitForRequest(timeoutMs = 2000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (server?.requests.length === 0 && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	if (server?.requests.length === 0) throw new Error('Telemetry webhook was not called');
}

function configureTelemetryWebhook(url: string): void {
	vi.stubEnv('QA_METRICS_WEBHOOK_URL', url);
	vi.stubEnv('QA_METRICS_WEBHOOK_USER', 'telemetry-user');
	vi.stubEnv('QA_METRICS_WEBHOOK_PASSWORD', 'telemetry-password');
}

describe('container telemetry webhook contract', () => {
	test('sends a correlated startup payload to the contract server', async () => {
		server = await startTelemetryContractServer();
		configureTelemetryWebhook(server.url);
		const telemetry = new TelemetryRecorder({});

		telemetry.startStage('n8n-startup');
		telemetry.finishStage();
		telemetry.flush(true);
		await waitForRequest();

		const request = server.requests[0];
		expect(request.authorization).toBe(
			`Basic ${Buffer.from('telemetry-user:telemetry-password').toString('base64')}`,
		);
		expect(request.payload.attempt_id).toMatch(/^[0-9a-f-]{36}$/);
		expect(request.payload.stages).toEqual([
			expect.objectContaining({ name: 'n8n-startup', outcome: 'success' }),
		]);
		expect(request.payload.metrics).toContainEqual(
			expect.objectContaining({
				metric_name: 'stack-startup-stage',
				dimensions: expect.objectContaining({ attempt_id: request.payload.attempt_id }),
			}),
		);
	});

	test('delivers failure evidence when the contract server rejects a payload', async () => {
		server = await startTelemetryContractServer(500);
		configureTelemetryWebhook(server.url);
		const telemetry = new TelemetryRecorder({});

		telemetry.startStage('n8n-startup');
		await new Promise((resolve) => setTimeout(resolve, 2));
		telemetry.finishStage('failure', new Error('startup failed'));
		telemetry.flush(false, 'startup failed');
		await waitForRequest();

		const request = server.requests[0];
		expect(request.payload.success).toBe(false);
		expect(request.payload.attempt_id).toMatch(/^[0-9a-f-]{36}$/);
		expect(request.payload.stages).toContainEqual(
			expect.objectContaining({
				name: 'n8n-startup',
				outcome: 'failure',
				elapsedMs: expect.any(Number),
			}),
		);
		expect((request.payload.stages as Array<{ elapsedMs: number }>)[0].elapsedMs).toBeGreaterThan(
			0,
		);
	});

	test('rejects payloads that do not meet the telemetry contract', async () => {
		server = await startTelemetryContractServer();

		const response = await fetch(server.url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ attempt_id: 'missing-stages' }),
		});

		expect(response.status).toBe(400);
	});
});
