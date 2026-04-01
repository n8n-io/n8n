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

const BASELINE_FILENAME = '.code-health-baseline.json';

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const options = parseArgs(args);

	const rootDir = findMonorepoRoot(process.cwd());
	const baselinePath = path.join(rootDir, BASELINE_FILENAME);
	const context: CodeHealthContext = { rootDir };

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
		const baseline = generateBaseline(report, rootDir);
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
