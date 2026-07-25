#!/usr/bin/env node

/**
 * Guards against an npm-only startup break: workspace packages that compose zod
 * schemas across package boundaries must declare `zod` as a **peerDependency**,
 * not a regular dependency.
 *
 * `@n8n/api-types` builds a `z.discriminatedUnion` over schemas created in
 * `n8n-workflow`. That only works when both packages resolve the *same* physical
 * zod instance. In the pnpm monorepo the catalog forces one instance, so it always
 * holds locally. But on `npm install n8n`, if these packages each list `zod` in
 * `dependencies`, npm can install a separate nested copy per package (langchain
 * pins `zod@4` at the root, pushing our `zod@3` down), so the cross-package schema
 * composition resolves different instances and n8n crashes at boot. Declaring zod
 * as a peerDependency makes the consuming app provide a single shared instance.
 *
 * This exact regression shipped in 2.28.0 (#32386 moved zod peer→dependencies),
 * reverting the fix from #28604. This check keeps zod a peer so it can't recur.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Packages that share zod schema objects across the workspace and are runtime
// dependencies of the `n8n` cli. zod must be a peer here, never a plain dependency.
export const PACKAGES_REQUIRING_ZOD_PEER = [
	'packages/@n8n/api-types',
	'packages/workflow',
	'packages/core',
	'packages/@n8n/agents',
	'packages/@n8n/json-schema-to-zod',
];

/** Pure, testable core: return a problem string for a manifest, or null if OK. */
export function checkManifest(name, pkg) {
	const inDeps = pkg.dependencies?.zod;
	const inPeer = pkg.peerDependencies?.zod;
	if (inDeps) {
		return `${name}: "zod" is in "dependencies" (${inDeps}); it must be a "peerDependency" instead.`;
	}
	if (!inPeer) {
		return `${name}: "zod" is missing from "peerDependencies".`;
	}
	return null;
}

function main() {
	const problems = [];
	for (const rel of PACKAGES_REQUIRING_ZOD_PEER) {
		const file = join(root, rel, 'package.json');
		if (!existsSync(file)) continue; // package moved/renamed — don't hard-fail here
		const pkg = JSON.parse(readFileSync(file, 'utf8'));
		const problem = checkManifest(pkg.name ?? rel, pkg);
		if (problem) problems.push(problem);
	}

	if (problems.length > 0) {
		console.error('');
		console.error('ERROR: zod must stay a peerDependency in schema-composing packages.');
		console.error('');
		console.error('Moving zod into "dependencies" lets npm install duplicate zod copies, which');
		console.error('breaks cross-package schema composition and crashes n8n at startup on');
		console.error('`npm install n8n` (regressed once in 2.28.0 via #32386).');
		console.error('');
		for (const p of problems) console.error(`  - ${p}`);
		console.error('');
		console.error(
			'Move "zod" to "peerDependencies" (keep it in "devDependencies" for local builds).',
		);
		console.error('');
		process.exit(1);
	}

	console.log(
		`OK: zod is a peerDependency in all ${PACKAGES_REQUIRING_ZOD_PEER.length} schema-composing packages.`,
	);
}

// `--self-test` exercises the core logic without touching the workspace.
if (process.argv.includes('--self-test')) {
	const good = checkManifest('good', { peerDependencies: { zod: 'catalog:' } }) === null;
	const badDep = checkManifest('bad', { dependencies: { zod: 'catalog:' } }) !== null;
	const badMissing = checkManifest('missing', {}) !== null;
	if (good && badDep && badMissing) {
		console.log('self-test passed');
		process.exit(0);
	}
	console.error(`self-test FAILED (good=${good}, badDep=${badDep}, badMissing=${badMissing})`);
	process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
