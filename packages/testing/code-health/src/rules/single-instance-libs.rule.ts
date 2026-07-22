import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import {
	CURATED_LIBS,
	FRONTEND_PATH_PREFIXES,
	HOST_PACKAGES,
	PEER_LIBS,
} from '../single-instance/libs.js';
import { findPackageJsonFiles, parsePackageJson } from '../utils/package-json-scanner.js';

// Sections that get installed at runtime — a curated lib here can nest a second physical copy.
const RUNTIME_SECTIONS = new Set(['dependencies', 'optionalDependencies']);

/**
 * Single-instance-sensitive libraries composed across package boundaries must be a
 * `peerDependency` (pinned via `catalog:`) in every non-host, non-frontend workspace package
 * that uses them — never a plain/optional `dependency`. In the pnpm monorepo the catalog forces
 * one instance so `dependencies` looks fine locally, but on `npm install n8n` a plain dependency
 * lets npm install a second nested copy, which breaks cross-package composition / `instanceof`
 * at runtime (a boot crash or silent misbehaviour). This has shipped before, when a package moved
 * zod from a peer to a dependency.
 *
 * `catalog-violations` already forces curated libs in dependencies/devDependencies to `catalog:`
 * but deliberately skips `peerDependencies`; this rule covers what it doesn't — the peer SHAPE,
 * plus curated peers being pinned via `catalog:`. `reflect-metadata` is pin-only (excluded from
 * the peer rule). Report-first via the shared `.code-health-baseline.json`.
 */
export class SingleInstanceLibsRule extends BaseRule<CodeHealthContext> {
	readonly id = 'single-instance-libs';
	readonly name = 'Single-instance Libraries';
	readonly description =
		'Single-instance-sensitive libraries must be peerDependencies (via catalog:), not plain/optional dependencies, in non-host packages';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir } = context;
		const files = await findPackageJsonFiles(rootDir);
		const violations: Violation[] = [];

		for (const file of files) {
			const pkg = parsePackageJson(file);
			const relDir = path.relative(rootDir, path.dirname(file)).split(path.sep).join('/');
			if (this.isExempt(pkg.packageName, relDir)) continue;

			for (const dep of pkg.deps) {
				if (PEER_LIBS.includes(dep.name) && RUNTIME_SECTIONS.has(dep.section)) {
					violations.push(
						this.createViolation(
							file,
							dep.line,
							1,
							`"${dep.name}" is a runtime dependency of "${pkg.packageName}"; it must be a peerDependency.`,
							'Move it to peerDependencies with "catalog:", and keep it in devDependencies with "catalog:" for local builds.',
						),
					);
				}

				if (
					CURATED_LIBS.includes(dep.name) &&
					dep.section === 'peerDependencies' &&
					!dep.usesCatalog
				) {
					violations.push(
						this.createViolation(
							file,
							dep.line,
							1,
							`"${dep.name}" peerDependency in "${pkg.packageName}" must use "catalog:".`,
							'Change the peerDependencies entry to "catalog:" so the published range is a single pinned version.',
						),
					);
				}
			}
		}

		return violations;
	}

	private isExempt(packageName: string, relDir: string): boolean {
		return (
			HOST_PACKAGES.includes(packageName) ||
			FRONTEND_PATH_PREFIXES.some((prefix) => relDir.startsWith(prefix))
		);
	}
}
