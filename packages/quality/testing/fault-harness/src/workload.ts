import { sleep } from '@n8n/utils/sleep';
import { nanoid } from 'nanoid';

import type { RunRecord } from './invariants';
import { FINAL_STATUSES, lines } from './probes';
import type { HarnessStack } from './stack';
import { chain, nodes, webhookPath } from './workflows';

export interface WorkloadRequest {
	requestId: string;
	sentAt: number;
	status: number;
	ms: number;
	executionId?: string;
}

export interface Effect {
	requestId: string;
	executionId: string;
}

const TABLE = 'fault_harness_effects';

/**
 * Steady webhook traffic against one workflow that writes a row per run, so
 * invariants can tell lost, stuck and repeated work apart.
 */
export class Workload {
	private readonly requests: WorkloadRequest[] = [];

	private readonly inFlight = new Map<Promise<void>, () => void>();

	private timer?: NodeJS.Timeout;

	private constructor(
		private readonly harness: Pick<HarnessStack, 'api' | 'db' | 'redis'>,
		readonly workflowId: string,
		readonly path: string,
	) {}

	/** Creates the effects table, a Postgres credential and the workload workflow. */
	static async setup(harness: Pick<HarnessStack, 'api' | 'db' | 'redis'>): Promise<Workload> {
		await harness.db.sql(
			`create table if not exists ${TABLE} (request_id text not null, execution_id text not null, at timestamptz not null default now())`,
		);
		const credentialId = await harness.api.createCredential('fault-harness postgres', 'postgres', {
			host: 'postgres',
			database: 'n8n_db',
			user: 'n8n_user',
			password: 'test_password',
			port: 5432,
			ssl: 'disable',
		});
		const path = webhookPath('workload');
		const webhook = nodes.webhook(path);
		webhook.parameters.options = { responseData: '={{ $execution.id }}' };
		const record = nodes.postgresQuery(
			'Record Effect',
			`insert into ${TABLE} (execution_id, request_id) values ($1, $2)`,
			'={{ [$execution.id, $json.body.requestId] }}',
			{ id: credentialId, name: 'fault-harness postgres' },
		);
		const workflowId = await harness.api.createWorkflow(chain('workload', [webhook, record]));
		await harness.api.waitForWebhook(path);
		return new Workload(harness, workflowId, path);
	}

	private fire() {
		const requestId = nanoid(10);
		const sentAt = Date.now();
		const { result, abort } = this.harness.api.webhookInBackground(this.path, { requestId });
		const done = result.then(({ status, body, ms }) => {
			const executionId = status === 200 && body ? body : undefined;
			this.requests.push({ requestId, sentAt, status, ms, executionId });
			this.inFlight.delete(done);
		});
		this.inFlight.set(done, abort);
	}

	get completed(): number {
		return this.requests.length;
	}

	/** Sends `perSecond` requests a second until stopped. */
	start(perSecond: number) {
		if (this.timer) throw new Error('workload already running');
		this.timer = setInterval(() => this.fire(), Math.max(1, Math.round(1000 / perSecond)));
	}

	async stop(timeoutMs = 30_000): Promise<WorkloadRequest[]> {
		clearInterval(this.timer);
		this.timer = undefined;
		const aborter = setTimeout(() => {
			for (const abort of this.inFlight.values()) abort();
		}, timeoutMs);
		await Promise.all(this.inFlight.keys());
		clearTimeout(aborter);
		return [...this.requests].sort((a, b) => a.sentAt - b.sentAt);
	}

	async effects(): Promise<Effect[]> {
		return lines(
			await this.harness.db.sql(`select request_id, execution_id from ${TABLE} order by at`),
		).map((row) => {
			const [requestId, executionId] = row.split('|');
			return { requestId, executionId };
		});
	}

	async executions(): Promise<Record<string, string>> {
		return await this.harness.db.statusesOf(this.workflowId);
	}

	/** Waits until every execution is final and the queue is empty, or the timeout passes, then reads the run. */
	async record(requests: WorkloadRequest[], settleTimeoutMs: number): Promise<RunRecord> {
		const deadline = Date.now() + settleTimeoutMs;
		for (;;) {
			const executions = await this.executions();
			const { wait, active } = await this.harness.redis.bull();
			const settled =
				wait.length === 0 &&
				active.length === 0 &&
				Object.values(executions).every((status) =>
					(FINAL_STATUSES as readonly string[]).includes(status),
				);
			if (settled || Date.now() > deadline) {
				return { requests, executions, effects: await this.effects(), bull: { wait, active } };
			}
			await sleep(500);
		}
	}
}
