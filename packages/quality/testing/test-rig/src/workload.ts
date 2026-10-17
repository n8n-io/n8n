import { sleep } from '@n8n/utils/sleep';
import { nanoid } from 'nanoid';

import type { RunRecord } from './invariants';
import { FINAL_STATUSES, lines } from './probes';
import type { RigStack } from './stack';
import { chain, nodes, webhookPath } from './workflows';

export interface WorkloadRequest {
	requestId: string;
	sentAt: number;
	status: number;
	ms: number;
}

export interface Effect {
	requestId: string;
	executionId: string;
}

const TABLE = 'test_rig_effects';

/**
 * Steady webhook traffic against one workflow that writes a row per run, so
 * invariants can tell lost, stuck and repeated work apart.
 */
export class Workload {
	private readonly requests: WorkloadRequest[] = [];

	private readonly inFlight = new Set<Promise<void>>();

	private timer?: NodeJS.Timeout;

	private constructor(
		private readonly rig: Pick<RigStack, 'api' | 'db' | 'redis'>,
		readonly workflowId: string,
		readonly path: string,
	) {}

	/** Creates the effects table, a Postgres credential and the workload workflow. */
	static async setup(rig: Pick<RigStack, 'api' | 'db' | 'redis'>): Promise<Workload> {
		await rig.db.sql(
			`create table if not exists ${TABLE} (request_id text not null, execution_id text not null, at timestamptz not null default now())`,
		);
		const credentialId = await rig.api.createCredential('test-rig postgres', 'postgres', {
			host: 'postgres',
			database: 'n8n_db',
			user: 'n8n_user',
			password: 'test_password',
			port: 5432,
			ssl: 'disable',
		});
		const path = webhookPath('workload');
		const record = nodes.postgresQuery(
			'Record Effect',
			`insert into ${TABLE} (execution_id, request_id) values ($1, $2)`,
			'={{ [$execution.id, $json.body.requestId] }}',
			{ id: credentialId, name: 'test-rig postgres' },
		);
		const workflowId = await rig.api.createWorkflow(
			chain('workload', [nodes.webhook(path), record]),
		);
		await rig.api.waitForWebhook(path);
		return new Workload(rig, workflowId, path);
	}

	private fire() {
		const requestId = nanoid(10);
		const sentAt = Date.now();
		const { result } = this.rig.api.webhookInBackground(this.path, { requestId });
		const done = result.then(({ status, ms }) => {
			this.requests.push({ requestId, sentAt, status, ms });
			this.inFlight.delete(done);
		});
		this.inFlight.add(done);
	}

	/** Sends `perSecond` requests a second until stopped. */
	start(perSecond: number) {
		if (this.timer) throw new Error('workload already running');
		this.timer = setInterval(() => this.fire(), Math.max(1, Math.round(1000 / perSecond)));
	}

	/** Stops sending, waits for the requests in flight and returns every request. */
	async stop(): Promise<WorkloadRequest[]> {
		clearInterval(this.timer);
		this.timer = undefined;
		await Promise.all(this.inFlight);
		return [...this.requests].sort((a, b) => a.sentAt - b.sentAt);
	}

	async effects(): Promise<Effect[]> {
		return lines(
			await this.rig.db.sql(`select request_id, execution_id from ${TABLE} order by at`),
		).map((row) => {
			const [requestId, executionId] = row.split('|');
			return { requestId, executionId };
		});
	}

	async executions(): Promise<Record<string, string>> {
		return await this.rig.db.statusesOf(this.workflowId);
	}

	/** Waits until every execution is final and the queue is empty, or the timeout passes, then reads the run. */
	async record(requests: WorkloadRequest[], settleTimeoutMs: number): Promise<RunRecord> {
		const deadline = Date.now() + settleTimeoutMs;
		for (;;) {
			const executions = await this.executions();
			const { wait, active } = await this.rig.redis.bull();
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
