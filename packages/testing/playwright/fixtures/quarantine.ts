import type { Fixtures, TestInfo } from '@playwright/test';

const QUARANTINE_WEBHOOK_URL = 'https://internal.users.n8n.cloud/webhook/quarantine-list';
const FETCH_TIMEOUT_MS = 2000;

type QuarantineResponse = { quarantined?: string[] };

async function fetchQuarantineList(): Promise<Set<string>> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(QUARANTINE_WEBHOOK_URL, { signal: controller.signal });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const parsed = (await res.json()) as QuarantineResponse;
		const titles = parsed.quarantined ?? [];
		console.log(`🔒 Loaded ${titles.length} quarantined test titles from quarantine webhook`);
		return new Set(titles);
	} catch (fetchError) {
		console.warn(
			`⚠️  Quarantine list unavailable (${(fetchError as Error).message}) — quarantined tests will run this session`,
		);
		return new Set();
	} finally {
		clearTimeout(timer);
	}
}

// Currents stores titles as the concatenated describe + test path joined by " > ".
// Playwright's titlePath includes the project name and file path at the head, so
// try each suffix of the titlePath against the quarantine set.
function isQuarantined(testInfo: TestInfo, list: Set<string>): boolean {
	if (list.size === 0) return false;
	const path = testInfo.titlePath;
	for (let i = 0; i < path.length; i++) {
		const candidate = path.slice(i).join(' > ');
		if (list.has(candidate)) return true;
	}
	return false;
}

export type QuarantineTestFixtures = {
	quarantineCheck: undefined;
};

export type QuarantineWorkerFixtures = {
	quarantineList: Set<string>;
};

/**
 * Fork/community-only quarantine skip. Internal CI delegates quarantine
 * classification to the Currents reporter (which is wired up when
 * `CURRENTS_RECORD_KEY` is set in `test-e2e-reusable.yml`), so both fixtures
 * short-circuit when that env var is present — no webhook fetch, no per-test
 * check, no log noise.
 *
 * On fork PRs `CURRENTS_RECORD_KEY` is empty (GitHub Actions does not expose
 * secrets to fork PRs), so we fetch the live list from the internal n8n
 * webhook with a ~2s timeout and skip matching tests. Any error (timeout,
 * non-2xx, parse error) fails open: tests run as if nothing is quarantined.
 *
 * Webhook: https://internal.users.n8n.cloud/webhook/quarantine-list
 * Response shape: { quarantined: string[] } where each entry is the
 * `describe > test` title joined with " > " (matched as a suffix of
 * `testInfo.titlePath`).
 */
export const quarantineFixtures: Fixtures<QuarantineTestFixtures, QuarantineWorkerFixtures> = {
	quarantineList: [
		async ({}, use) => {
			if (process.env.CURRENTS_RECORD_KEY) {
				await use(new Set());
				return;
			}
			await use(await fetchQuarantineList());
		},
		{ scope: 'worker', auto: true },
	],

	quarantineCheck: [
		async ({ quarantineList }, use, testInfo) => {
			if (process.env.CURRENTS_RECORD_KEY) {
				await use(undefined);
				return;
			}
			if (isQuarantined(testInfo, quarantineList)) {
				testInfo.skip(true, 'Currents quarantine');
			}
			await use(undefined);
		},
		{ auto: true },
	],
};
