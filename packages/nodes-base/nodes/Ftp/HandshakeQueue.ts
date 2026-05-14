// SSH/FTP servers throttle bursts of concurrent handshakes per source
// (`MaxStartups` on OpenSSH). We queue `connect()` per host:port:protocol so a
// fan-out workflow doesn't trip the limit. The cap comes from the credential.

export const DEFAULT_MAX_CONCURRENT_HANDSHAKES = 5;
export const MIN_MAX_CONCURRENT_HANDSHAKES = 1;
export const MAX_MAX_CONCURRENT_HANDSHAKES = 32;

type Bucket = {
	active: number;
	queue: Array<() => void>;
};

const buckets = new Map<string, Bucket>();

export type HandshakeKeyParts = {
	host: string;
	port: number;
	protocol: 'sftp' | 'ftp';
};

/** Build an opaque key from non-secret connection coordinates.
 * Username is intentionally omitted so all credentials targeting one server
 * share a bucket, matching server-side `MaxStartups` scope. */
export function makeHandshakeKey({ host, port, protocol }: HandshakeKeyParts): string {
	return `${protocol}|${host.toLowerCase()}|${port}`;
}

/** Clamp a credential-supplied value to the supported range. */
export function resolveHandshakeLimit(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return DEFAULT_MAX_CONCURRENT_HANDSHAKES;
	}
	const truncated = Math.trunc(value);
	if (truncated < MIN_MAX_CONCURRENT_HANDSHAKES) return MIN_MAX_CONCURRENT_HANDSHAKES;
	if (truncated > MAX_MAX_CONCURRENT_HANDSHAKES) return MAX_MAX_CONCURRENT_HANDSHAKES;
	return truncated;
}

async function acquire(key: string, limit: number): Promise<void> {
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
export async function withHandshakePermit<T>(
	key: string,
	limit: number,
	fn: () => Promise<T>,
): Promise<T> {
	await acquire(key, limit);
	try {
		return await fn();
	} finally {
		release(key);
	}
}

/** Test-only: clear all buckets. */
export function __resetHandshakeQueueForTests(): void {
	buckets.clear();
}
