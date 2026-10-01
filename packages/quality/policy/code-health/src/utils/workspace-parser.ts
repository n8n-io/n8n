import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface CatalogData {
	default: Record<string, string>;
	named: Record<string, Record<string, string>>;
}

export function parseCatalog(rootDir: string, workspaceFile = 'pnpm-workspace.yaml'): CatalogData {
	const filePath = path.join(rootDir, workspaceFile);

	if (!fs.existsSync(filePath)) {
		throw new Error(`Workspace file not found: ${filePath}`);
	}

	const content = fs.readFileSync(filePath, 'utf-8');
	const workspace = parseYaml(content) as Record<string, unknown> | null;

	if (!workspace || typeof workspace !== 'object') {
		return { default: {}, named: {} };
	}

	const result: CatalogData = { default: {}, named: {} };

	if (workspace.catalog && typeof workspace.catalog === 'object') {
		result.default = workspace.catalog as Record<string, string>;
	}

	if (workspace.catalogs && typeof workspace.catalogs === 'object') {
		const catalogs = workspace.catalogs as Record<string, Record<string, string>>;
		for (const [name, deps] of Object.entries(catalogs)) {
			if (deps && typeof deps === 'object') {
				result.named[name] = deps;
			}
		}
	}

	return result;
}

export function findInCatalog(
	catalogData: CatalogData,
	depName: string,
): { found: boolean; catalogName?: string; version?: string } {
	if (depName in catalogData.default) {
		return { found: true, version: catalogData.default[depName] };
	}

	for (const [catalogName, deps] of Object.entries(catalogData.named)) {
		if (depName in deps) {
			return { found: true, catalogName, version: deps[depName] };
		}
	}

	return { found: false };
}
