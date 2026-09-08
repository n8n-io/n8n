import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface WorkflowJobStep {
	name?: string;
	uses?: string;
	run?: string;
	with?: Record<string, unknown>;
}

export interface WorkflowJob {
	id: string;
	steps: WorkflowJobStep[];
}

export interface WorkflowFile {
	filePath: string;
	relativePath: string;
	lines: string[];
	triggers: string[];
	jobs: WorkflowJob[];
}

export async function findWorkflowFiles(rootDir: string): Promise<string[]> {
	return await fg('.github/workflows/*.{yml,yaml}', {
		cwd: rootDir,
		absolute: true,
		dot: true,
	});
}

export function parseWorkflow(filePath: string, rootDir: string): WorkflowFile | null {
	const content = fs.readFileSync(filePath, 'utf-8');
	const lines = content.split('\n');

	let doc: unknown;
	try {
		doc = parseYaml(content);
	} catch {
		return null;
	}

	if (!doc || typeof doc !== 'object') return null;

	const workflow = doc as Record<string, unknown>;
	// YAML's `on:` keyword gets parsed as boolean `true` by the yaml lib
	// unless quoted, so check both keys.
	const onValue = workflow.on ?? workflow.true;

	return {
		filePath,
		relativePath: path.relative(rootDir, filePath),
		lines,
		triggers: extractTriggers(onValue),
		jobs: extractJobs(workflow.jobs),
	};
}

function extractTriggers(onValue: unknown): string[] {
	if (typeof onValue === 'string') return [onValue];
	if (Array.isArray(onValue)) return onValue.filter((t): t is string => typeof t === 'string');
	if (onValue && typeof onValue === 'object') return Object.keys(onValue);
	return [];
}

function extractJobs(jobsValue: unknown): WorkflowJob[] {
	if (!jobsValue || typeof jobsValue !== 'object') return [];

	const jobs: WorkflowJob[] = [];
	for (const [id, raw] of Object.entries(jobsValue as Record<string, unknown>)) {
		if (!raw || typeof raw !== 'object') continue;
		const job = raw as Record<string, unknown>;
		const stepsValue = job.steps;
		if (!Array.isArray(stepsValue)) {
			jobs.push({ id, steps: [] });
			continue;
		}

		const steps: WorkflowJobStep[] = [];
		for (const stepRaw of stepsValue) {
			if (!stepRaw || typeof stepRaw !== 'object') continue;
			const step = stepRaw as Record<string, unknown>;
			steps.push({
				name: typeof step.name === 'string' ? step.name : undefined,
				uses: typeof step.uses === 'string' ? step.uses : undefined,
				run: typeof step.run === 'string' ? step.run : undefined,
				with:
					step.with && typeof step.with === 'object'
						? (step.with as Record<string, unknown>)
						: undefined,
			});
		}
		jobs.push({ id, steps });
	}
	return jobs;
}

export function findLineContaining(lines: string[], needle: string, startLine = 0): number {
	for (let i = startLine; i < lines.length; i++) {
		if (lines[i].includes(needle)) return i + 1;
	}
	return 1;
}
