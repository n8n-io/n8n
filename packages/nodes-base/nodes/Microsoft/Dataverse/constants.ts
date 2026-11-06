/**
 * Shared constants for the Microsoft Dataverse node.
 *
 * Keeping these in one place means a future Web API version bump (or
 * scope-policy change) touches a single file instead of scattered string
 * literals across credentials, GenericFunctions, and operation modules.
 */

/** Web API base path. Update here when Microsoft ships a new version. */
export const DATAVERSE_API_PATH = '/api/data/v9.2';

/**
 * Product token for the `User-Agent` sent on every Dataverse Web API request.
 * A descriptive agent string lets Microsoft correlate traffic to this node in
 * support/telemetry scenarios.
 */
export const USER_AGENT_PREFIX = 'n8n-nodes-base.microsoftDataverse';

/**
 * Build the `User-Agent` including the node's version so requests are
 * attributable to a specific node version (e.g. `n8n-nodes-base.microsoftDataverse/1.0`).
 * Pass `this.getNode().typeVersion` from the execution/load-options context.
 * A whole-number version is normalized to include a minor (`1` -> `1.0`).
 */
export function buildUserAgent(version: number | string): string {
	const normalized = Number.isInteger(Number(version)) ? `${Number(version)}.0` : `${version}`;
	return `${USER_AGENT_PREFIX}/${normalized}`;
}
