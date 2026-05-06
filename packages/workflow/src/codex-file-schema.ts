/**
 * Canonical zod schemas for `.node.json` (codex) files.
 *
 * Two profiles are exported:
 *
 *  - `nodeCodexFileSchema` — base profile, covers the runtime surface of
 *    built-in n8n nodes. Allows `subcategories` (used by built-in nodes to
 *    influence editor placement).
 *  - `communityNodeCodexFileSchema` — derived from the base profile via
 *    `omit({ subcategories: true })`. The runtime ignores `subcategories` for
 *    community nodes (the backend overrides it for AI tools, see
 *    `community-node-types.service.ts:createAiTools`), so writing it gives
 *    community authors a false sense of control. The community profile makes
 *    that explicit.
 *
 * Both schemas are compiled to JSON Schema artifacts at build time by
 * `scripts/generate-codex-schemas.ts` and shipped in the published package
 * under `schemas/`. Community node authors can consume the JSON Schema via
 * JSDelivr for IDE intellisense (see README for details).
 *
 * Schema changes follow semver: adding a required field or tightening an
 * existing constraint is a breaking change and requires a major bump of
 * `n8n-workflow`.
 */

import { z } from 'zod';

/**
 * Regex enforcing the *shape* of the `node` field: an optional npm scope
 * followed by a package name, a dot, and a node type identifier.
 *
 *   n8n-nodes-base.httpRequest
 *   @n8n/n8n-nodes-langchain.lmChatOpenAi
 *   n8n-nodes-acme.myNode
 *
 * This is intentionally a shape check only. Cross-package validation
 * (matching the prefix against the consumer's `package.json` name) lives in
 * the eslint plugin (slice 2) and the runtime loader (slice 3).
 */
export const NODE_FIELD_REGEX = /^(@[a-z0-9-]+\/)?[a-z0-9-]+\.[a-zA-Z][a-zA-Z0-9]*$/;

const documentationLinkSchema = z
	.object({
		url: z.string().url().describe('Absolute URL of the documentation page.'),
	})
	.strict();

const resourcesSchema = z
	.object({
		credentialDocumentation: z
			.array(documentationLinkSchema)
			.optional()
			.describe('Links to credential setup documentation for this node.'),
		primaryDocumentation: z
			.array(documentationLinkSchema)
			.optional()
			.describe("Links to the node's main documentation."),
	})
	.strict()
	.describe("External resources linked from the node's editor entry.");

/**
 * Inline body shape shared between built-in and community profiles, and
 * between the file-level schema and the embedded `codex` property on a
 * node description.
 *
 * `CodexData` is derived from this schema (see {@link CodexData}).
 */
export const codexBodySchema = z
	.object({
		categories: z
			.array(z.string())
			.optional()
			.describe(
				"Top-level editor categories this node belongs to (e.g. 'Development', 'Communication').",
			),
		subcategories: z
			.record(z.string(), z.array(z.string()))
			.optional()
			.describe(
				'Subcategories under each category for finer-grained editor placement. Built-in profile only — community nodes should omit this; the runtime ignores it for them.',
			),
		resources: resourcesSchema.optional(),
		alias: z
			.array(z.string())
			.optional()
			.describe(
				"Search aliases that surface this node when users type related terms (e.g. 'pause' for the Wait node).",
			),
	})
	.strict();

/**
 * Full `.node.json` file schema for built-in n8n nodes. Extends the body
 * shape with the required envelope fields (`node`, `nodeVersion`,
 * `codexVersion`) and an optional `$schema` URL for IDE integration.
 */
export const nodeCodexFileSchema = codexBodySchema
	.extend({
		$schema: z
			.string()
			.url()
			.optional()
			.describe(
				'URL of the JSON Schema this codex file conforms to. Drives IDE autocompletion and validation; safe to omit.',
			),
		node: z
			.string()
			.regex(NODE_FIELD_REGEX)
			.describe(
				'Fully-qualified node identifier of the form `<package-name>.<nodeType>` (e.g. `n8n-nodes-base.httpRequest`, `@n8n/n8n-nodes-langchain.lmChatOpenAi`).',
			),
		nodeVersion: z
			.string()
			.describe(
				"Version of the node this codex describes, expressed as a string (e.g. '1.0', '2.1'). Distinct from the package's npm version.",
			),
		codexVersion: z
			.string()
			.describe(
				"Version of the codex format this file targets (e.g. '1.0'). Bumped only when the codex contract itself changes.",
			),
	})
	.strict();

/**
 * `.node.json` schema for community nodes. Identical to the base profile
 * but without `subcategories` — see module-level docs for the rationale.
 */
export const communityNodeCodexFileSchema = nodeCodexFileSchema.omit({
	subcategories: true,
});

/**
 * Inline body of a codex (used for both file-level and embedded usage).
 * Replaces the previously hand-written `CodexData` type so the schema is
 * the single source of truth.
 */
export type CodexData = z.infer<typeof codexBodySchema>;

/** Full `.node.json` payload for built-in n8n nodes. */
export type NodeCodexFile = z.infer<typeof nodeCodexFileSchema>;

/** `.node.json` payload for community nodes (no `subcategories`). */
export type CommunityNodeCodexFile = z.infer<typeof communityNodeCodexFileSchema>;
