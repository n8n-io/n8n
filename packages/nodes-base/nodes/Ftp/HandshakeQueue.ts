// SSH servers throttle bursts of concurrent handshakes per user (`MaxStartups`).
// We queue `connect()` per host:port:user:protocol so a fan-out workflow
// doesn't trip the limit. Configure via `N8N_SFTP_HANDSHAKE_CONCURRENCY`.

const DEFAULT_CONCURRENCY = 5;
const MIN_CONCURRENCY = 1;
const MAX_CONCURRENCY = 32;

function readConcurrencyFromEnv(): number {
	const raw = process.env.N8N_SFTP_HANDSHAKE_CONCURRENCY;
	if (raw === undefined || raw === '') return DEFAULT_CONCURRENCY;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) return DEFAULT_CONCURRENCY;
	const truncated = Math.trunc(parsed);
	if (truncated < MIN_CONCURRENCY || truncated > MAX_CONCURRENCY) return DEFAULT_CONCURRENCY;
	return truncated;
}

let limit = readConcurrencyFromEnv();

type Bucket = {
	active: number;
	queue: Array<() => void>;
};

const buckets = new Map<string, Bucket>();

export type HandshakeKeyParts = {
	host: string;
	port: number;
	username: string;
	protocol: 'sftp' | 'ftp';
};

/** Build an opaque key from non-secret connection coordinates. */
export function makeHandshakeKey({ host, port, username, protocol }: HandshakeKeyParts): string {
	return `${protocol}|${host.toLowerCase()}|${port}|${username}`;
}

async function acquire(key: string): Promise<void> {
	let bucket = buckets.get(key);
	if (!bucket) {
		bucket = { active: 0, queue: [] };
		buckets.set(key, bucket);
	}
	if (bucket.active < limit) {
		bucket.active++;
		return;
	}
	const target = bucket;
	await new Promise<void>((resolve) => target.queue.push(resolve));
}

function release(key: string): void {
	const bucket = buckets.get(key);
	if (!bucket) return;
	const next = bucket.queue.shift();
	if (next) {
		next();
		return;
	}
	bucket.active--;
	if (bucket.active === 0 && bucket.queue.length === 0) {
		buckets.delete(key);
	}
}

/**
 * Acquire a handshake permit for `key`, run `fn`, release on settle (resolve or reject).
 * The permit is released before any post-handshake work; only the connect step is gated.
 */
export async function withHandshakePermit<T>(key: string, fn: () => Promise<T>): Promise<T> {
	await acquire(key);
	try {
		return await fn();
	} finally {
		release(key);
	}
}

/** Test-only: clear buckets and re-read the env var. */
export function __resetHandshakeQueueForTests(): void {
	buckets.clear();
	limit = readConcurrencyFromEnv();
}
