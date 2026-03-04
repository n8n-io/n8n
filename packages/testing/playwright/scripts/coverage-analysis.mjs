#!/usr/bin/env node

/**
 * Coverage gap analysis across frontend and nodes.
 *
 * Queries Codecov flag data to surface files with the most uncovered lines —
 * the highest ROI targets for new tests.
 *
 * Usage:
 *   node scripts/coverage-analysis.mjs [options]
 *
 *   --domain=frontend|nodes|all   Which domain to analyse (default: all)
 *   --top=<n>                     Files per list (default: 20)
 *   --min-lines=<n>               Minimum file size to include (default: 50)
 *   --gap-threshold=<n>           Max combined coverage % to be a gap (default: 60)
 *   --json                        Structured JSON — AI-ready, includes type + recommendation fields
 *   --md                          GitHub-Flavored Markdown — for $GITHUB_STEP_SUMMARY
 *   --out-json=<path>             Write JSON to a file alongside --md (avoids double API call in CI)
 *   --deep=<path>                 Per-line unit vs E2E breakdown for a single file
 *
 * Environment:
 *   CODECOV_API_TOKEN   Required in CI. Rate limits are strict without it.
 *
 * JSON schema (for AI agents):
 *   Top-level: { generatedAt, config, results[] }
 *   Each result: { domain, totalGapFiles, gaps[], hotPath[] }
 *   Each gap entry:
 *     domain         — "frontend" | "nodes"
 *     file           — full repo-relative path (use with Read tool)
 *     type           — composable | store | api | utility | component | node | other
 *     recommendation — "unit-test" | "e2e-test" | "nock-test"
 *     lines          — total tracked lines
 *     unitPct        — unit test coverage %
 *     e2ePct         — E2E coverage % (0 for nodes domain — no E2E flag exists)
 *     combinedPct    — optimistic union coverage % (assumes zero overlap; actual may be lower)
 *     uncovered      — uncovered line count (primary sort key — highest = most impactful)
 *     codecovUrl     — direct link to per-line file report on Codecov
 *
 * Note on combinedPct: computed as min(unit_hits + e2e_hits, total_lines) / total_lines.
 * This assumes the two layers cover non-overlapping lines, so it is an upper bound.
 * Real combined coverage may be lower if both layers cover the same lines.
 */

const BASE_URL = 'https://codecov.io/api/v2/github/n8n-io/repos/n8n';
const CODECOV_FILE_BASE = 'https://app.codecov.io/github/n8n-io/n8n/blob/master';

const DOMAINS = {
	frontend: { label: 'Frontend (editor-ui)', unitFlag: 'frontend', e2eFlag: 'frontend-e2e' },
	nodes: { label: 'Nodes (nodes-base)', unitFlag: 'nodes-unit', e2eFlag: null },
};

// ── CLI ────────────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
	process.argv
		.slice(2)
		.filter((a) => a.startsWith('--'))
		.map((a) => {
			const [k, v] = a.slice(2).split('=');
			return [k, v ?? true];
		}),
);

const DOMAIN = args.domain ?? 'all';
const TOP = parseInt(args.top ?? '20', 10);
const MIN_LINES = parseInt(args['min-lines'] ?? '50', 10);
const GAP_THRESHOLD = parseFloat(args['gap-threshold'] ?? '60');
const OUTPUT_JSON = args.json === true;
const OUTPUT_MD = args.md === true;
const OUT_JSON_FILE = args['out-json'];
const DEEP_FILE = args.deep;

const activeDomains =
	DOMAIN === 'all' ? Object.entries(DOMAINS) : [[DOMAIN, DOMAINS[DOMAIN]]];

if (DOMAIN !== 'all' && !DOMAINS[DOMAIN]) {
	console.error(`Unknown domain "${DOMAIN}". Use: frontend, nodes, or all.`);
	process.exit(1);
}

if (DEEP_FILE && (DEEP_FILE.startsWith('http') || DEEP_FILE.includes('..'))) {
	console.error('--deep must be a relative repository file path (e.g. packages/editor-ui/src/App.vue)');
	process.exit(1);
}

const TOKEN = process.env.CODECOV_API_TOKEN;
const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

// ── File type inference ────────────────────────────────────────────────────────

/**
 * Infers the file type and appropriate test recommendation from the file path.
 * Used by AI agents to prioritise the easiest/most impactful gaps to address.
 *
 * Order matters — more specific patterns first.
 */
export function inferType(filePath) {
	const name = filePath.split('/').pop() ?? '';
	const lpath = filePath.toLowerCase();

	// Node files (.node.ts) — test with nock HTTP mocking
	if (/\.node\.(ts|js)$/.test(name)) {
		return { type: 'node', recommendation: 'nock-test' };
	}
	// Composables — must be in /composables/ dir AND match use* prefix to avoid
	// false positives like UserManager.ts, useRootStore (store), etc.
	if (lpath.includes('/composables/') && /^use[A-Z]/.test(name)) {
		return { type: 'composable', recommendation: 'unit-test' };
	}
	// Stores
	if (/\.store\.(ts|js)$/.test(name) || lpath.includes('/stores/')) {
		return { type: 'store', recommendation: 'unit-test' };
	}
	// API modules
	if (/\.api\.(ts|js)$/.test(name)) {
		return { type: 'api', recommendation: 'unit-test' };
	}
	// Utilities/helpers
	if (/\.(utils|helpers|util|helper)\.(ts|js)$/.test(name)) {
		return { type: 'utility', recommendation: 'unit-test' };
	}
	// Vue components — prefer E2E for UI behaviour, unit for pure logic
	if (/\.vue$/.test(name)) {
		return { type: 'component', recommendation: 'e2e-test' };
	}
	return { type: 'other', recommendation: 'unit-test' };
}

// ── Fetch ──────────────────────────────────────────────────────────────────────

/** Fetch with exponential backoff retry — handles 429 rate limits and transient 5xx. */
async function fetchJson(url, retries = 3) {
	for (let attempt = 0; attempt <= retries; attempt++) {
		const res = await fetch(url, { headers });

		if (res.ok) return res.json();

		// Retry on rate limit or transient server error
		if ((res.status === 429 || res.status >= 500) && attempt < retries) {
			const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
			process.stderr.write(`  [${res.status}] retrying in ${Math.round(delay / 1000)}s...\n`);
			await new Promise((r) => setTimeout(r, delay));
			continue;
		}

		const body = await res.text();
		throw new Error(`HTTP ${res.status}  ${url}\n${body.slice(0, 200)}`);
	}
}

/**
 * Returns Map<fileName, { lines, hits, pct }> for a given Codecov flag.
 * Warns if the flag returns no files — likely a propagation delay after upload.
 */
async function fetchFlagMap(flag) {
	const map = new Map();
	let url = `${BASE_URL}/report/?flag=${flag}&page_size=100`;
	let page = 1;

	process.stderr.write(`  ${flag}:`);
	while (url) {
		process.stderr.write(` p${page}`);
		const data = await fetchJson(url);
		for (const f of data.files ?? []) {
			const t = f.totals ?? {};
			const lines = Number(t.lines) || 0;
			const hits = Number(t.hits) || 0;
			if (lines === 0) continue; // skip files with no tracked lines
			map.set(f.name, { lines, hits, pct: (hits / lines) * 100 });
		}
		url = data.next ?? null;
		page++;
	}
	process.stderr.write(` → ${map.size} files\n`);

	if (map.size === 0) {
		process.stderr.write(
			`  WARNING: flag "${flag}" returned 0 files. Codecov may still be indexing the upload.\n` +
			`           Results for this flag will be empty. Re-run in a few minutes if this looks wrong.\n`,
		);
	}

	return map;
}

async function fetchLineData(filePath, flag) {
	const data = await fetchJson(
		`${BASE_URL}/file_report/${encodeURIComponent(filePath)}?flag=${flag}`,
	);
	return data.line_coverage ?? [];
}

// ── Analysis ───────────────────────────────────────────────────────────────────

export function findGaps(unitMap, e2eMap, domainKey) {
	const all = new Set([...unitMap.keys(), ...(e2eMap?.keys() ?? [])]);
	const gaps = [];

	for (const name of all) {
		const unit = unitMap.get(name) ?? { lines: 0, hits: 0, pct: 0 };
		const e2e = e2eMap?.get(name) ?? { lines: 0, hits: 0, pct: 0 };
		const lines = Math.max(unit.lines, e2e.lines);

		// Both zero means no line data at all — skip entirely
		if (lines === 0 || lines < MIN_LINES) continue;

		const combinedHits = Math.min(unit.hits + e2e.hits, lines);
		const combinedPct = (combinedHits / lines) * 100;
		const uncovered = lines - combinedHits;

		if (combinedPct >= GAP_THRESHOLD) continue;

		const { type, recommendation } = inferType(name);
		gaps.push({
			domain: domainKey,
			file: name,
			type,
			recommendation,
			lines,
			unitPct: unit.pct,
			e2ePct: e2e.pct,
			combinedPct,
			uncovered,
			codecovUrl: `${CODECOV_FILE_BASE}/${name}`,
		});
	}

	const sorted = gaps.sort((a, b) => b.uncovered - a.uncovered);
	return { gaps: sorted.slice(0, TOP), totalGapFiles: sorted.length };
}

export function findHotPath(unitMap, e2eMap) {
	if (!e2eMap) return [];
	const all = new Set([...unitMap.keys(), ...e2eMap.keys()]);
	const result = [];

	for (const name of all) {
		const unit = unitMap.get(name) ?? { lines: 0, pct: 0 };
		const e2e = e2eMap.get(name) ?? { lines: 0, pct: 0 };
		const lines = Math.max(unit.lines, e2e.lines);
		if (lines === 0 || lines < MIN_LINES) continue;
		if (e2e.pct >= 80 && unit.pct < 15) {
			result.push({ file: name, lines, unitPct: unit.pct, e2ePct: e2e.pct });
		}
	}

	return result.sort((a, b) => b.e2ePct - a.e2ePct).slice(0, 10);
}

// ── Terminal output ────────────────────────────────────────────────────────────

const W = 112;

function bar(pct, width = 14) {
	const filled = Math.round((pct / 100) * width);
	return '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
}

function trunc(str, max) {
	return str.length > max ? '…' + str.slice(-(max - 1)) : str;
}

function printGapTable(label, gaps, hasE2E, totalGapFiles) {
	console.log(`\n${'═'.repeat(W)}`);
	console.log(` GAPS — ${label}  (${totalGapFiles} files below ${GAP_THRESHOLD}% — top ${gaps.length} by uncovered lines)`);
	console.log('═'.repeat(W));

	const e2eHdr = hasE2E ? `${'E2E%'.padStart(7)} ` : '';
	console.log(
		` ${'#'.padEnd(4)} ${'File'.padEnd(48)} ${'Type'.padEnd(12)} ${'Lines'.padStart(6)} ${'Unit%'.padStart(7)} ${e2eHdr}${'Combined%'.padStart(11)} ${'Uncovered'.padStart(10)}  Bar`,
	);
	console.log('─'.repeat(W));

	for (const [i, f] of gaps.entries()) {
		const e2eCol = hasE2E ? `${f.e2ePct.toFixed(1).padStart(6)}% ` : '';
		console.log(
			` ${String(i + 1).padEnd(4)} ${trunc(f.file, 48).padEnd(48)} ${f.type.padEnd(12)} ${String(f.lines).padStart(6)} ` +
				`${f.unitPct.toFixed(1).padStart(6)}% ${e2eCol}${f.combinedPct.toFixed(1).padStart(10)}% ${String(f.uncovered).padStart(10)}  ${bar(f.combinedPct)}`,
		);
	}
	if (!gaps.length) console.log('  (none)');
}

function printHotPathTable(hotPath) {
	if (!hotPath.length) return;
	console.log(`\n${'─'.repeat(W)}`);
	console.log(` E2E HOT-PATH (E2E ≥ 80%, Unit < 15%) — covered by navigation, not deliberate unit tests`);
	console.log('─'.repeat(W));
	for (const [i, f] of hotPath.entries()) {
		console.log(
			`  ${String(i + 1).padEnd(3)} ${trunc(f.file, 75).padEnd(75)} unit=${f.unitPct.toFixed(1).padStart(5)}%  e2e=${f.e2ePct.toFixed(1).padStart(5)}%`,
		);
	}
}

// ── Markdown output (GitHub Job Summary) ──────────────────────────────────────

export function mdEscape(str) {
	// Escape characters that break GFM table cells or link syntax
	return str.replace(/\|/g, '\\|').replace(/"/g, '&quot;');
}

function renderMarkdown(results, date) {
	const lines = [];
	lines.push('## Coverage Gap Report');
	lines.push(
		`_${date} · gap threshold <${GAP_THRESHOLD}% · min ${MIN_LINES} lines · [Full report on Codecov](https://app.codecov.io/github/n8n-io/n8n)_`,
	);
	lines.push('');
	lines.push('> Files ranked by uncovered lines — highest ROI targets for new tests.');
	lines.push('');

	for (const { domain, gaps, hotPath, hasE2E, totalGapFiles } of results) {
		lines.push(`### ${domain.label}`);
		lines.push(
			`_${totalGapFiles} files below ${GAP_THRESHOLD}% combined coverage — top ${gaps.length} by uncovered lines_`,
		);
		lines.push('');

		const e2eHdr = hasE2E ? ' E2E% |' : '';
		const e2eSep = hasE2E ? ' ----: |' : '';
		lines.push(`| # | File | Type | Lines | Unit% |${e2eHdr} Combined% | Uncovered |`);
		lines.push(`| --: | ---- | ---- | ----: | ----: |${e2eSep} --------: | --------: |`);

		for (const [i, f] of gaps.entries()) {
			const fileName = mdEscape(f.file.split('/').pop());
			const dir = mdEscape(f.file.split('/').slice(0, -1).join('/'));
			const fileCell = `[\`${fileName}\`](${f.codecovUrl} "${dir}")`;
			const e2eCol = hasE2E ? ` ${f.e2ePct.toFixed(1)}% |` : '';
			lines.push(
				`| ${i + 1} | ${fileCell} | \`${f.type}\` | ${f.lines} | ${f.unitPct.toFixed(1)}% |${e2eCol} **${f.combinedPct.toFixed(1)}%** | **${f.uncovered}** |`,
			);
		}

		if (hotPath.length) {
			lines.push('');
			lines.push('<details>');
			lines.push(
				`<summary>E2E hot-path — ${hotPath.length} files covered by test navigation (not deliberate unit tests)</summary>`,
			);
			lines.push('');
			lines.push('| File | Unit% | E2E% |');
			lines.push('| ---- | ----: | ---: |');
			for (const f of hotPath) {
				lines.push(
					`| \`${mdEscape(f.file.split('/').pop())}\` | ${f.unitPct.toFixed(1)}% | ${f.e2ePct.toFixed(1)}% |`,
				);
			}
			lines.push('</details>');
		}

		lines.push('');
	}

	return lines.join('\n');
}

// ── Deep dive ──────────────────────────────────────────────────────────────────

async function deepDive(filePath) {
	const domain = DOMAINS.frontend;
	process.stderr.write('Fetching line data...\n');

	const [unitLines, e2eLines] = await Promise.all([
		fetchLineData(filePath, domain.unitFlag),
		domain.e2eFlag ? fetchLineData(filePath, domain.e2eFlag) : Promise.resolve([]),
	]);

	const unitMap = new Map(unitLines.map(([ln, h]) => [ln, h]));
	const e2eMap = new Map(e2eLines.map(([ln, h]) => [ln, h]));
	const all = new Set([...unitMap.keys(), ...e2eMap.keys()]);

	let both = 0, unitOnly = 0, e2eOnly = 0, neither = 0;
	const uncoveredLineNums = [];

	for (const ln of all) {
		const u = (unitMap.get(ln) ?? 0) > 0;
		const e = (e2eMap.get(ln) ?? 0) > 0;
		if (u && e) both++;
		else if (u) unitOnly++;
		else if (e) e2eOnly++;
		else { neither++; uncoveredLineNums.push(ln); }
	}

	console.log(`\nPer-line breakdown: ${filePath}\n`);
	console.log(`Lines tracked : ${all.size}`);
	console.log(`Unit only     : ${unitOnly}`);
	console.log(`E2E only      : ${e2eOnly}`);
	console.log(`Both          : ${both}`);
	console.log(`Neither       : ${neither}  ← true gaps`);

	if (uncoveredLineNums.length) {
		console.log(`\nUncovered lines: ${uncoveredLineNums.sort((a, b) => a - b).join(', ')}`);
	}
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
	if (DEEP_FILE) {
		await deepDive(DEEP_FILE);
		return;
	}

	const results = [];

	for (const [domainKey, domain] of activeDomains) {
		process.stderr.write(`\nFetching ${domain.label}...\n`);
		const [unitMap, e2eMap] = await Promise.all([
			fetchFlagMap(domain.unitFlag),
			domain.e2eFlag ? fetchFlagMap(domain.e2eFlag) : Promise.resolve(null),
		]);

		const { gaps, totalGapFiles } = findGaps(unitMap, e2eMap, domainKey);
		const hotPath = domain.e2eFlag ? findHotPath(unitMap, e2eMap) : [];
		results.push({ domainKey, domain, gaps, hotPath, hasE2E: !!domain.e2eFlag, totalGapFiles });
	}

	const date = new Date().toISOString().split('T')[0];

	const jsonPayload = {
		generatedAt: date,
		config: { gapThreshold: GAP_THRESHOLD, minLines: MIN_LINES, top: TOP },
		results: results.map(({ domainKey, gaps, hotPath, totalGapFiles }) => ({
			domain: domainKey,
			totalGapFiles,
			gaps,
			hotPath,
		})),
	};

	// Write JSON to file alongside any other output mode (avoids a second API call in CI)
	if (OUT_JSON_FILE) {
		const { writeFileSync } = await import('node:fs');
		writeFileSync(OUT_JSON_FILE, JSON.stringify(jsonPayload, null, 2));
		process.stderr.write(`  JSON written to ${OUT_JSON_FILE}\n`);
	}

	if (OUTPUT_JSON) {
		console.log(JSON.stringify(jsonPayload, null, 2));
		return;
	}

	if (OUTPUT_MD) {
		console.log(renderMarkdown(results, date));
		return;
	}

	console.log(`\nCoverage Gap Analysis  |  ${date}  |  gap <${GAP_THRESHOLD}%  |  min ${MIN_LINES} lines`);
	for (const { domain, gaps, hotPath, hasE2E, totalGapFiles } of results) {
		printGapTable(domain.label, gaps, hasE2E, totalGapFiles);
		printHotPathTable(hotPath);
	}
	console.log(`\n${'─'.repeat(W)}`);
	console.log('Tip: --deep=<path>   per-line unit vs E2E breakdown');
	console.log('     --json          AI-ready structured output');
	console.log('     --domain=nodes  nodes-only gaps\n');
}

// Allow pure-function imports in tests without triggering network calls
if (process.argv[1] === new URL(import.meta.url).pathname) {
	main().catch((err) => {
		console.error('Error:', err.message);
		process.exit(1);
	});
}
