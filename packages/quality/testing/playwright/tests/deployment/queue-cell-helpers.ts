import type { N8NStack } from 'n8n-containers/stack';

type StackContainer = N8NStack['containers'][number];

/**
 * Streams logs from `container` until every string in `expectedSubstrings`
 * appears or `timeoutMs` elapses.
 */
export async function readContainerLogsUntil(
	container: StackContainer,
	expectedSubstrings: readonly string[],
	timeoutMs = 10_000,
): Promise<string> {
	const stream = await container.logs();
	let logs = '';
	await new Promise<void>((resolve, reject) => {
		let settled = false;
		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			stream.destroy();
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		};
		const timer = setTimeout(() => {
			finish();
		}, timeoutMs);
		stream.on('data', (chunk: Buffer | string) => {
			logs += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
			if (expectedSubstrings.every((substring) => logs.includes(substring))) {
				finish();
			}
		});
		stream.on('end', () => {
			finish();
		});
		stream.on('error', (error: Error) => {
			finish(error);
		});
	});
	return logs;
}

/**
 * Reads buffered logs from a running container and stops after `idleMs` of
 * silence or `maxWaitMs` total elapsed time.
 */
export async function readContainerLogsSnapshot(
	container: StackContainer,
	idleMs = 300,
	maxWaitMs = 2_000,
): Promise<string> {
	const stream = await container.logs();
	let logs = '';
	await new Promise<void>((resolve, reject) => {
		let settled = false;
		let idleTimer: ReturnType<typeof setTimeout> | undefined;
		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			clearTimeout(maxTimer);
			if (idleTimer !== undefined) {
				clearTimeout(idleTimer);
			}
			stream.destroy();
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		};
		const resetIdle = () => {
			if (idleTimer !== undefined) {
				clearTimeout(idleTimer);
			}
			idleTimer = setTimeout(() => {
				finish();
			}, idleMs);
		};
		const maxTimer = setTimeout(() => {
			finish();
		}, maxWaitMs);
		resetIdle();
		stream.on('data', (chunk: Buffer | string) => {
			logs += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
			resetIdle();
		});
		stream.on('end', () => {
			finish();
		});
		stream.on('error', (error: Error) => {
			finish(error);
		});
	});
	return logs;
}

/**
 * Reads the Bull monotonic job counter (`bull:jobs:id`) from the stack Redis
 * container. Returns `null` when the stack has no Redis container.
 */
export async function readBullJobCounter(stack: N8NStack): Promise<number | null> {
	const redis = stack.serviceResults.redis?.container;
	if (!redis) {
		return null;
	}
	const result = await redis.exec(['redis-cli', '--raw', 'GET', 'bull:jobs:id']);
	if (result.exitCode !== 0) {
		throw new Error(`redis-cli GET bull:jobs:id failed (${result.exitCode}): ${result.output}`);
	}
	const raw = result.output.trim();
	if (raw === '') {
		return 0;
	}
	if (!/^\d+$/.test(raw)) {
		throw new Error(`Unexpected Redis bull:jobs:id value: "${raw}"`);
	}
	return Number.parseInt(raw, 10);
}

export type RedisEngine = 'redis' | 'valkey';

export interface RedisServerInfo {
	engine: RedisEngine;
	version: string;
	majorVersion: number;
	fields: Record<string, string>;
}

/**
 * Parses `INFO server` output from Redis or Valkey and distinguishes the
 * engine. Valkey retains a compatibility `redis_version` line alongside
 * `server_name:valkey` and `valkey_version`, so Valkey markers take precedence.
 */
export function parseRedisServerInfo(rawInfo: string): RedisServerInfo {
	const fields: Record<string, string> = {};
	for (const rawLine of rawInfo.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const separator = line.indexOf(':');
		if (separator <= 0) continue;
		const key = line.slice(0, separator).trim();
		const value = line.slice(separator + 1).trim();
		fields[key] = value;
	}

	const serverName = fields.server_name?.toLowerCase();
	const valkeyVersion = fields.valkey_version;
	const redisVersion = fields.redis_version;

	let engine: RedisEngine;
	let version: string;

	if (serverName === 'valkey' || valkeyVersion) {
		engine = 'valkey';
		version = valkeyVersion ?? '';
		if (!version) {
			throw new Error(
				`INFO server reported Valkey without valkey_version: ${rawInfo.slice(0, 400)}`,
			);
		}
	} else if (serverName && serverName !== 'redis') {
		throw new Error(`Unexpected INFO server server_name: "${fields.server_name}"`);
	} else if (redisVersion) {
		engine = 'redis';
		version = redisVersion;
	} else {
		throw new Error(
			`INFO server output missing redis_version and valkey_version: ${rawInfo.slice(0, 400)}`,
		);
	}

	const majorMatch = /^(\d+)\./.exec(version);
	if (!majorMatch) {
		throw new Error(`Unable to parse major version from ${engine} version "${version}"`);
	}

	return {
		engine,
		version,
		majorVersion: Number.parseInt(majorMatch[1], 10),
		fields,
	};
}

/** Runs `INFO server` on the stack Redis/Valkey container and returns its parsed server identity. */
export async function readRedisServerInfo(stack: N8NStack): Promise<RedisServerInfo> {
	const redis = stack.serviceResults.redis?.container;
	if (!redis) {
		throw new Error('Expected a Redis/Valkey container in the stack');
	}
	const result = await redis.exec(['redis-cli', '--raw', 'INFO', 'server']);
	if (result.exitCode !== 0) {
		throw new Error(`redis-cli INFO server failed (${result.exitCode}): ${result.output}`);
	}
	return parseRedisServerInfo(result.stdout || result.output);
}
