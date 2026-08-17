import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';

import type { CodeHealthContext } from '../context.js';
import {
	CURATED_LIBS,
	FRONTEND_PATH_PREFIXES,
	HOST_PACKAGES,
	PEER_LIBS,
} from '../single-instance/libs.js';
import { REQUIRED_CURATED_PEERS } from '../single-instance/required-peers.js';
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
		// packageName -> { file, curated libs it declares as peers } — feeds the dropped-peer pass.
		const declaredPeers = new Map<string, { file: string; libs: Set<string> }>();

		for (const file of files) {
			const pkg = parsePackageJson(file);
			declaredPeers.set(pkg.packageName, {
				file,
				libs: new Set(
					pkg.deps
						.filter((d) => d.section === 'peerDependencies' && CURATED_LIBS.includes(d.name))
						.map((d) => d.name),
				),
			});

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

		// Dropped-peer regression guard: a package that a prior snapshot recorded as declaring a
		// curated peer must keep declaring it. Only checked for packages present in this scan — an
		// absent package imports nothing here, so it carries no single-instance risk.
		for (const [lib, requiredPackages] of Object.entries(REQUIRED_CURATED_PEERS)) {
			for (const packageName of requiredPackages) {
				const declared = declaredPeers.get(packageName);
				if (!declared || declared.libs.has(lib)) continue;
				violations.push(
					this.createViolation(
						declared.file,
						1,
						1,
						`"${packageName}" no longer declares "${lib}" as a peerDependency; it is a required single-instance peer, and dropping it lets consumers resolve a second physical copy at runtime.`,
						`Restore the "${lib}" peerDependency (with "catalog:"), or — if the removal is intentional — update REQUIRED_CURATED_PEERS in packages/testing/code-health/src/single-instance/required-peers.ts.`,
					),
				);
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
