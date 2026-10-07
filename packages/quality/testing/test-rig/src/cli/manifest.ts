import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { z } from 'zod';

/** Where the specs and their manifest live, relative to this package. */
export const PLAYWRIGHT_DIR = resolve(__dirname, '..', '..', '..', 'playwright');
export const SPEC_DIR = join('tests', 'infrastructure', 'test-rig');
export const MANIFEST_PATH = join(PLAYWRIGHT_DIR, SPEC_DIR, 'scenarios.json');

const image = z
	.string()
	.regex(
		/^[\w./-]+\/n8n:[\w.-]+$/,
		'an n8nio/n8n:<tag> style image, so the runners image can be derived',
	);

export const scenarioSchema = z
	.object({
		/** Linear issue the scenario reproduces. */
		issue: z.string().regex(/^[A-Z]+-\d+$/),
		spec: z.string().regex(/\.spec\.ts$/),
		/** Image that shows the bug; null for a check with no before. */
		before: image.nullable(),
		/** Image with the fix; null while no fix exists. */
		after: image.nullable(),
		/** Git ref to build the after image from when it is not a released tag. */
		afterRef: z.string().optional(),
		env: z.record(z.string().regex(/^TEST_RIG_[A-Z_]+$/), z.string()).optional(),
	})
	.strict();

export const manifestSchema = z.record(z.string().regex(/^[a-z0-9-]+$/), scenarioSchema);

export type Manifest = z.infer<typeof manifestSchema>;

/** Reads and validates the manifest, and checks that every spec file exists. */
export function loadManifest(
	path = MANIFEST_PATH,
	specDir = join(PLAYWRIGHT_DIR, SPEC_DIR),
): Manifest {
	const manifest = manifestSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
	for (const [name, scenario] of Object.entries(manifest)) {
		if (!existsSync(join(specDir, scenario.spec)))
			throw new Error(`${name}: spec ${scenario.spec} not found`);
	}
	return manifest;
}

/** The runners image that matches an n8n image. */
export const runnersImage = (n8nImage: string) => n8nImage.replace(/\/n8n:/, '/runners:');
