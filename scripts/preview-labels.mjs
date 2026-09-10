// The `preview:*` label vocabulary, shared by both ends of a preview.
//
// `preview.mjs` runs on a laptop or a CI runner and turns the PR's labels into a
// slug list. `preview-serve.mjs` runs inside the box and turns that list into
// environment for the backend. Both import this file, so the two cannot drift.
//
// Only slugs cross the gap. A secret is read in the box, never passed in the
// `gh codespace ssh` command, which is a shell string and shows up in the box's
// process list.
export const PREVIEW_LABEL_PREFIX = 'preview:';
const PREFIX = PREVIEW_LABEL_PREFIX;

// The sandbox tenant. The default (1) is production self-hosted, which rejects a
// sandbox key. Matches packages/testing/containers/services/n8n.ts.
const LICENSE_TENANT_ID = '1001';
const LICENSE_KEY_SECRET = 'N8N_LICENSE_ACTIVATION_KEY';

/**
 * Slugs of the `preview:*` labels on a PR.
 *
 * The result is interpolated into a shell command, so the shape test is a safety
 * boundary rather than tidiness: anything that is not a plain lowercase slug is
 * dropped.
 *
 * @param {Array<{name?: string}> | undefined} labels `gh pr view --json labels`
 * @returns {string[]}
 */
export function previewSlugs(labels) {
	return (labels ?? [])
		.map((label) => label?.name)
		.filter((name) => typeof name === 'string' && name.startsWith(PREFIX))
		.map((name) => name.slice(PREFIX.length))
		.filter((slug) => /^[a-z0-9][a-z0-9-]*$/.test(slug));
}

/**
 * Environment for a slug list, plus the warnings a caller should print.
 *
 * @param {string[]} slugs
 * @param {(name: string) => string | undefined} readSecret
 * @returns {{ env: string[], warnings: string[] }} env as `KEY=VALUE` pairs
 */
export function envForSlugs(slugs, readSecret) {
	const env = [];
	const warnings = [];

	for (const slug of slugs) {
		switch (slug) {
			case 'enterprise': {
				const key = readSecret(LICENSE_KEY_SECRET);
				// Serve unlicensed rather than fail: a preview without enterprise
				// features is still worth reviewing.
				if (!key) {
					warnings.push(
						`preview:enterprise needs the ${LICENSE_KEY_SECRET} codespace secret, which this box does not have. Serving without a licence.`,
					);
					break;
				}
				env.push(`N8N_LICENSE_TENANT_ID=${LICENSE_TENANT_ID}`, `${LICENSE_KEY_SECRET}=${key}`);
				break;
			}
			case 'debug':
				env.push('N8N_LOG_LEVEL=debug');
				break;
			default:
				warnings.push(`Ignoring preview:${slug} — no such preview toggle.`);
		}
	}

	return { env, warnings };
}
