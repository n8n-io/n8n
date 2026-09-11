import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import {
	findPackageJsonFiles,
	parsePackageJson,
	relativeDir,
} from '../utils/package-json-scanner.js';
import {
	collectBinNames,
	findUnmentionedDeps,
	workspaceDepCandidates,
} from '../utils/workspace-dep-usage.js';

/** An entry of the `allowUnused` option: `<package dir>#<dependency name>`. */
const ALLOW_SEPARATOR = '#';

function stringArrayOption(value: unknown): string[] {
	return Array.isArray(value) && value.every((entry): entry is string => typeof entry === 'string')
		? value
		: [];
}

/**
 * The opposite direction of `import-x/no-extraneous-dependencies`: that rule
 * fails an import the manifest does not declare, this one fails a declaration no
 * file uses. A linter cannot answer it — ESLint and oxlint visit one file at a
 * time and never see the whole package — so the check lives here, where every
 * `package.json` is already read.
 *
 * An unused edge makes Turbo rebuild and re-test packages a change cannot
 * affect, and it misstates the architecture: the manifest claims a coupling the
 * code does not have.
 *
 * Scope is `workspace:*` entries only. Third-party dependencies need a resolver
 * for bundler aliases, plugin auto-loading and binaries, and are a second phase.
 */
export class UnusedWorkspaceDepsRule extends BaseRule<CodeHealthContext> {
	readonly id = 'unused-workspace-deps';
	readonly name = 'Unused Workspace Dependencies';
	readonly description =
		'Detect workspace:* dependencies that a package declares but no file in it uses';
	readonly severity = 'warning' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir } = context;
		const allowUnused = new Set(stringArrayOption(this.getOptions().allowUnused));

		const packageJsonFiles = await findPackageJsonFiles(rootDir);
		const packageDirs = packageJsonFiles.map((file) => path.dirname(file));
		const binNames = collectBinNames(packageJsonFiles);
		const violations: Violation[] = [];

		for (const packageJsonPath of packageJsonFiles) {
			const info = parsePackageJson(packageJsonPath);
			const candidates = workspaceDepCandidates(info);
			if (candidates.length === 0) continue;

			const packageDir = path.dirname(packageJsonPath);
			const packagePath = relativeDir(rootDir, packageJsonPath);
			const checked = candidates.filter(
				(dep) => !allowUnused.has(`${packagePath}${ALLOW_SEPARATOR}${dep.name}`),
			);
			if (checked.length === 0) continue;

			const unused = new Set(
				await findUnmentionedDeps(
					packageDir,
					checked.map((dep) => ({ name: dep.name, aliases: binNames.get(dep.name) ?? [] })),
					nestedPackageDirs(packageDir, packageDirs),
				),
			);

			for (const dep of checked) {
				if (!unused.has(dep.name)) continue;
				violations.push(
					this.createViolation(
						packageJsonPath,
						dep.line,
						5,
						`"${dep.name}" is declared in ${dep.section} of ${packagePath} but no file in the package mentions it.`,
						`Remove "${dep.name}" from ${dep.section} and run "pnpm install". If the edge only orders the Turbo build, add "${packagePath}${ALLOW_SEPARATOR}${dep.name}" to the rule's allowUnused option instead.`,
					),
				);
			}
		}

		return violations;
	}
}

/** Workspace packages inside `packageDir` — their files answer for them, not for the parent. */
function nestedPackageDirs(packageDir: string, allPackageDirs: string[]): string[] {
	return allPackageDirs.filter(
		(dir) => dir !== packageDir && dir.startsWith(`${packageDir}${path.sep}`),
	);
}
