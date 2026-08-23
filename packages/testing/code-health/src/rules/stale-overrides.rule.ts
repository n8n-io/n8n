import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import {
	scanDeclaredRanges,
	type DeclaredRangesIndex,
} from '../utils/node-modules-deps-scanner.js';
import {
	isCatalogTarget,
	isEmptyPackageTarget,
	parseOverrides,
	type ParsedOverride,
} from '../utils/overrides-parser.js';
import { parsePnpmLock, type LockData } from '../utils/pnpm-lock-parser.js';
import { findInCatalog, parseCatalog, type CatalogData } from '../utils/workspace-parser.js';

export class StaleOverridesRule extends BaseRule<CodeHealthContext> {
	readonly id = 'stale-overrides';
	readonly name = 'Stale Overrides';
	readonly description =
		'Detect pnpm.overrides that duplicate catalog entries, target packages absent from the dep graph, or are redundant against current resolution';
	readonly severity = 'warning' as const;

	analyze(context: CodeHealthContext): Violation[] {
		const { rootDir } = context;
		const options = this.getOptions();
		const workspaceFile = (options.workspaceFile as string) ?? 'pnpm-workspace.yaml';
		const lockFile = (options.lockFile as string) ?? 'pnpm-lock.yaml';

		const overrides = parseOverrides(rootDir);
		if (overrides.length === 0) return [];

		const catalogData = parseCatalog(rootDir, workspaceFile);
		const lockData = parsePnpmLock(rootDir, lockFile);
		const declaredRanges = scanDeclaredRanges(rootDir);
		const filePath = path.join(rootDir, 'package.json');

		return [
			...this.findCatalogDuplicates(overrides, catalogData, filePath),
			...this.findOrphans(overrides, lockData, filePath),
			...this.findRedundantPins(overrides, lockData, declaredRanges, filePath),
		];
	}

	private findCatalogDuplicates(
		overrides: ParsedOverride[],
		catalogData: CatalogData,
		filePath: string,
	): Violation[] {
		const violations: Violation[] = [];

		for (const ov of overrides) {
			if (isCatalogTarget(ov.targetVersion)) continue;
			if (isEmptyPackageTarget(ov.targetVersion)) continue;

			const match = findInCatalog(catalogData, ov.packageName);
			if (!match.found) continue;

			const catalogRef = match.catalogName ? `"catalog:${match.catalogName}"` : '"catalog:"';
			violations.push(
				this.createViolation(
					filePath,
					ov.line,
					7,
					`Override "${ov.rawKey}" duplicates a catalog entry for ${ov.packageName} — set the override to ${catalogRef} or remove it`,
					`Change override target to ${catalogRef}, or remove the override and rely on the catalog`,
				),
			);
		}

		return violations;
	}

	private findOrphans(
		overrides: ParsedOverride[],
		lockData: LockData,
		filePath: string,
	): Violation[] {
		const violations: Violation[] = [];

		for (const ov of overrides) {
			if (isEmptyPackageTarget(ov.targetVersion)) continue;

			if (ov.parent && !lockData.resolvedVersions.has(ov.parent)) {
				violations.push(
					this.createViolation(
						filePath,
						ov.line,
						7,
						`Override "${ov.rawKey}" targets descendants of ${ov.parent}, but ${ov.parent} is not in the dependency graph`,
						'Remove the override — its parent package is no longer installed',
					),
				);
				continue;
			}

			if (!lockData.resolvedVersions.has(ov.packageName)) {
				violations.push(
					this.createViolation(
						filePath,
						ov.line,
						7,
						`Override "${ov.rawKey}" targets ${ov.packageName}, which is not in the dependency graph`,
						'Remove the override — the package is no longer installed',
					),
				);
			}
		}

		return violations;
	}

	private findRedundantPins(
		overrides: ParsedOverride[],
		lockData: LockData,
		declaredRanges: DeclaredRangesIndex,
		filePath: string,
	): Violation[] {
		if (!declaredRanges.available) return [];

		const violations: Violation[] = [];

		for (const ov of overrides) {
			if (isCatalogTarget(ov.targetVersion)) continue;
			if (isEmptyPackageTarget(ov.targetVersion)) continue;
			if (ov.parent) continue;
			if (ov.versionSelector) continue;
			if (hasSemverOperator(ov.targetVersion)) continue;

			const resolved = lockData.resolvedVersions.get(ov.packageName);
			if (!resolved || resolved.size !== 1) continue;

			const onlyResolved = [...resolved][0];
			if (onlyResolved !== ov.targetVersion) continue;

			const ranges = lockData.requestedRanges.get(ov.packageName);
			if (!ranges || ranges.size === 0) continue;
			const allMatchTarget = [...ranges].every((r) => r === ov.targetVersion);
			if (!allMatchTarget) continue;

			const realRanges = declaredRanges.rangesByName.get(ov.packageName);
			if (realRanges && [...realRanges].some((r) => r !== ov.targetVersion)) continue;

			violations.push(
				this.createViolation(
					filePath,
					ov.line,
					7,
					`Override "${ov.rawKey}" pins ${ov.packageName}@${ov.targetVersion}, and every declared range in node_modules matches that exact version — the override appears redundant`,
					'Consider removing the override and confirming via "pnpm install --lockfile-only" that pnpm-lock.yaml is unchanged',
				),
			);
		}

		return violations;
	}
}

function hasSemverOperator(version: string): boolean {
	return /^[\^~><=]|\s-\s|\|\|/.test(version) || version.includes('*') || version.includes('x');
}
