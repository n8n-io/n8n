import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';

import type { CodeHealthContext } from '../context.js';
import {
	CURATED_LIBS,
	FRONTEND_PATH_PREFIXES,
	HOST_PACKAGES,
	PEER_LIBS,
} from '../single-instance/libs.js';
import {
	findPackageJsonFiles,
	parsePackageJson,
	relativeDir,
} from '../utils/package-json-scanner.js';

// Sections that get installed at runtime — a curated lib here can nest a second physical copy.
const RUNTIME_SECTIONS = new Set(['dependencies', 'optionalDependencies']);

/**
 * A single-instance-sensitive library must be a `peerDependency` in non-host, non-frontend
 * packages — a plain `dependency` looks fine under the pnpm catalog but lets `npm install` nest a
 * second physical copy, breaking cross-package composition / `instanceof` at runtime.
 *
 * `catalog-violations` forces curated libs to `catalog:` in every section but `peerDependencies`;
 * this rule covers what it skips — the peer shape, plus pinning curated peers via `catalog:`.
 * `reflect-metadata` is pin-only (excluded from the peer rule). Report-first via the baseline.
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
			if (this.isExempt(pkg.packageName, relativeDir(rootDir, file))) continue;

			for (const dep of pkg.deps) {
				if (PEER_LIBS.includes(dep.name) && RUNTIME_SECTIONS.has(dep.section)) {
					violations.push(
						this.createViolation(
							file,
							dep.line,
							5,
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
							5,
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
