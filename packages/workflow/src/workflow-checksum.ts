import { SHA256 } from 'crypto-js';

import type { IConnections, INode, IPinData, IWorkflowSettings } from './interfaces';

/**
 * Data structure containing workflow fields used for checksum calculation.
 * Excludes id, versionId, active, timestamps, etc.
 */
interface WorkflowSnapshot {
	name?: string;
	description?: string | null;
	nodes?: INode[];
	connections?: IConnections;
	settings?: IWorkflowSettings;
	meta?: unknown;
	pinData?: IPinData;
	isArchived?: boolean;
	activeVersionId?: string | null;
}

const CHECKSUM_FIELDS = [
	'name',
	'description',
	'nodes',
	'connections',
	'settings',
	'meta',
	'pinData',
	'isArchived',
	'activeVersionId',
] as const satisfies ReadonlyArray<keyof WorkflowSnapshot>;

/**
 * Calculates SHA-256 checksum of workflow content fields for conflict detection.
 * Excludes: id, versionId, timestamps, staticData, relations.
 */
export function calculateWorkflowChecksum(workflow: WorkflowSnapshot): string {
	const checksumData: Record<string, unknown> = {};

	for (const field of CHECKSUM_FIELDS) {
		const value = workflow[field];
		if (value !== undefined) {
			checksumData[field] = value;
		}
	}

	const jsonString = JSON.stringify(checksumData, Object.keys(checksumData).sort());

	return SHA256(jsonString).toString();
}
