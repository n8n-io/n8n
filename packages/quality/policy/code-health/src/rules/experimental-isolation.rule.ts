import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import fg from 'fast-glob';
import { Project } from 'ts-morph';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import { importReferences, isWithin } from '../utils/cli-imports.js';
import { parsePackageJson } from '../utils/package-json-scanner.js';

const EXPERIMENTAL_DIR = 'scripts/experimental';

/** Keeps the experimental directory removable: code outside it must not import it. */
export class ExperimentalIsolationRule extends BaseRule<CodeHealthContext> {
	readonly id = 'experimental-isolation';
	readonly name = 'Experimental Isolation';
	readonly description = `Code outside ${EXPERIMENTAL_DIR} must not import it.`;
	readonly severity = 'error' as const;

	analyze({ rootDir }: CodeHealthContext): Violation[] {
		const experimentalDir = path.join(rootDir, EXPERIMENTAL_DIR);
		const packageNames = fg
			.sync('*/package.json', { cwd: experimentalDir, absolute: true })
			.map((file) => parsePackageJson(file).packageName);
		const project = new Project({
			skipAddingFilesFromTsConfig: true,
			skipFileDependencyResolution: true,
		});

		// A relative path into the directory from outside it always names its last segment.
		const terms = ['experimental', ...packageNames];
		return candidateFiles(rootDir, terms).flatMap((filePath) =>
			importReferences(project.addSourceFileAtPath(filePath)).flatMap(({ specifier, line }) => {
				const reachesIn = specifier.startsWith('.')
					? isWithin(experimentalDir, path.resolve(path.dirname(filePath), specifier))
					: packageNames.some((name) => specifier === name || specifier.startsWith(`${name}/`));
				if (!reachesIn) return [];
				return [
					this.createViolation(
						filePath,
						line,
						1,
						`Imports experimental code: "${specifier}".`,
						'Experimental code must stay removable. Move the code out of the experimental directory first.',
					),
				];
			}),
		);
	}
}

/** Source files outside the experimental directory, tracked or untracked, that contain a term. */
function candidateFiles(rootDir: string, terms: string[]): string[] {
	const args = ['grep', '-l', '-I', '--untracked', '-F', ...terms.flatMap((term) => ['-e', term])];
	args.push('--', '*.[cm][jt]s', '*.[jt]s', '*.[jt]sx', `:(exclude)${EXPERIMENTAL_DIR}`);
	const result = spawnSync('git', args, {
		cwd: rootDir,
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	// git grep exits with 1 when nothing matches.
	if (result.status !== 0 && result.status !== 1) {
		throw new Error(`git grep failed: ${result.stderr || result.error?.message}`);
	}
	return result.stdout
		.split('\n')
		.filter((line) => line.length > 0)
		.map((file) => path.join(rootDir, file));
}
