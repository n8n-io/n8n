#!/usr/bin/env node
/**
 * Save Weekly Baseline
 *
 * Saves benchmark results as a weekly baseline and rotates old baselines.
 *
 * Usage:
 *   node scripts/save-baseline.mjs              # Save as current week
 *   node scripts/save-baseline.mjs --keep 4     # Keep last 4 weeks (default)
 *
 * Files created:
 *   profiles/baseline-2024-W52.json
 *   profiles/baseline.json (symlink to latest)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = resolve(__dirname, '../profiles');
const PACKAGE_DIR = resolve(__dirname, '..');

// Parse args
const args = process.argv.slice(2);
const keepIdx = args.indexOf('--keep');
const KEEP_WEEKS = keepIdx !== -1 ? parseInt(args[keepIdx + 1], 10) : 4;

// Get current ISO week
function getISOWeek() {
	const now = new Date();
	const year = now.getFullYear();
	const jan1 = new Date(year, 0, 1);
	const days = Math.floor((now - jan1) / 86400000);
	const week = Math.ceil((days + jan1.getDay() + 1) / 7);
	return `${year}-W${week.toString().padStart(2, '0')}`;
}

const weekId = getISOWeek();
const baselineFile = `baseline-${weekId}.json`;
const baselinePath = resolve(PROFILES_DIR, baselineFile);
const latestPath = resolve(PROFILES_DIR, 'baseline.json');

console.log(`\n📊 Saving Weekly Baseline\n`);
console.log(`   Week: ${weekId}`);
console.log(`   Keep: ${KEEP_WEEKS} weeks\n`);

// Run benchmarks
console.log('⏳ Running benchmarks...\n');
try {
	execSync('pnpm vitest bench --run --outputJson ./profiles/benchmark-results.json', {
		cwd: PACKAGE_DIR,
		stdio: 'inherit',
	});
} catch (error) {
	console.error('\n❌ Benchmark run failed');
	process.exit(1);
}

// Copy results to weekly baseline
const resultsPath = resolve(PROFILES_DIR, 'benchmark-results.json');
if (!existsSync(resultsPath)) {
	console.error('\n❌ No benchmark results found');
	process.exit(1);
}

copyFileSync(resultsPath, baselinePath);
copyFileSync(resultsPath, latestPath);

console.log(`\n✅ Saved: ${baselineFile}`);
console.log(`✅ Updated: baseline.json`);

// Rotate old baselines
const allBaselines = readdirSync(PROFILES_DIR)
	.filter(f => f.match(/^baseline-\d{4}-W\d{2}\.json$/))
	.sort()
	.reverse();

if (allBaselines.length > KEEP_WEEKS) {
	console.log(`\n🗑️  Rotating old baselines (keeping ${KEEP_WEEKS}):`);
	const toDelete = allBaselines.slice(KEEP_WEEKS);
	for (const file of toDelete) {
		unlinkSync(resolve(PROFILES_DIR, file));
		console.log(`   Deleted: ${file}`);
	}
}

console.log(`\n📁 Current baselines:`);
const remaining = readdirSync(PROFILES_DIR)
	.filter(f => f.match(/^baseline(-\d{4}-W\d{2})?\.json$/))
	.sort()
	.reverse();

for (const file of remaining) {
	console.log(`   ${file}`);
}

console.log('');
