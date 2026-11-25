import { getEntry } from '../grammar/catalog';
import type { ParityCase } from '../grammar/ir';
import type { Diff } from '../oracle/compare';

/**
 * A finding of level E: the eligibility check accepts the case, but an engine
 * does not run it, or the converted graph is not the workflow.
 */
export interface Finding {
	kind: 'refused' | 'timeout' | 'droppedEdge';
	engine: 'v1' | 'v2';
	message: string;
	detail?: unknown;
}

function slug(text: string): string {
	return text.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function nodeTag(parityCase: ParityCase, nodeName: string | undefined): string {
	if (nodeName === undefined) return 'workflow';
	const irNode = [...parityCase.ir.triggers, ...parityCase.ir.nodes].find(
		(candidate) => candidate.key === nodeName,
	);
	if (!irNode) return 'unknown';
	const type = getEntry(irNode.catalogId).type;
	return `${type.slice(type.lastIndexOf('.') + 1)}.${irNode.via}`;
}

/**
 * Level, node type, combinator and diff kind, for example
 * `L2.merge-merge.items`. Failures with one signature are most likely one bug.
 */
export function diffSignature(diff: Diff, parityCase: ParityCase): string {
	return [diff.level, nodeTag(parityCase, diff.node), diff.kind].map(slug).join('.');
}

/** An engine that refuses or does not finish a case that the check accepts fails the run. */
export function findingFailsRun(finding: Finding): boolean {
	return finding.kind === 'refused' || finding.kind === 'timeout';
}

export function findingSignature(finding: Finding): string {
	return ['E', finding.engine, finding.kind].map(slug).join('.');
}
