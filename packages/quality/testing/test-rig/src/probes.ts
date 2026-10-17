import { sleep } from '@n8n/utils/sleep';

/** Runs one command in a container and returns its trimmed output. */
export type Exec = (command: string[]) => Promise<string>;

export const FINAL_STATUSES = ['success', 'error', 'crashed', 'canceled'] as const;
const PENDING_STATUSES = ['', 'new', 'running', 'waiting'];

export interface ExecutionState {
	status: string;
	finished: boolean;
	stalledError: boolean;
}

export const quote = (text: string) => `'${text.replace(/'/g, "''")}'`;

/** Splits `psql -tA` or `redis-cli --raw` output into non-empty lines. */
export const lines = (output: string) => output.split('\n').filter(Boolean);

/** Parses a `status|finished` row from `psql -tA`. */
export function parseStatusRow(row: string): Pick<ExecutionState, 'status' | 'finished'> {
	const [status = '', finished = ''] = row.split('|');
	return { status, finished: finished === 't' };
}

/** Parses `HGETALL` output into a record, leaving out the bulky `data` and `opts` fields. */
export function parseHash(output: string): Record<string, string> {
	const flat = output.split('\n');
	const hash: Record<string, string> = {};
	for (let i = 0; i + 1 < flat.length; i += 2) {
		if (flat[i] !== 'data' && flat[i] !== 'opts') hash[flat[i]] = flat[i + 1];
	}
	return hash;
}

/** Postgres probes over `psql` in the stack's Postgres container. */
export class PostgresProbe {
	constructor(private readonly exec: Exec) {}

	async sql(query: string): Promise<string> {
		return await this.exec(['psql', '-U', 'n8n_user', '-d', 'n8n_db', '-tAc', query]);
	}

	async execution(id: string): Promise<ExecutionState> {
		const row = await this.sql(
			`select status, finished from execution_entity where id = ${Number(id)}`,
		);
		const stalledError = await this.executionDataContains(
			id,
			'failed to be processed too many times',
		);
		return { ...parseStatusRow(row), stalledError };
	}

	async executionDataContains(id: string, text: string): Promise<boolean> {
		const pattern = quote(`%${text}%`);
		const count = await this.sql(
			`select count(*) from execution_data where "executionId" = ${Number(id)} and data like ${pattern}`,
		);
		return count !== '0';
	}

	/** Execution ids of a workflow, oldest first. */
	async executionsOf(workflowId: string): Promise<string[]> {
		return lines(
			await this.sql(
				`select id from execution_entity where "workflowId" = ${quote(workflowId)} order by id`,
			),
		);
	}

	/** Status of every execution of a workflow, by id. */
	async statusesOf(workflowId: string): Promise<Record<string, string>> {
		const rows = lines(
			await this.sql(
				`select id, status from execution_entity where "workflowId" = ${quote(workflowId)} order by id`,
			),
		);
		return Object.fromEntries(rows.map((row) => row.split('|') as [string, string]));
	}

	/** Waits until the execution leaves new, running and waiting, or the timeout passes. */
	async waitForExecution(id: string, timeoutMs: number) {
		return await this.waitForStatus(id, (s) => !PENDING_STATUSES.includes(s), timeoutMs);
	}

	async waitForStatus(id: string, done: (status: string) => boolean, timeoutMs: number) {
		const deadline = Date.now() + timeoutMs;
		for (;;) {
			const execution = await this.execution(id);
			if (done(execution.status) || Date.now() > deadline) return execution;
			await sleep(250);
		}
	}
}

export interface BullState {
	wait: string[];
	active: string[];
	failed: string[];
	job?: Record<string, string | boolean>;
}

/** Redis probes over `redis-cli` in the stack's Redis container. */
export class RedisProbe {
	constructor(private readonly exec: Exec) {}

	async redis(...args: string[]): Promise<string> {
		return await this.exec(['redis-cli', '--raw', ...args]);
	}

	/** Bull state of the default queue, and of one job when given. */
	async bull(jobId?: string): Promise<BullState> {
		const list = async (...args: string[]) => lines(await this.redis(...args));
		const state: BullState = {
			wait: await list('LRANGE', 'bull:jobs:wait', '0', '-1'),
			active: await list('LRANGE', 'bull:jobs:active', '0', '-1'),
			failed: await list('ZRANGE', 'bull:jobs:failed', '0', '-1'),
		};
		if (jobId) state.job = await this.bullJob(jobId);
		return state;
	}

	/** Bull job hash plus whether the job key and its lock exist. */
	async bullJob(jobId: string): Promise<Record<string, string | boolean>> {
		const key = `bull:jobs:${jobId}`;
		return {
			...parseHash(await this.redis('HGETALL', key)),
			exists: (await this.redis('EXISTS', key)) === '1',
			lock: (await this.redis('EXISTS', `${key}:lock`)) === '1',
		};
	}

	/** Host id of the current multi-main leader, or undefined when the key is vacant. */
	async leader(): Promise<string | undefined> {
		return (await this.redis('GET', 'n8n:main_instance_leader')) || undefined;
	}
}
