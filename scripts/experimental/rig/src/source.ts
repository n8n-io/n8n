import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expandHome } from './config/paths';
import { RigError } from './errors';

const MONOREPO_NAME = 'n8n-monorepo';

/** The directory the user ran `rig` from. `pnpm rig` changes the directory, so read `INIT_CWD`. */
export function userCwd(): string {
	return process.env.INIT_CWD ?? process.cwd();
}

function isMonorepoRoot(dir: string): boolean {
	const file = join(dir, 'package.json');
	if (!existsSync(file)) return false;
	try {
		const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
		return (
			typeof parsed === 'object' &&
			parsed !== null &&
			'name' in parsed &&
			parsed.name === MONOREPO_NAME
		);
	} catch {
		return false;
	}
}

export function findMonorepoRoot(start = userCwd()): string | undefined {
	let dir = resolve(start);
	while (true) {
		if (isMonorepoRoot(dir)) return dir;
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
}

/** Where the n8n checkout of an environment comes from. */
export type SourceOrigin = 'env.yaml' | 'current directory' | 'rig checkout';

export interface ResolvedSource {
	root?: string;
	origin?: SourceOrigin;
	/** Why there is no root. */
	problem?: RigError;
}

function checkoutAt(path: string, origin: SourceOrigin, setting: string): ResolvedSource {
	const root = expandHome(path);
	if (isMonorepoRoot(root)) return { root, origin };
	return {
		problem: new RigError(
			`${root} (${setting} in the ${origin}) is not an n8n checkout.`,
			'Point it at the root of an n8n repository or worktree.',
		),
	};
}

/**
 * The n8n checkout that runs the components. `repo:<path>` pins one checkout.
 * `auto` uses the checkout of the current directory, then the checkout that contains rig.
 */
export function resolveSource(source: string): ResolvedSource {
	if (source.startsWith('repo:')) {
		return checkoutAt(source.slice('repo:'.length), 'env.yaml', '`source`');
	}
	const root = findMonorepoRoot();
	if (root) return { root, origin: 'current directory' };
	const own = findMonorepoRoot(dirname(fileURLToPath(import.meta.url)));
	if (own) return { root: own, origin: 'rig checkout' };
	return {
		problem: new RigError(
			'rig needs an n8n checkout as the source.',
			'Run rig inside an n8n repository or worktree, or set `source: repo:<path>` in env.yaml.',
		),
	};
}

export const CLI_DIR = 'packages/cli';
export const JS_RUNNER_DIR = 'packages/@n8n/task-runner';
export const PY_RUNNER_DIR = 'packages/@n8n/task-runner-python';

/** Problems with the build of the source. The first list stops a start. */
export function checkBuild(
	repoRoot: string,
	needs: { jsRunner: boolean; pyRunner: boolean },
): { errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];
	const cliDist = join(repoRoot, CLI_DIR, 'dist');
	if (!existsSync(cliDist)) {
		errors.push(`${CLI_DIR}/dist is missing. Run \`pnpm build\` in ${repoRoot}.`);
	}
	if (needs.jsRunner && !existsSync(join(repoRoot, JS_RUNNER_DIR, 'dist/start.js'))) {
		errors.push(`${JS_RUNNER_DIR}/dist is missing. Run \`pnpm build\` in ${repoRoot}.`);
	}
	if (needs.pyRunner && !existsSync(join(repoRoot, PY_RUNNER_DIR, 'src/main.py'))) {
		errors.push(`${PY_RUNNER_DIR} is missing in ${repoRoot}.`);
	}

	if (errors.length === 0) {
		try {
			const lastCommit = Number(
				execFileSync('git', ['log', '-1', '--format=%ct'], {
					cwd: repoRoot,
					encoding: 'utf8',
				}).trim(),
			);
			const distTime = statSync(join(cliDist, 'commands/start.js')).mtimeMs / 1000;
			if (Number.isFinite(lastCommit) && distTime < lastCommit) {
				warnings.push(
					`${CLI_DIR}/dist is older than the last commit. Run \`pnpm build\` if you changed the code.`,
				);
			}
		} catch {
			// Git is optional for this check.
		}
	}
	return { errors, warnings };
}
