import { sleep } from '@n8n/utils/sleep';
import { nanoid } from 'nanoid';

import type { RunRecord } from './invariants';
import { FINAL_STATUSES, lines, quote } from './probes';
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

	private readonly inFlight = new Map<Promise<void>, () => void>();

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
		const { result, abort } = this.rig.api.webhookInBackground(this.path, { requestId });
		const done = result.then(({ status, ms }) => {
			this.requests.push({ requestId, sentAt, status, ms });
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
			await this.rig.db.sql(`select request_id, execution_id from ${TABLE} order by at`),
		).map((row) => {
			const [requestId, executionId] = row.split('|');
			return { requestId, executionId };
		});
	}

	async executions(): Promise<Record<string, string>> {
		return await this.rig.db.statusesOf(this.workflowId);
	}

	async executionsByRequest(requestIds: string[]): Promise<Record<string, string[]>> {
		const byRequest: Record<string, string[]> = {};
		if (requestIds.length === 0) return byRequest;
		const rows = lines(
			await this.rig.db.sql(
				`select r.id, d."executionId" from unnest(array[${requestIds.map(quote).join(',')}]) as r(id) join execution_data d on strpos(d.data, '"' || r.id || '"') > 0 join execution_entity e on e.id = d."executionId" where e."workflowId" = ${quote(this.workflowId)} order by d."executionId"`,
			),
		);
		for (const row of rows) {
			const [requestId, executionId] = row.split('|');
			(byRequest[requestId] ??= []).push(executionId);
		}
		return byRequest;
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
				const effects = await this.effects();
				const done = new Set(effects.map((e) => e.requestId));
				const lost = requests
					.filter((r) => r.status === 200 && !done.has(r.requestId))
					.map((r) => r.requestId);
				return {
					requests,
					executions,
					effects,
					executionsByRequest: await this.executionsByRequest(lost),
					bull: { wait, active },
				};
			}
			await sleep(500);
		}
	}
}
