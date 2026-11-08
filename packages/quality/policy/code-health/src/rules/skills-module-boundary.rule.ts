import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import {
	CLI_PATH,
	MODULES_PATH,
	entryPointOf,
	importReferences,
	isWithin,
	loadCliFiles,
	resolveLocalImport,
} from '../utils/cli-imports.js';

/** What code outside the skills module may import from it. `''` is `@/modules/skills`. */
const PUBLIC_ENTRY_POINTS = new Set(['']);
const TEST_ENTRY_POINTS = new Set(['', 'testing']);

/**
 * What the skills module may import from the rest of cli. The list only shrinks, so the module
 * can move into its own package.
 */
const CLI_ALLOWLIST = new Set(['posthog', 'telemetry', 'permissions.ee/check-access']);

const ENTRY_SUGGESTION =
	'Import the skills module from @/modules/skills. Export the symbol from its index.ts if another module needs it.';
const ISOLATION_SUGGESTION =
	'Keep the skills module free of other cli code: ask the agents module through SkillUsageProxy, or move the shared code to a package.';

function isTestFile(rootDir: string, filePath: string): boolean {
	return (
		isWithin(path.join(rootDir, CLI_PATH, 'test'), filePath) ||
		filePath.split(path.sep).includes('__tests__')
	);
}

/**
 * Resolves each import to a file, so a relative import such as `../skills/services/…` cannot get
 * past the string patterns of the lint configs.
 */
export class SkillsModuleBoundaryRule extends BaseRule<CodeHealthContext> {
	readonly id = 'skills-module-boundary';
	readonly name = 'Skills Module Boundary';
	readonly description =
		'Code outside the skills module imports only its public API. The skills module imports only an allowlist from the rest of cli.';
	readonly severity = 'error' as const;

	analyze({ rootDir }: CodeHealthContext): Violation[] {
		const cliPath = path.join(rootDir, CLI_PATH);
		const { files, options } = loadCliFiles(rootDir, [
			`${cliPath}/src/**/*.ts`,
			`${cliPath}/test/**/*.ts`,
		]);
		const skillsPath = path.join(rootDir, MODULES_PATH, 'skills');

		return files.flatMap((file) => {
			const filePath = file.getFilePath();
			const isTest = isTestFile(rootDir, filePath);
			const fromSkills = isWithin(skillsPath, filePath);
			// Tests inside the module may reach any of its files and any cli helper.
			if (fromSkills && isTest) return [];

			return importReferences(file).flatMap((reference) => {
				const target = resolveLocalImport(rootDir, filePath, reference.specifier, options);
				if (!target) return [];
				const message = fromSkills
					? this.isolationError(cliPath, skillsPath, target, reference.specifier)
					: this.entryError(skillsPath, target, reference.specifier, isTest);
				if (!message) return [];
				return [
					this.createViolation(
						filePath,
						reference.line,
						1,
						message,
						fromSkills ? ISOLATION_SUGGESTION : ENTRY_SUGGESTION,
					),
				];
			});
		});
	}

	private entryError(
		skillsPath: string,
		target: string,
		specifier: string,
		isTest: boolean,
	): string | undefined {
		if (!isWithin(skillsPath, target)) return undefined;
		const entryPoint = entryPointOf(skillsPath, target);
		if ((isTest ? TEST_ENTRY_POINTS : PUBLIC_ENTRY_POINTS).has(entryPoint)) return undefined;
		return isTest
			? `Import the skills module from @/modules/skills, or its test fixtures from @/modules/skills/testing: "${specifier}".`
			: `Import the skills module from @/modules/skills, its public API: "${specifier}".`;
	}

	private isolationError(
		cliPath: string,
		skillsPath: string,
		target: string,
		specifier: string,
	): string | undefined {
		if (isWithin(skillsPath, target) || !isWithin(cliPath, target)) return undefined;
		if (CLI_ALLOWLIST.has(entryPointOf(path.join(cliPath, 'src'), target))) return undefined;
		return `The skills module imports nothing from the rest of cli except its allowlist: "${specifier}".`;
	}
}
