import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import {
	findLineContaining,
	findWorkflowFiles,
	parseWorkflow,
	type WorkflowFile,
	type WorkflowJobStep,
} from '../utils/workflow-scanner.js';

const RISKY_TRIGGER = 'pull_request_target';

const UNTRUSTED_REF_EXPRESSIONS = [
	'github.event.pull_request.head.sha',
	'github.event.pull_request.head.ref',
	'github.event.pull_request.merge_commit_sha',
	'github.head_ref',
];

const UNTRUSTED_REPOSITORY_EXPRESSIONS = [
	'github.event.pull_request.head.repo.full_name',
	'github.event.pull_request.head.repo.clone_url',
];

export class WorkflowPrTargetSafetyRule extends BaseRule<CodeHealthContext> {
	readonly id = 'workflow-pr-target-safety';
	readonly name = 'Workflow pull_request_target Safety';
	readonly description =
		'Disallow pull_request_target triggers. Allowlisted workflows may use it only if they do not check out PR-author-controlled code.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir } = context;
		const options = this.getOptions();
		const allowedWorkflows = Array.isArray(options.allowedWorkflows)
			? (options.allowedWorkflows as string[])
			: [];

		const files = await findWorkflowFiles(rootDir);
		const violations: Violation[] = [];

		for (const filePath of files) {
			const workflow = parseWorkflow(filePath, rootDir);
			if (!workflow) continue;
			if (!workflow.triggers.includes(RISKY_TRIGGER)) continue;

			const fileName = path.basename(filePath);
			if (!allowedWorkflows.includes(fileName)) {
				violations.push(this.flagTrigger(workflow));
				continue;
			}

			violations.push(...this.flagUnsafeCheckouts(workflow));
		}

		return violations;
	}

	private flagTrigger(workflow: WorkflowFile): Violation {
		return this.createViolation(
			workflow.filePath,
			findLineContaining(workflow.lines, RISKY_TRIGGER),
			1,
			`${workflow.relativePath} uses pull_request_target. Prefer pull_request — pull_request_target runs in the base-repo context with secrets exposed, which is unsafe when combined with PR-author-controlled code.`,
			'Switch to pull_request, or if pull_request_target is required, request a security review and add this workflow to the rule allowlist.',
		);
	}

	private flagUnsafeCheckouts(workflow: WorkflowFile): Violation[] {
		const violations: Violation[] = [];

		for (const job of workflow.jobs) {
			for (const step of job.steps) {
				violations.push(...this.flagCheckoutAction(workflow, job.id, step));
				violations.push(...this.flagShellCheckout(workflow, job.id, step));
			}
		}

		return violations;
	}

	private flagCheckoutAction(
		workflow: WorkflowFile,
		jobId: string,
		step: WorkflowJobStep,
	): Violation[] {
		if (!step.uses?.startsWith('actions/checkout@')) return [];
		const stepWith = step.with;
		if (!stepWith) return [];

		const violations: Violation[] = [];
		const stepLine = findLineContaining(workflow.lines, step.uses);

		const ref = typeof stepWith.ref === 'string' ? stepWith.ref : undefined;
		if (ref && containsExpression(ref, UNTRUSTED_REF_EXPRESSIONS)) {
			violations.push(
				this.createViolation(
					workflow.filePath,
					findLineContaining(workflow.lines, 'ref:', stepLine),
					1,
					`${workflow.relativePath} job "${jobId}" checks out PR-author-controlled ref under pull_request_target. This pattern ("their code, our keys") is the canonical pull_request_target exploit.`,
					'Remove the ref override (defaults to the base branch), or move this step to a workflow triggered by pull_request.',
				),
			);
		}

		const repository = typeof stepWith.repository === 'string' ? stepWith.repository : undefined;
		if (repository && containsExpression(repository, UNTRUSTED_REPOSITORY_EXPRESSIONS)) {
			violations.push(
				this.createViolation(
					workflow.filePath,
					findLineContaining(workflow.lines, 'repository:', stepLine),
					1,
					`${workflow.relativePath} job "${jobId}" checks out a PR-author-controlled repository under pull_request_target.`,
					'Remove the repository override so the checkout stays on github.repository.',
				),
			);
		}

		return violations;
	}

	private flagShellCheckout(
		workflow: WorkflowFile,
		jobId: string,
		step: WorkflowJobStep,
	): Violation[] {
		if (!step.run) return [];
		const usesGitCheckout = /\bgit\s+(checkout|fetch|pull)\b/.test(step.run);
		if (!usesGitCheckout) return [];
		if (!containsExpression(step.run, UNTRUSTED_REF_EXPRESSIONS)) return [];

		return [
			this.createViolation(
				workflow.filePath,
				findLineContaining(workflow.lines, 'run:'),
				1,
				`${workflow.relativePath} job "${jobId}" runs a shell git command that fetches PR-author-controlled refs under pull_request_target.`,
				'Avoid checking out PR head from a pull_request_target workflow; do the work in a pull_request-triggered workflow instead.',
			),
		];
	}
}

function containsExpression(value: string, needles: string[]): boolean {
	return needles.some((needle) => value.includes(needle));
}
