import { afterEach, describe, expect, test, vi } from 'vitest';

import { TelemetryRecorder } from '../../../containers/telemetry';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('TelemetryRecorder', () => {
	test('correlates stages and keeps failed elapsed time', async () => {
		vi.stubEnv('CONTAINER_TELEMETRY_VERBOSE', '1');
		vi.stubEnv('N8N_TEST_PROFILE', 'sqlite');
		vi.stubEnv('TEST_SHARD', '3');
		vi.stubEnv('TEST_WORKER_INDEX', '2');
		vi.stubEnv('N8N_TEST_RESTART_REASON', 'unexpected-value');
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const telemetry = new TelemetryRecorder({});

		telemetry.startStage('network');
		telemetry.finishStage();
		telemetry.startStage('n8n-startup');
		await new Promise((resolve) => setTimeout(resolve, 2));
		telemetry.finishStage('failure', new Error('readiness failed after 25ms'));
		telemetry.flush(false, 'n8n startup failed');

		const output = log.mock.calls[0][0];
		expect(typeof output).toBe('string');
		let record: {
			attemptId: string;
			correlation: { profile: string; shard: string; worker: string; restartReason: string };
			stages: Array<{ name: string; elapsedMs: number; outcome: string }>;
			failurePhase: string;
		};
		try {
			record = JSON.parse(output as string) as typeof record;
		} catch {
			throw new Error('Telemetry output was not valid JSON');
		}
		expect(record.attemptId).toMatch(/^[0-9a-f-]{36}$/);
		expect(record.correlation).toMatchObject({
			profile: 'sqlite',
			shard: '3',
			worker: '2',
			restartReason: 'unknown',
		});
		expect(record.stages).toEqual([
			expect.objectContaining({ name: 'network', outcome: 'success' }),
			expect.objectContaining({
				name: 'n8n-startup',
				outcome: 'failure',
				elapsedMs: expect.any(Number),
			}),
		]);
		expect(record.stages[1].elapsedMs).toBeGreaterThan(0);
		expect(record.failurePhase).toBe('n8n-startup');
	});

	test('redacts secrets from failure evidence', () => {
		vi.stubEnv('CONTAINER_TELEMETRY_VERBOSE', '1');
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const telemetry = new TelemetryRecorder({});

		telemetry.startStage('service:proxy');
		telemetry.finishStage(
			'failure',
			new Error('https://user:password@example.test?token=secret-value'),
		);
		telemetry.flush(false, 'Authorization: Bearer secret-token');

		const output = log.mock.calls[0][0] as string;
		expect(output).not.toContain('password');
		expect(output).not.toContain('secret-value');
		expect(output).not.toContain('secret-token');
		expect(output).toContain('[REDACTED]');
	});

	test('redacts credential-shaped values from failure evidence', () => {
		vi.stubEnv('CONTAINER_TELEMETRY_VERBOSE', '1');
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const telemetry = new TelemetryRecorder({});
		const credentials = [
			['AKIA', '1234567890ABCDEF'].join(''),
			['ghp_', 'abcdefghijklmnopqrstuvwxyz123456'].join(''),
			['xoxb-', '1234567890-abcdefghijklmnop'].join(''),
			['sk-proj-', 'abcdefghijklmnopqrstuvwxyz123456'].join(''),
		];

		telemetry.startStage('n8n-startup');
		telemetry.finishStage('failure', new Error(credentials.join(' ')));
		telemetry.flush(false, credentials.join(' '));

		const output = log.mock.calls[0][0] as string;
		for (const credential of credentials) expect(output).not.toContain(credential);
	});

	test('marks aborted stages as cancelled', async () => {
		vi.stubEnv('CONTAINER_TELEMETRY_VERBOSE', '1');
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const telemetry = new TelemetryRecorder({});
		const error = new Error('startup aborted');
		error.name = 'AbortError';

		telemetry.startStage('service:postgres');
		await new Promise((resolve) => setTimeout(resolve, 2));
		telemetry.finishStage('failure', error);
		telemetry.flush(false, error.message);

		const output = log.mock.calls[0][0] as string;
		expect(output).toContain('"outcome": "cancelled"');
	});
});
