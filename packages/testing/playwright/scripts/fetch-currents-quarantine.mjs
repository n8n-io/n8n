#!/usr/bin/env node

/**
 * Fetches the active quarantine list from Currents and writes it to a committed
 * JSON file so test runs (internal + fork) read it locally without needing a key.
 *
 * Usage:
 *   CURRENTS_API_KEY=<key> node packages/testing/playwright/scripts/fetch-currents-quarantine.mjs --project=<id>
 *
 * Output: .github/test-metrics/quarantine.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../..');
const OUTPUT_PATH = path.join(ROOT_DIR, '.github', 'test-metrics', 'quarantine.json');

const CURRENTS_API = 'https://api.currents.dev/v1';

const PROJECT_ID = process.argv.find((a) => a.startsWith('--project='))?.split('=')[1];
if (!PROJECT_ID) {
	console.error('Usage: CURRENTS_API_KEY=<key> node fetch-currents-quarantine.mjs --project=<id>');
	process.exit(1);
}

const API_KEY = process.env.CURRENTS_API_KEY;
if (!API_KEY) {
	console.error('CURRENTS_API_KEY required');
	process.exit(1);
}

async function fetchActiveActions() {
	const url = new URL(`${CURRENTS_API}/actions`);
	url.searchParams.set('projectId', PROJECT_ID);
	url.searchParams.set('status', 'active');

	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${API_KEY}` },
	});
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	const json = await res.json();
	return json.data ?? [];
}

async function main() {
	console.log(`Fetching active quarantine actions for project ${PROJECT_ID}...`);
	const actions = await fetchActiveActions();

	const titles = actions
		.filter((a) => a.action?.[0]?.op === 'quarantine')
		.map((a) => a.matcher?.cond?.[0]?.value)
		.filter((v) => typeof v === 'string' && v.length > 0)
		.sort();

	const output = {
		updatedAt: new Date().toISOString(),
		source: 'currents',
		projectId: PROJECT_ID,
		quarantined: titles,
	};

	fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
	fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');

	console.log(
		`Wrote ${titles.length} quarantined titles to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
