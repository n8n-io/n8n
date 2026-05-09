import type { Fixtures, TestInfo } from '@playwright/test';
import fs from 'fs';
import path from 'path';

import { findPackagesRoot } from '../utils/path-helper';

const QUARANTINE_FILE = path.join(
	findPackagesRoot('packages'),
	'.github',
	'test-metrics',
	'quarantine.json',
);

type QuarantineFile = { quarantined?: string[] };

function loadQuarantineList(): Set<string> {
	try {
		const raw = fs.readFileSync(QUARANTINE_FILE, 'utf-8');
		const parsed = JSON.parse(raw) as QuarantineFile;
		const titles = parsed.quarantined ?? [];
		console.log(
			`🔒 Loaded ${titles.length} quarantined test titles from ${path.basename(QUARANTINE_FILE)}`,
		);
		return new Set(titles);
	} catch (loadError) {
		console.warn(
			`⚠️  Quarantine list unavailable (${(loadError as Error).message}) — quarantined tests will run this session`,
		);
		return new Set();
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
 * Auto-skips any test whose title (describe chain joined with " > ") is listed
 * in `.github/test-metrics/quarantine.json`. Applies identically on internal
 * and fork PRs — the list is committed so no API key is needed at test time.
 *
 * Refresh the list with:
 *   CURRENTS_API_KEY=<key> node packages/testing/playwright/scripts/fetch-currents-quarantine.mjs --project=<id>
 *
 * Soft-fails: if the file is missing or malformed, tests run as if nothing is
 * quarantined (with a warning).
 */
export const quarantineFixtures: Fixtures<QuarantineTestFixtures, QuarantineWorkerFixtures> = {
	quarantineList: [
		async ({}, use) => {
			await use(loadQuarantineList());
		},
		{ scope: 'worker', auto: true },
	],

	quarantineCheck: [
		async ({ quarantineList }, use, testInfo) => {
			if (isQuarantined(testInfo, quarantineList)) {
				testInfo.skip(true, 'Currents quarantine');
			}
			await use(undefined);
		},
		{ auto: true },
	],
};
