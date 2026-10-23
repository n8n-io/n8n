import { sha256 } from '@n8n/utils/sha256';

import type {
	IConnections,
	INode,
	IPinData,
	IWorkflowGroup,
	IWorkflowSettings,
} from './interfaces';
import { isObject } from './utils';

/**
 * Data structure containing workflow fields used for checksum calculation.
 * Excludes id, versionId, active, timestamps, etc.
 */
export interface WorkflowSnapshot {
	name?: string;
	description?: string | null;
	nodes?: INode[];
	connections?: IConnections;
	settings?: IWorkflowSettings;
	meta?: unknown;
	pinData?: IPinData;
	isArchived?: boolean;
	activeVersionId?: string | null;
	nodeGroups?: IWorkflowGroup[];
}

export const WORKFLOW_CHECKSUM_FIELDS = [
	'name',
	'description',
	'nodes',
	'connections',
	'settings',
	'meta',
	'pinData',
	'isArchived',
	'activeVersionId',
	'nodeGroups',
] as const satisfies ReadonlyArray<keyof WorkflowSnapshot>;

/**
 * Recursively sorts object keys alphabetically for consistent serialization.
 * Arrays keep their order; their elements are normalized recursively.
 */
function sortObjectKeys(value: unknown): unknown {
	if (value === null || typeof value !== 'object') return value;

	if (Array.isArray(value)) {
		return value.map((element) => sortObjectKeys(element));
	}

	if (isObject(value)) {
		const sortedKeys = Object.keys(value).sort();

		const sortedObject: Record<string, unknown> = {};
		for (const key of sortedKeys) {
			sortedObject[key] = sortObjectKeys(value[key]);
		}

		return sortedObject;
	}

	return value;
}

/**
 * Calculates SHA-256 checksum of workflow content fields for conflict detection.
 * Excludes: id, versionId, timestamps, staticData, relations.
 */
export async function calculateWorkflowChecksum(workflow: WorkflowSnapshot): Promise<string> {
	const checksumPayload: Record<string, unknown> = {};

	for (const field of WORKFLOW_CHECKSUM_FIELDS) {
		const value = workflow[field];
		if (value !== undefined) {
			checksumPayload[field] = value;
		}
	}

	const normalizedPayload = sortObjectKeys(checksumPayload);
	const serializedPayload = JSON.stringify(normalizedPayload);

	return await sha256(serializedPayload);
}
