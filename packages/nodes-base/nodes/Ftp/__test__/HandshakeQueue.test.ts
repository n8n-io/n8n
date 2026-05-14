import {
	__resetHandshakeQueueForTests,
	DEFAULT_MAX_CONCURRENT_HANDSHAKES,
	makeHandshakeKey,
	MAX_MAX_CONCURRENT_HANDSHAKES,
	MIN_MAX_CONCURRENT_HANDSHAKES,
	resolveHandshakeLimit,
	withHandshakePermit,
} from '../HandshakeQueue';

type Gate = {
	promise: Promise<undefined>;
	resolve: () => void;
};

function gate(): Gate {
	let resolveFn!: (value: undefined) => void;
	const promise = new Promise<undefined>((res) => {
		resolveFn = res;
	});
	return {
		promise,
		resolve: () => resolveFn(undefined),
	};
}

async function flushMicrotasks(): Promise<void> {
	await new Promise((resolve) => setImmediate(resolve));
}

async function measurePeak(
	key: string,
	limit: number,
	gateCount: number,
): Promise<{ peakActive: number; peakConcurrent: number }> {
	let active = 0;
	let peakConcurrent = 0;
	const gates = Array.from({ length: gateCount }, () => gate());

	const runs = gates.map(
		async (g) =>
			await withHandshakePermit(key, limit, async () => {
				active++;
				peakConcurrent = Math.max(peakConcurrent, active);
				await g.promise;
				active--;
			}),
	);

	await flushMicrotasks();
	const peakActive = active;

	gates.forEach((g) => g.resolve());
	await Promise.all(runs);

	return { peakActive, peakConcurrent };
}

describe('HandshakeQueue', () => {
	afterEach(() => {
		__resetHandshakeQueueForTests();
	});

	describe('makeHandshakeKey', () => {
		it('omits secrets and is built from non-secret coordinates', () => {
			const key = makeHandshakeKey({
				host: 'sftp.example.com',
				port: 22,
				protocol: 'sftp',
			});

			expect(key).toBe('sftp|sftp.example.com|22');
			expect(key).not.toContain('password');
			expect(key).not.toContain('privateKey');
			expect(key).not.toContain('passphrase');
		});

		it('lowercases host so case differences collide', () => {
			const a = makeHandshakeKey({ host: 'Example.com', port: 22, protocol: 'sftp' });
			const b = makeHandshakeKey({ host: 'example.com', port: 22, protocol: 'sftp' });
			expect(a).toBe(b);
		});

		it('shares a bucket across users on the same server (matches MaxStartups scope)', () => {
			// Username intentionally has no effect — server-side throttle is per source, not per user.
			const a = makeHandshakeKey({ host: 'example.com', port: 22, protocol: 'sftp' });
			const b = makeHandshakeKey({ host: 'example.com', port: 22, protocol: 'sftp' });
			expect(a).toBe(b);
		});

		it('separates buckets by port', () => {
			const a = makeHandshakeKey({ host: 'example.com', port: 22, protocol: 'sftp' });
			const b = makeHandshakeKey({ host: 'example.com', port: 2222, protocol: 'sftp' });
			expect(a).not.toBe(b);
		});

		it('separates buckets by protocol', () => {
			const a = makeHandshakeKey({ host: 'example.com', port: 21, protocol: 'ftp' });
			const b = makeHandshakeKey({ host: 'example.com', port: 21, protocol: 'sftp' });
			expect(a).not.toBe(b);
		});
	});

	describe('resolveHandshakeLimit', () => {
		it('returns the value when within range', () => {
			expect(resolveHandshakeLimit(3)).toBe(3);
			expect(resolveHandshakeLimit(1)).toBe(MIN_MAX_CONCURRENT_HANDSHAKES);
			expect(resolveHandshakeLimit(32)).toBe(MAX_MAX_CONCURRENT_HANDSHAKES);
		});

		it('clamps values below the minimum', () => {
			expect(resolveHandshakeLimit(0)).toBe(MIN_MAX_CONCURRENT_HANDSHAKES);
			expect(resolveHandshakeLimit(-5)).toBe(MIN_MAX_CONCURRENT_HANDSHAKES);
		});

		it('clamps values above the maximum', () => {
			expect(resolveHandshakeLimit(99)).toBe(MAX_MAX_CONCURRENT_HANDSHAKES);
		});

		it('truncates non-integer values', () => {
			expect(resolveHandshakeLimit(3.9)).toBe(3);
		});

		it.each([undefined, null, 'abc', NaN, Number.POSITIVE_INFINITY])(
			'falls back to the default for invalid value %p',
			(value) => {
				expect(resolveHandshakeLimit(value)).toBe(DEFAULT_MAX_CONCURRENT_HANDSHAKES);
			},
		);
	});

	describe('withHandshakePermit', () => {
		it('releases the permit when fn resolves', async () => {
			await withHandshakePermit('key-a', 1, async () => 'first');
			const result = await withHandshakePermit('key-a', 1, async () => 'second');
			expect(result).toBe('second');
		});

		it('releases the permit when fn rejects', async () => {
			await expect(
				withHandshakePermit('key-a', 1, async () => {
					throw new Error('boom');
				}),
			).rejects.toThrow('boom');

			// If the permit leaked, this would hang.
			const result = await withHandshakePermit('key-a', 1, async () => 'ok');
			expect(result).toBe('ok');
		});

		it('caps concurrency per key at the supplied limit', async () => {
			const { peakActive, peakConcurrent } = await measurePeak('key-a', 2, 5);
			expect(peakActive).toBe(2);
			expect(peakConcurrent).toBe(2);
		});

		it('isolates buckets across keys', async () => {
			const slow = gate();
			const aRun = withHandshakePermit('key-a', 1, async () => {
				await slow.promise;
			});

			// key-b must not be blocked by key-a's holder.
			const bResult = await withHandshakePermit('key-b', 1, async () => 'b-done');
			expect(bResult).toBe('b-done');

			slow.resolve();
			await aRun;
		});

		it('honours a changed limit on subsequent calls (credential edited mid-flight)', async () => {
			// Customer edits the credential's maxConcurrentHandshakes from 2 down to 1.
			// The next workflow execution should see the new cap apply on its own acquires.
			const firstRun = await measurePeak('key-a', 2, 4);
			expect(firstRun.peakActive).toBe(2);

			const secondRun = await measurePeak('key-a', 1, 4);
			expect(secondRun.peakActive).toBe(1);
		});

		it('uses the default when the credential value is missing', async () => {
			const limit = resolveHandshakeLimit(undefined);
			const { peakActive } = await measurePeak('key-a', limit, 6);
			expect(peakActive).toBe(DEFAULT_MAX_CONCURRENT_HANDSHAKES);
		});

		it('uses the clamped value when the credential value is out of range', async () => {
			const limit = resolveHandshakeLimit(0);
			const { peakActive } = await measurePeak('key-a', limit, 3);
			expect(peakActive).toBe(MIN_MAX_CONCURRENT_HANDSHAKES);
		});
	});
});
