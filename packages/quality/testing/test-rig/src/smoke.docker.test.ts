import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { hook } from './hooks/control';
import { FILES } from './hooks/spec';
import { docker, freeze, logs, signal, startAgain, waitForExit, waitForLog } from './process';
import { is, Scenario } from './scenario';
import { RigStack, stopAllStacks } from './stack';
import { chain, nodes, webhookPath } from './workflows';

const FAKE_LICENCE = 'test-rig-fake-licence';

afterEach(async () => await stopAllStacks());

describe('rig smoke', () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'test-rig-smoke-'));
		vi.stubEnv('TEST_RIG_RESULTS_FILE', join(dir, 'results.jsonl'));
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		rmSync(dir, { recursive: true, force: true });
	});

	it('pauses, releases, signals, restarts and probes a stack without leaking the licence', async () => {
		const rig = await RigStack.start({
			name: 'smoke',
			workers: 1,
			runners: 'internal',
			scale: 6,
			hooks: [
				{
					point: 'job-start',
					file: FILES.jobProcessor,
					target: 'JobProcessor.prototype',
					method: 'processJob',
					detail: { jobId: 'args.0.id', executionId: 'args.0.data.executionId' },
				},
			],
		});
		const s = new Scenario('smoke', rig, dir);
		await s.run({ errors: [] }, async () => {
			await rig.api.signIn();
			const path = webhookPath('smoke');
			const workflowId = await rig.api.createWorkflow(
				chain('smoke', [
					nodes.webhook(path),
					nodes.code('Code', 'return [{ json: { smoke: true } }];'),
				]),
			);
			const worker = rig.worker(1);
			const point = hook([worker], 'job-start');
			await point.arm();
			const hit = point.waitHit(30_000);
			expect((await rig.api.webhook(path)).status).toBe(200);
			const { detail } = await hit;
			const executionId = String(detail.executionId);
			expect(await rig.db.executionsOf(workflowId)).toEqual([executionId]);
			expect((await rig.redis.bull()).active).toContain(String(detail.jobId));
			expect(await point.release(worker)).toBeGreaterThan(0);
			expect((await rig.db.waitForExecution(executionId, 60_000)).status).toBe('success');
			expect(await rig.db.executionDataContains(executionId, 'smoke')).toBe(true);
			expect(await rig.db.statusesOf(workflowId)).toEqual({ [executionId]: 'success' });

			await freeze(worker, true);
			expect(await docker('inspect', '--format', '{{.State.Paused}}', worker.getId())).toBe('true');
			await freeze(worker, false);

			const stopping = waitForLog([worker], 'Stopping worker', 30_000);
			await signal(worker, 'SIGTERM');
			await stopping;
			expect((await waitForExit(worker, 60_000))?.exitCode).toBe(0);
			await startAgain(worker);
			expect(await docker('inspect', '--format', '{{.State.Running}}', worker.getId())).toBe(
				'true',
			);

			for (const { container } of rig.n8nContainers()) {
				const env = await docker('inspect', '--format', '{{json .Config.Env}}', container.getId());
				expect(JSON.parse(env)).toEqual(
					expect.arrayContaining(['N8N_LICENSE_CERT=', 'N8N_LICENSE_ACTIVATION_KEY=']),
				);
				expect(env).not.toContain(FAKE_LICENCE);
				expect(await logs(container)).not.toContain(FAKE_LICENCE);
			}
			expect(s.verify({ always: [['workflow ran', executionId, is(executionId)]] })).toEqual([]);
		});
		expect(readFileSync(join(dir, 'results.jsonl'), 'utf8')).not.toContain(FAKE_LICENCE);
	});
});
