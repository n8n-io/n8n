import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Project, ScriptKind, SyntaxKind } from 'ts-morph';
import type { Node, ObjectLiteralExpression } from 'ts-morph';

import type { CodeHealthContext } from '../context.js';
import { findPackageJsonFiles, relativeDir } from '../utils/package-json-scanner.js';

const CONFIG_FILENAMES = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs'];

const LAYERS = ['base', 'backend', 'frontend', 'nodes'];
const LAYER_IMPORT = /^@n8n\/eslint-config\/([a-z-]+)$/;

/** Retired export paths, replaced by the four layers. */
const REMOVED_SUBPATHS = new Set(['node', 'encryption-boundary']);

/**
 * A `files` glob that covers effectively the whole package, so a block scoped to
 * it is a package-wide decision wearing a scope.
 */
const PACKAGE_WIDE_GLOB =
	/^\.?\/?(?:\*\*|\*\*\/\*|src\/\*\*|src\/\*\*\/\*)(?:\.[cm]?[jt]sx?|\.vue)?$/;

/** A glob that names test material, where relaxations are expected. */
const TEST_GLOB = /(^|\/)(?:test|tests|__test__|__tests__)(\/|$)|\.(?:test|spec|cy|stories)\./;

const WEAK_SEVERITY = new Set(['off', 'warn', '0', '1']);

/**
 * Keeps the ESLint setup readable by keeping the decisions in one place.
 *
 * The repo used to carry a rule table in each of 72 package configs, which is
 * how it ended up with the same override written 35 times and four rules
 * silently shadowed by a duplicate key. The four shared layers hold the policy
 * now, so a package config may pick a layer and scope exceptions to paths, but
 * it may not quietly re-decide a rule for its whole tree.
 *
 * Allowed in a package config:
 * - exactly one shared layer
 * - `ignores`, and additive plugin configs
 * - any severity inside a block with a real `files` scope (that is a ratchet,
 *   and it says which paths it covers)
 * - a package-wide block that only raises rules to `error`
 *
 * Reported: a package-wide `off`/`warn`, a severity that is not a literal (it
 * cannot be read from the config or translated to another linter), and any
 * import of a retired subpath. Existing debt lives in the baseline, which only
 * shrinks.
 */
export class LintConfigLayeringRule extends BaseRule<CodeHealthContext> {
	readonly id = 'lint-config-layering';
	readonly name = 'Lint Config Layering';
	readonly description =
		'Package ESLint configs must extend one shared layer from @n8n/eslint-config and scope every relaxation to a path, so rule policy stays in the shared layers.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir } = context;
		const options = this.getOptions();
		const exempt = Array.isArray(options.exempt) ? (options.exempt as string[]) : [];

		const violations: Violation[] = [];
		const seen = new Set<string>();

		for (const packageJsonPath of await findPackageJsonFiles(rootDir)) {
			const packageDir = path.dirname(packageJsonPath);
			const rel = relativeDir(rootDir, packageJsonPath);
			if (exempt.some((entry) => rel === entry || rel.startsWith(`${entry}/`))) continue;

			const configPath = CONFIG_FILENAMES.map((name) => path.join(packageDir, name)).find((p) =>
				fs.existsSync(p),
			);
			if (!configPath || seen.has(configPath)) continue;
			seen.add(configPath);

			violations.push(...this.checkConfig(configPath, rel));
		}

		return violations;
	}

	private checkConfig(configPath: string, packageName: string): Violation[] {
		const text = fs.readFileSync(configPath, 'utf-8');
		const source = new Project({
			useInMemoryFileSystem: true,
			compilerOptions: { allowJs: true },
		}).createSourceFile(configPath, text, { scriptKind: ScriptKind.JS });

		const violations: Violation[] = [];
		const at = (node: Node) => {
			const { line, column } = source.getLineAndColumnAtPos(node.getStart());
			return { line, column };
		};

		// 1. exactly one layer, and no retired subpath
		const layerImports: string[] = [];
		for (const declaration of source.getImportDeclarations()) {
			const specifier = declaration.getModuleSpecifierValue();
			const match = LAYER_IMPORT.exec(specifier);
			if (!match) continue;
			const subpath = match[1];
			if (REMOVED_SUBPATHS.has(subpath)) {
				const { line, column } = at(declaration);
				violations.push(
					this.createViolation(
						configPath,
						line,
						column,
						`${packageName} imports '@n8n/eslint-config/${subpath}', which no longer exists.`,
						'Use one of the four layers: base, backend, frontend or nodes. The boundary configs are part of backendConfig.',
					),
				);
				continue;
			}
			if (LAYERS.includes(subpath)) layerImports.push(subpath);
		}

		if (layerImports.length === 0) {
			violations.push(
				this.createViolation(
					configPath,
					1,
					1,
					`${packageName} does not extend a shared ESLint layer.`,
					'Import baseConfig, backendConfig, frontendConfig or nodesConfig from @n8n/eslint-config and pass it to defineConfig.',
				),
			);
		} else if (layerImports.length > 1) {
			violations.push(
				this.createViolation(
					configPath,
					1,
					1,
					`${packageName} extends more than one shared layer (${layerImports.join(', ')}).`,
					'Pick the single layer that matches the package. The backend layer already contains the base layer, and the nodes layer contains the backend layer.',
				),
			);
		}

		// 2. every `rules` block: package-wide blocks may only raise to error
		for (const rulesProperty of source.getDescendantsOfKind(SyntaxKind.PropertyAssignment)) {
			if (rulesProperty.getName().replace(/['"]/g, '') !== 'rules') continue;
			const rulesObject = rulesProperty.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
			if (!rulesObject) continue;

			const owner = rulesProperty.getParentIfKind(SyntaxKind.ObjectLiteralExpression);
			if (!owner) continue;

			for (const entry of rulesObject.getProperties()) {
				if (!entry.isKind(SyntaxKind.PropertyAssignment)) continue;
				const ruleId = entry.getName().replace(/['"]/g, '');
				const severity = readSeverity(entry.getInitializer());

				if (severity === undefined) {
					const { line, column } = at(entry);
					violations.push(
						this.createViolation(
							configPath,
							line,
							column,
							`${packageName} sets '${ruleId}' to a severity that is not a literal.`,
							'Use a literal severity. A severity computed from the environment makes the config resolve differently per machine and cannot be translated to another linter.',
						),
					);
					continue;
				}

				if (!WEAK_SEVERITY.has(severity)) continue;
				if (isScopedToPaths(owner)) continue;

				const { line, column } = at(entry);
				violations.push(
					this.createViolation(
						configPath,
						line,
						column,
						`${packageName} turns '${ruleId}' down to '${severity}' for the whole package.`,
						'Scope it to the paths that need it with `files`, or retire the rule in the shared layer if the whole repo has stopped enforcing it. Under `--quiet` a warning enforces nothing.',
					),
				);
			}
		}

		return violations;
	}
}

/** The literal severity of a rule entry, or undefined when it is computed. */
function readSeverity(initializer: Node | undefined): string | undefined {
	if (!initializer) return undefined;
	if (initializer.isKind(SyntaxKind.StringLiteral)) return initializer.getLiteralValue();
	if (initializer.isKind(SyntaxKind.NumericLiteral)) return initializer.getText();
	if (initializer.isKind(SyntaxKind.ArrayLiteralExpression)) {
		return readSeverity(initializer.getElements()[0]);
	}
	return undefined;
}

/** True when the block names paths narrower than the package itself. */
function isScopedToPaths(owner: ObjectLiteralExpression): boolean {
	const filesProperty = owner.getProperty('files');
	if (!filesProperty?.isKind(SyntaxKind.PropertyAssignment)) return false;
	const array = filesProperty.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
	if (!array) return false;

	const globs = array
		.getElements()
		.filter((element) => element.isKind(SyntaxKind.StringLiteral))
		.map((element) => element.getLiteralValue());
	if (globs.length === 0) return false;

	// test globs always count as a scope; otherwise at least one glob must be
	// narrower than the whole package
	return globs.some((glob) => TEST_GLOB.test(glob) || !PACKAGE_WIDE_GLOB.test(glob));
}
