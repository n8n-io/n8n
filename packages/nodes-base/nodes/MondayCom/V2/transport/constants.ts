/**
 * The monday.com API version this node is pinned to — the single source of
 * truth for every request (client header and credential test).
 *
 * Upgrade policy:
 * - monday releases quarterly (yyyy-01 / 04 / 07 / 10). Each version is
 *   "current" for one quarter, then supported in maintenance for ~1 year.
 * - Review this constant once per quarter against
 *   `query { versions { kind value } }` and bump, after running the full
 *   e2e suite against the new version.
 * - Product decision 2026-07-19 (PM): pin the 2026-10 release candidate as
 *   the default — it removes the deprecated User fields and carries the
 *   newer surfaces (run_prompt, use_template, user activity logs). Use
 *   2027-01 per-request only where an operation needs it; never pin "dev".
 *
 * Last reviewed: 2026-07-19 (verified against the live API).
 */
export const MONDAY_API_VERSION = '2026-10';

export const MONDAY_API_URL = 'https://api.monday.com/v2';

/** Dedicated endpoint for multipart file-upload mutations (add_file_to_column etc.). */
export const MONDAY_FILE_API_URL = 'https://api.monday.com/v2/file';

/**
 * Default record cap for every Get Many operation. Node-wide convention:
 * Limit lives inside the Options collection (never a required top-level
 * parameter) and this default applies unless the user sets it explicitly.
 */
export const DEFAULT_LIMIT = 50;

/**
 * The agents API (update_custom_agent and the custom_agents query) is
 * pre-release: it only exists in the "dev" API schema and is not part of
 * any dated version yet. Only the trigger's agent-connection lifecycle may
 * use this — never pin regular operations to dev.
 */
export const MONDAY_AGENTS_API_VERSION = 'dev';

/**
 * REST endpoint of the monday.com Platform Agent (Sidekick-style agent).
 * One user message per request (`prompt`), optional `contextId` for
 * conversation continuity; the reply comes back as `response`. The API
 * echoes `contextId` when sent — it never mints one. The node generates
 * a 32-char hex hash when Context ID is left empty so output always has a session key.
 * Auth = the same raw API token header as the GraphQL API (no Bearer).
 */
export const MONDAY_PLATFORM_AGENT_URL =
	'https://api.monday.com/platform-ai-gateway/platform-agent';

/** User-Agent on every authenticated monday.com API request from this node. */
export const MONDAY_USER_AGENT = 'n8n-monday';

/** Base request headers for monday.com API calls (merges with operation-specific headers). */
export function mondayRequestHeaders(extra: Record<string, string> = {}): Record<string, string> {
	return {
		'User-Agent': MONDAY_USER_AGENT,
		...extra,
	};
}
