#!/usr/bin/env node

import {
	toJSON,
	loadBaseline,
	generateBaseline,
	saveBaseline,
	filterReportByBaseline,
} from '@n8n/rules-engine';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseArgs } from './cli/arg-parser.js';
import type { CodeHealthContext } from './context.js';
import { createDefaultRunner } from './index.js';
import { runVerifyClosure } from './single-instance/verify-closure.js';
import { runVerifyNpmInstall } from './single-instance/verify-npm-install.js';

const BASELINE_FILENAME = '.code-health-baseline.json';

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const options = parseArgs(args);

	const rootDir = findMonorepoRoot(process.cwd());
	const baselinePath = path.join(rootDir, BASELINE_FILENAME);
	const context: CodeHealthContext = {
		rootDir,
		changedFiles: parseChangedFiles(process.env.CODE_HEALTH_CHANGED_FILES),
		addedFiles: parseChangedFiles(process.env.CODE_HEALTH_ADDED_FILES),
	};

	if (options.command === 'verify-closure') {
		const dir = options.args[0] ? path.resolve(process.cwd(), options.args[0]) : rootDir;
		process.exit(runVerifyClosure(dir));
	}

	if (options.command === 'verify-npm-install') {
		process.exit(await runVerifyNpmInstall(options.args, rootDir));
	}

	const runner = createDefaultRunner();

	if (options.command === 'rules') {
		console.log(JSON.stringify(runner.getRuleDetails(), null, 2));
		return;
	}

	if (options.rule) {
		runner.enableOnly([options.rule]);
	}

	let report = options.rule
		? await runner.runRule(options.rule, context, rootDir)
		: await runner.run(context, rootDir);

	if (!report) {
		console.error(JSON.stringify({ error: `Unknown rule: ${options.rule}` }));
		process.exit(1);
	}

	if (options.command === 'baseline') {
		// Pass the current file through so exceptions for rules this run didn't cover survive.
		const previous = fs.existsSync(baselinePath) ? loadBaseline(baselinePath) : null;
		const baseline = generateBaseline(report, rootDir, previous);
		saveBaseline(baseline, baselinePath);
		console.log(
			JSON.stringify(
				{
					action: 'baseline-created',
					totalViolations: baseline.totalViolations,
					path: baselinePath,
				},
				null,
				2,
			),
		);
		return;
	}

	if (!options.ignoreBaseline && fs.existsSync(baselinePath)) {
		const baseline = loadBaseline(baselinePath);
		if (baseline) {
			report = filterReportByBaseline(report, baseline, rootDir);
		}
	}

	console.log(toJSON(report, rootDir));

	if (report.summary.totalViolations > 0) {
		process.exit(1);
	}
}

function parseChangedFiles(raw: string | undefined): string[] | undefined {
	if (!raw) return undefined;
	const entries = raw
		.split(/[\n,]/)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
	return entries.length > 0 ? entries : undefined;
}

function findMonorepoRoot(startDir: string): string {
	let dir = startDir;
	while (dir !== path.dirname(dir)) {
		if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
			return dir;
		}
		dir = path.dirname(dir);
	}
	return startDir;
}

main().catch((error) => {
	console.error(JSON.stringify({ error: (error as Error).message }));
	process.exit(2);
});
