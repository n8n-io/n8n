import { test as base } from '@playwright/test';

const POOL = `http://127.0.0.1:${process.env.EVAL_POOL_PORT ?? '47100'}`;

async function poolAcquire(key: string): Promise<{ url: string; id: number }> {
	for (;;) {
		const res = await fetch(`${POOL}/acquire`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ key }),
		});
		const data = (await res.json()) as { url?: string; id?: number; wait?: boolean };
		if (data.url && typeof data.id === 'number') return { url: data.url, id: data.id };
		await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 600)));
	}
}

async function poolRelease(
	url: string,
	key: string,
	id: number,
	outcome: { ok: boolean; builtUrl?: string; error?: string },
): Promise<void> {
	await fetch(`${POOL}/release`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ url, key, id, ...outcome }),
	});
}

export type PoolFixtures = {
	// Acquire an instance from the shared pool keyed by `key` (the test-case slug),
	// run `fn` against that instance, and release it — even if `fn` throws.
	runOnPooledInstance: <T>(
		key: string,
		fn: (url: string) => Promise<{ result: T; builtUrl?: string }>,
	) => Promise<T>;
};

export const test = base.extend<PoolFixtures>({
	runOnPooledInstance: async ({}, use) => {
		await use(async (key, fn) => {
			const { url, id } = await poolAcquire(key);
			try {
				const { result, builtUrl } = await fn(url);
				await poolRelease(url, key, id, { ok: true, builtUrl: builtUrl ?? url });
				return result;
			} catch (e) {
				await poolRelease(url, key, id, {
					ok: false,
					builtUrl: url,
					error: e instanceof Error ? e.message : String(e),
				});
				throw e;
			}
		});
	},
});

export { expect } from '@playwright/test';
