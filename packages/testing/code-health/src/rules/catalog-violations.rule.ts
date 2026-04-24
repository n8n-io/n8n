import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';

import type { CodeHealthContext } from '../context.js';
import {
	findPackageJsonFiles,
	parsePackageJson,
	type PackageJsonInfo,
} from '../utils/package-json-scanner.js';
import { findInCatalog, parseCatalog, type CatalogData } from '../utils/workspace-parser.js';

interface DepUsage {
	pkg: string;
	version: string;
	file: string;
	line: number;
}

export class CatalogViolationsRule extends BaseRule<CodeHealthContext> {
	readonly id = 'catalog-violations';
	readonly name = 'Catalog Violations';
	readonly description =
		'Detect dependencies that should use pnpm catalog references instead of hardcoded versions';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir } = context;
		const options = this.getOptions();
		const workspaceFile = (options.workspaceFile as string) ?? 'pnpm-workspace.yaml';

		const catalogData = parseCatalog(rootDir, workspaceFile);
		const packageJsonFiles = await findPackageJsonFiles(rootDir);
		const packages = packageJsonFiles.map(parsePackageJson);

		return [
			...this.findHardcodedCatalogDeps(packages, catalogData),
			...this.findVersionMismatches(packages, catalogData),
		];
	}

	private findHardcodedCatalogDeps(
		packages: PackageJsonInfo[],
		catalogData: CatalogData,
	): Violation[] {
		const violations: Violation[] = [];

		for (const pkgInfo of packages) {
			for (const dep of pkgInfo.deps) {
				if (dep.usesCatalog || dep.version.startsWith('workspace:')) continue;

				const catalogMatch = findInCatalog(catalogData, dep.name);
				if (!catalogMatch.found) continue;

				const catalogRef = catalogMatch.catalogName
					? `"catalog:${catalogMatch.catalogName}"`
					: '"catalog:"';

				violations.push(
					this.createViolation(
						pkgInfo.filePath,
						dep.line,
						5,
						`${dep.name}@${dep.version} should use ${catalogRef} (exists in pnpm-workspace.yaml${catalogMatch.catalogName ? ` [${catalogMatch.catalogName}]` : ''})`,
						`Change to "${dep.name}": ${catalogRef}`,
					),
				);
			}
		}

		return violations;
	}

	private findVersionMismatches(
		packages: PackageJsonInfo[],
		catalogData: CatalogData,
	): Violation[] {
		const hardcodedVersions = new Map<string, DepUsage[]>();

		for (const pkgInfo of packages) {
			for (const dep of pkgInfo.deps) {
				if (dep.usesCatalog || dep.version.startsWith('workspace:')) continue;
				if (findInCatalog(catalogData, dep.name).found) continue;

				if (!hardcodedVersions.has(dep.name)) hardcodedVersions.set(dep.name, []);
				hardcodedVersions.get(dep.name)!.push({
					pkg: pkgInfo.packageName,
					version: dep.version,
					file: pkgInfo.filePath,
					line: dep.line,
				});
			}
		}

		const violations: Violation[] = [];

		for (const [depName, usages] of hardcodedVersions) {
			if (usages.length < 2) continue;

			const uniqueVersions = new Set(usages.map((u) => u.version));
			if (uniqueVersions.size <= 1) continue;

			for (const usage of usages) {
				violations.push(
					this.createViolation(
						usage.file,
						usage.line,
						5,
						`${depName} appears in ${usages.length} packages with ${uniqueVersions.size} different versions — add to pnpm-workspace.yaml catalog`,
						`Centralize ${depName} in pnpm-workspace.yaml catalog section`,
					),
				);
			}
		}

		return violations;
	}
}
