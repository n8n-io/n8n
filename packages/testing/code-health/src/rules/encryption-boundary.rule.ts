import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import {
	findPackageJsonFiles,
	parsePackageJson,
	relativeDir,
} from '../utils/package-json-scanner.js';

/**
 * A package that depends on one of these can reach the raw cipher primitives
 * (`n8n-core`) or the deployment_key entity (`@n8n/db`), so the encryption
 * boundary lint rules must run there.
 */
const DEFAULT_TRIGGER_DEPENDENCIES = ['n8n-core', '@n8n/db'];

/** The rules `encryptionBoundaryConfig` enables, without the plugin prefix. */
const DEFAULT_GUARDED_RULES = [
	'no-legacy-cipher-methods',
	'no-misplaced-cipher-primitives',
	'no-deployment-key-delete',
	'no-encryption-guardrail-disable',
];

const BOUNDARY_CONFIG_PATH = 'packages/@n8n/eslint-config/src/configs/encryption-boundary.ts';

const CONFIG_FILENAMES = [
	'eslint.config.mjs',
	'eslint.config.js',
	'eslint.config.cjs',
	'eslint.config.ts',
];

/** `nodeConfig` composes `encryptionBoundaryConfig`, so either import brings the rules in. */
const BOUNDARY_IMPORT =
	/import\s*\{([^}]*)\}\s*from\s+['"]@n8n\/eslint-config\/(?:node|encryption-boundary)['"]/;
const BOUNDARY_EXPORTS = /^(nodeConfig|encryptionBoundaryConfig)(?:\s+as\s+(\w+))?$/;

/** A guarded rule configured to anything weaker than "error" in an ESLint config. */
const DOWNGRADE =
	/['"]n8n-local-rules\/([\w-]+)['"]\s*:\s*\[?\s*(['"](?:off|warn)['"]|0|1)(?![\w.])/;

/**
 * The guarded ESLint rules skip test files and migrations, so a directive
 * there hides nothing. Kept in step with the exemptions inside the rules.
 */
const SOURCE_GLOBS = ['**/*.{ts,js,mjs,cjs}'];
const SOURCE_IGNORE = [
	'**/node_modules/**',
	'**/dist/**',
	'**/*.test.ts',
	'**/*.spec.ts',
	'**/__tests__/**',
	'**/test/**',
	'**/migrations/**',
];

/**
 * An ESLint directive comment: a disable in any of its three forms, or an
 * inline configuration comment (`eslint rule: severity`). The captured form
 * must end right after its name, so `eslint-enable` and `eslint-env` do not
 * match. A quote right before the comment opener means directive text inside
 * a string literal (e.g. a code generator), not a directive.
 */
const DIRECTIVE =
	/(?<!['"`])(?:\/\/|\/\*)[ \t]*(eslint-disable(?:-next-line|-line)?|eslint)(?![\w-])(.*)$/;

function stringArrayOption(value: unknown, fallback: string[]): string[] {
	return Array.isArray(value) && value.every((entry): entry is string => typeof entry === 'string')
		? value
		: fallback;
}

/**
 * Second layer behind the encryption-boundary ESLint rules. ESLint reports
 * only where it is configured and cannot police its own directives, so this
 * rule verifies out of band that every package which can reach the cipher
 * primitives or the deployment_key entity (1) composes the boundary config,
 * (2) keeps its rules at "error", and (3) contains no directive that would
 * silence them in non-test code.
 */
export class EncryptionBoundaryRule extends BaseRule<CodeHealthContext> {
	readonly id = 'encryption-boundary';
	readonly name = 'Encryption Boundary Coverage';
	readonly description =
		'Packages that depend on n8n-core or @n8n/db must compose the encryption-boundary ESLint config, keep its rules at "error", and contain no ESLint directive that silences them.';
	readonly severity = 'error' as const;

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir } = context;
		const options = this.getOptions();
		const triggers = stringArrayOption(options.triggerDependencies, DEFAULT_TRIGGER_DEPENDENCIES);
		const guardedRules = stringArrayOption(options.guardedRules, DEFAULT_GUARDED_RULES);

		const violations: Violation[] = [];
		// Nested package directories would otherwise be scanned once per ancestor.
		const scannedFiles = new Set<string>();

		for (const packageJsonPath of await findPackageJsonFiles(rootDir)) {
			const info = parsePackageJson(packageJsonPath);
			const trigger = info.deps.find((dep) => triggers.includes(dep.name));
			if (!trigger) continue;

			const packageDir = path.dirname(packageJsonPath);
			violations.push(
				...this.checkConfig(rootDir, packageDir, packageJsonPath, trigger.name, guardedRules),
			);
			violations.push(...(await this.checkDirectives(packageDir, guardedRules, scannedFiles)));
		}

		return violations;
	}

	private checkConfig(
		rootDir: string,
		packageDir: string,
		packageJsonPath: string,
		trigger: string,
		guardedRules: string[],
	): Violation[] {
		const packageName = relativeDir(rootDir, packageJsonPath);
		const configPath = CONFIG_FILENAMES.map((name) => path.join(packageDir, name)).find(
			(candidate) => fs.existsSync(candidate),
		);

		if (!configPath) {
			return [
				this.createViolation(
					packageJsonPath,
					1,
					1,
					`${packageName} depends on ${trigger} but has no ESLint config, so the encryption boundary is not linted there.`,
					'Add an eslint.config.mjs that composes `encryptionBoundaryConfig` from @n8n/eslint-config/encryption-boundary (or `nodeConfig`).',
				),
			];
		}

		const text = fs.readFileSync(configPath, 'utf-8');
		const violations: Violation[] = [];

		if (!composesBoundary(text)) {
			violations.push(
				this.createViolation(
					configPath,
					1,
					1,
					`${packageName} depends on ${trigger} but its ESLint config does not compose the encryption boundary.`,
					"Import `encryptionBoundaryConfig` from '@n8n/eslint-config/encryption-boundary' (or use `nodeConfig`) and add it to the exported config.",
				),
			);
		}

		text.split('\n').forEach((line, index) => {
			const match = DOWNGRADE.exec(line);
			if (!match || !guardedRules.includes(match[1])) return;
			violations.push(
				this.createViolation(
					configPath,
					index + 1,
					match.index + 1,
					`The ESLint config sets \`n8n-local-rules/${match[1]}\` to ${match[2]}; the encryption guardrails must stay at "error".`,
					`Remove the override. Widen the boundary in ${BOUNDARY_CONFIG_PATH} instead.`,
				),
			);
		});

		return violations;
	}

	private async checkDirectives(
		packageDir: string,
		guardedRules: string[],
		scannedFiles: Set<string>,
	): Promise<Violation[]> {
		const files = await fg(SOURCE_GLOBS, {
			cwd: packageDir,
			absolute: true,
			ignore: SOURCE_IGNORE,
		});
		const violations: Violation[] = [];

		for (const file of files) {
			if (scannedFiles.has(file)) continue;
			scannedFiles.add(file);

			fs.readFileSync(file, 'utf-8')
				.split('\n')
				.forEach((line, index) => {
					const violation = this.checkDirective(file, line, index + 1, guardedRules);
					if (violation) violations.push(violation);
				});
		}

		return violations;
	}

	private checkDirective(
		file: string,
		line: string,
		lineNumber: number,
		guardedRules: string[],
	): Violation | undefined {
		const match = DIRECTIVE.exec(line);
		if (!match) return undefined;

		const [, form, rest] = match;
		const body = rest.split('*/')[0];
		const column = match.index + 1;

		if (form === 'eslint') {
			const rule = guardedRules.find((name) =>
				new RegExp(`(?:^|[\\s/'"])${name}(?![\\w-])`).test(body),
			);
			if (!rule) return undefined;
			return this.createViolation(
				file,
				lineNumber,
				column,
				`An inline ESLint configuration comment reconfigures the encryption guardrail \`${rule}\`.`,
				`Remove the comment. Widen the boundary in ${BOUNDARY_CONFIG_PATH} instead.`,
			);
		}

		// Only the comma-separated rule list counts; the free-text explanation
		// after `--` may mention a rule without disabling it.
		const ruleIds = body
			.split('--')[0]
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id !== '');

		if (ruleIds.length === 0) {
			return this.createViolation(
				file,
				lineNumber,
				column,
				`A bare \`${form}\` directive silences every lint rule in its range, including the encryption guardrails.`,
				'Name the specific rules you need to disable.',
			);
		}

		const rule = guardedRules.find((name) =>
			ruleIds.some((id) => id === name || id.endsWith(`/${name}`)),
		);
		if (!rule) return undefined;
		return this.createViolation(
			file,
			lineNumber,
			column,
			`\`${form}\` names the encryption guardrail \`${rule}\`.`,
			`Remove the directive. Widen the boundary in ${BOUNDARY_CONFIG_PATH} instead.`,
		);
	}
}

/** The boundary config (or `nodeConfig`, which contains it) is imported and used, not just imported. */
function composesBoundary(configText: string): boolean {
	const importMatch = BOUNDARY_IMPORT.exec(configText);
	if (!importMatch) return false;

	const localNames = importMatch[1]
		.split(',')
		.map((specifier) => BOUNDARY_EXPORTS.exec(specifier.trim()))
		.filter((specifier) => specifier !== null)
		.map((specifier) => specifier[2] ?? specifier[1]);

	return localNames.some(
		(local) => (configText.match(new RegExp(`\\b${local}\\b`, 'g')) ?? []).length > 1,
	);
}
