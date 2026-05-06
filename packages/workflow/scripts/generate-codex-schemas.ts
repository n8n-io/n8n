/**
 * Build-time generator: compiles the canonical zod schemas for `.node.json`
 * (codex) files into JSON Schema artifacts shipped with the package.
 *
 * Outputs:
 *   schemas/node-codex-file.schema.json
 *   schemas/community-node-codex-file.schema.json
 *
 * Drift enforcement is intrinsic to this script (no separate CI step
 * required): if regenerating produces output that differs from the
 * committed file, the new content is written so the contributor sees the
 * change in `git status`, and the script exits non-zero. The build of
 * `n8n-workflow` therefore fails whenever the zod source has changed but
 * the JSON Schema artifacts weren't regenerated and committed.
 *
 * To regenerate locally, run `pnpm --filter n8n-workflow generate-schemas`
 * (or the parent `pnpm --filter n8n-workflow build`), commit the updated
 * files, and re-run.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { zodToJsonSchema } from 'zod-to-json-schema';

import { communityNodeCodexFileSchema, nodeCodexFileSchema } from '../src/codex-file-schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasDir = resolve(__dirname, '..', 'schemas');

/**
 * Base URL used for the generated schemas' `$id` field. Points at the
 * canonical jsDelivr-served path of the latest published version of
 * `n8n-workflow`. Authors who need reproducible pinning can reference
 * the same file under `n8n-workflow@<exact-version>` instead — see
 * `packages/workflow/README.md`.
 */
const SCHEMA_ID_BASE_URL = 'https://cdn.jsdelivr.net/npm/n8n-workflow@latest/schemas';

type Target = {
	filename: string;
	name: string;
	schema: Parameters<typeof zodToJsonSchema>[0];
	description: string;
};

const targets: Target[] = [
	{
		filename: 'node-codex-file.schema.json',
		name: 'NodeCodexFile',
		schema: nodeCodexFileSchema,
		description:
			'Canonical schema for `.node.json` (codex) files of built-in n8n nodes. Generated from `nodeCodexFileSchema` in `n8n-workflow`.',
	},
	{
		filename: 'community-node-codex-file.schema.json',
		name: 'CommunityNodeCodexFile',
		schema: communityNodeCodexFileSchema,
		description:
			'Canonical schema for `.node.json` (codex) files of community nodes. Generated from `communityNodeCodexFileSchema` in `n8n-workflow`.',
	},
];

async function main() {
	await mkdir(schemasDir, { recursive: true });

	const drifted: string[] = [];

	for (const target of targets) {
		const jsonSchema = zodToJsonSchema(target.schema, {
			name: target.name,
			$refStrategy: 'none',
		}) as Record<string, unknown>;

		jsonSchema.$id = `${SCHEMA_ID_BASE_URL}/${target.filename}`;
		jsonSchema.description = target.description;

		// Stable, formatted output so the on-disk comparison below is
		// byte-meaningful across machines.
		const serialised = JSON.stringify(jsonSchema, null, '\t') + '\n';
		const outPath = resolve(schemasDir, target.filename);

		const previous = existsSync(outPath) ? await readFile(outPath, 'utf8') : null;
		if (previous === serialised) continue;

		await writeFile(outPath, serialised, 'utf8');

		if (previous === null) {
			// First-time generation (e.g. fresh `schemas/` dir) — not drift.
			// eslint-disable-next-line no-console
			console.log(`Wrote ${outPath}`);
		} else {
			drifted.push(target.filename);
		}
	}

	if (drifted.length > 0) {
		// eslint-disable-next-line no-console
		console.error(
			[
				'',
				'❌ Codex JSON Schema artifacts are out of date:',
				...drifted.map((f) => `   - packages/workflow/schemas/${f}`),
				'',
				'The files have been regenerated from the zod source in',
				'`packages/workflow/src/codex-file-schema.ts`. Commit the updated',
				'schemas and re-run the build.',
				'',
			].join('\n'),
		);
		process.exit(1);
	}
}

void main().catch((error: unknown) => {
	// eslint-disable-next-line no-console
	console.error(error);
	process.exit(1);
});
