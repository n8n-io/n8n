import type { IConnections, INode, IPinData, IWorkflowSettings } from './interfaces';

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
 * Recursively sorts object keys alphabetically for consistent serialization.
 * Arrays keep their order; their elements are normalized recursively.
 */
function sortObjectKeys(value: unknown): unknown {
	if (value === null || typeof value !== 'object') return value;

	if (Array.isArray(value)) {
		return value.map((element) => sortObjectKeys(element));
	}

	const objectValue = value as Record<string, unknown>;
	const sortedKeys = Object.keys(objectValue).sort();

	const sortedObject: Record<string, unknown> = {};
	for (const key of sortedKeys) {
		sortedObject[key] = sortObjectKeys(objectValue[key]);
	}

	return sortedObject;
}

/**
 * Calculates SHA-256 checksum of workflow content fields for conflict detection.
 * Excludes: id, versionId, timestamps, staticData, relations.
 */
export async function calculateWorkflowChecksum(workflow: WorkflowSnapshot): Promise<string> {
	const checksumPayload: Record<string, unknown> = {};

	for (const field of CHECKSUM_FIELDS) {
		const value = workflow[field];
		if (value !== undefined) {
			checksumPayload[field] = value;
		}
	}

	const normalizedPayload = sortObjectKeys(checksumPayload);
	const serializedPayload = JSON.stringify(normalizedPayload);

	const data = new TextEncoder().encode(serializedPayload);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return arrayBufferToHex(hashBuffer);
}

function arrayBufferToHex(arrayBuffer: ArrayBuffer): string {
	const bytes = new Uint8Array(arrayBuffer);
	let hexString = '';

	for (let index = 0; index < bytes.length; index++) {
		hexString += bytes[index].toString(16).padStart(2, '0');
	}

	return hexString;
}
