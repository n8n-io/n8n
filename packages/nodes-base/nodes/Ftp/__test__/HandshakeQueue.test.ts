import {
	__resetHandshakeQueueForTests,
	makeHandshakeKey,
	withHandshakePermit,
} from '../HandshakeQueue';

const ENV_KEY = 'N8N_SFTP_HANDSHAKE_CONCURRENCY';

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

describe('HandshakeQueue', () => {
	const originalEnv = process.env[ENV_KEY];

	afterEach(() => {
		if (originalEnv === undefined) delete process.env[ENV_KEY];
		else process.env[ENV_KEY] = originalEnv;
		__resetHandshakeQueueForTests();
	});

	describe('makeHandshakeKey', () => {
		it('omits secrets and is built from non-secret coordinates', () => {
			const key = makeHandshakeKey({
				host: 'sftp.example.com',
				port: 22,
				username: 'alice',
				protocol: 'sftp',
			});

			expect(key).toBe('sftp|sftp.example.com|22|alice');
			expect(key).not.toContain('password');
			expect(key).not.toContain('privateKey');
			expect(key).not.toContain('passphrase');
		});

		it('lowercases host so case differences collide', () => {
			const a = makeHandshakeKey({
				host: 'Example.com',
				port: 22,
				username: 'alice',
				protocol: 'sftp',
			});
			const b = makeHandshakeKey({
				host: 'example.com',
				port: 22,
				username: 'alice',
				protocol: 'sftp',
			});
			expect(a).toBe(b);
		});

		it('preserves username case', () => {
			const a = makeHandshakeKey({
				host: 'example.com',
				port: 22,
				username: 'Alice',
				protocol: 'sftp',
			});
			const b = makeHandshakeKey({
				host: 'example.com',
				port: 22,
				username: 'alice',
				protocol: 'sftp',
			});
			expect(a).not.toBe(b);
		});
	});

	describe('withHandshakePermit', () => {
		it('releases the permit when fn resolves', async () => {
			process.env[ENV_KEY] = '1';
			__resetHandshakeQueueForTests();

			await withHandshakePermit('key-a', async () => 'first');
			const result = await withHandshakePermit('key-a', async () => 'second');

			expect(result).toBe('second');
		});

		it('releases the permit when fn rejects', async () => {
			process.env[ENV_KEY] = '1';
			__resetHandshakeQueueForTests();

			await expect(
				withHandshakePermit('key-a', async () => {
					throw new Error('boom');
				}),
			).rejects.toThrow('boom');

			// If the permit leaked, this would hang.
			const result = await withHandshakePermit('key-a', async () => 'ok');
			expect(result).toBe('ok');
		});

		it('caps concurrency per key', async () => {
			process.env[ENV_KEY] = '2';
			__resetHandshakeQueueForTests();

			let active = 0;
			let peak = 0;
			const gates = [gate(), gate(), gate(), gate(), gate()];

			const runs = gates.map(
				async (g) =>
					await withHandshakePermit('key-a', async () => {
						active++;
						peak = Math.max(peak, active);
						await g.promise;
						active--;
					}),
			);

			await flushMicrotasks();
			expect(active).toBe(2);

			gates[0].resolve();
			gates[1].resolve();
			await flushMicrotasks();
			expect(active).toBe(2);

			gates[2].resolve();
			gates[3].resolve();
			gates[4].resolve();
			await Promise.all(runs);

			expect(peak).toBe(2);
		});

		it('isolates buckets across keys', async () => {
			process.env[ENV_KEY] = '1';
			__resetHandshakeQueueForTests();

			const slow = gate();
			const aRun = withHandshakePermit('key-a', async () => {
				await slow.promise;
			});

			// key-b must not be blocked by key-a's holder.
			const bResult = await withHandshakePermit('key-b', async () => 'b-done');
			expect(bResult).toBe('b-done');

			slow.resolve();
			await aRun;
		});
	});

	describe('env var parsing', () => {
		async function measurePeak(gateCount: number): Promise<{ active: number; peak: number }> {
			let active = 0;
			let peak = 0;
			const gates = Array.from({ length: gateCount }, () => gate());

			const runs = gates.map(
				async (g) =>
					await withHandshakePermit('key-a', async () => {
						active++;
						peak = Math.max(peak, active);
						await g.promise;
						active--;
					}),
			);

			await flushMicrotasks();
			const observedActive = active;

			gates.forEach((g) => g.resolve());
			await Promise.all(runs);

			return { active: observedActive, peak };
		}

		it('falls back to default 5 when unset', async () => {
			delete process.env[ENV_KEY];
			__resetHandshakeQueueForTests();

			const { active, peak } = await measurePeak(6);
			expect(active).toBe(5);
			expect(peak).toBe(5);
		});

		it.each(['0', '33', '-1', 'abc', ''])(
			'falls back to default 5 for invalid value %p',
			async (value) => {
				if (value === '') delete process.env[ENV_KEY];
				else process.env[ENV_KEY] = value;
				__resetHandshakeQueueForTests();

				const { active } = await measurePeak(6);
				expect(active).toBe(5);
			},
		);

		it('honours valid in-range values', async () => {
			process.env[ENV_KEY] = '3';
			__resetHandshakeQueueForTests();

			const { active, peak } = await measurePeak(5);
			expect(active).toBe(3);
			expect(peak).toBe(3);
		});
	});
});
