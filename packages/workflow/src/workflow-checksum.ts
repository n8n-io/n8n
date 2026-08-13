import jsSHA from 'jssha';

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
 * `meta` fields that are derived bookkeeping written server-side (not user
 * edits) and therefore excluded from conflict detection. Hashing them would
 * invalidate every open editor's expected checksum the moment they are
 * (re)generated, tripping the "workflow was changed by someone else" modal.
 */
const CHECKSUM_EXEMPT_META_FIELDS: ReadonlySet<string> = new Set(['aiOverview']);

/**
 * Strip checksum-exempt fields from `meta`. A meta object left empty by the
 * strip normalizes to `undefined` so it hashes identically to an absent meta.
 */
function normalizeMetaForChecksum(meta: unknown): unknown {
	if (!isObject(meta)) return meta;
	const entries = Object.entries(meta).filter(([key]) => !CHECKSUM_EXEMPT_META_FIELDS.has(key));
	if (entries.length === 0) return undefined;
	return Object.fromEntries(entries);
}

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
 *
 * Uses WebCrypto when available (e.g. browser in secure context), and falls back to a pure-JS SHA-256
 * implementation to also work in environments where WebCrypto is unavailable (e.g. HTTP/insecure contexts).
 */
export async function calculateWorkflowChecksum(workflow: WorkflowSnapshot): Promise<string> {
	const checksumPayload: Record<string, unknown> = {};

	for (const field of WORKFLOW_CHECKSUM_FIELDS) {
		const value = field === 'meta' ? normalizeMetaForChecksum(workflow[field]) : workflow[field];
		if (value !== undefined) {
			checksumPayload[field] = value;
		}
	}

	const normalizedPayload = sortObjectKeys(checksumPayload);
	const serializedPayload = JSON.stringify(normalizedPayload);

	const subtle = globalThis.crypto?.subtle;
	if (subtle) {
		const data = new TextEncoder().encode(serializedPayload);
		const hashBuffer = await subtle.digest('SHA-256', data);
		return arrayBufferToHex(hashBuffer);
	}

	const shaObj = new jsSHA('SHA-256', 'TEXT', { encoding: 'UTF8' });
	shaObj.update(serializedPayload);
	return shaObj.getHash('HEX').toLowerCase();
}

function arrayBufferToHex(arrayBuffer: ArrayBuffer): string {
	const bytes = new Uint8Array(arrayBuffer);
	let hexString = '';

	for (let index = 0; index < bytes.length; index++) {
		hexString += bytes[index].toString(16).padStart(2, '0');
	}

	return hexString;
}
